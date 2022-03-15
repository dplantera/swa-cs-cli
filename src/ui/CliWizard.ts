import chalk from 'chalk';
import prompts, { Choice, PromptObject } from 'prompts';
import { Environment } from '../Environment';
import { SwaClient } from '../clients/SwaClient';
import { SwaController } from '../controller/SwaController';
import { DateRange } from '../services/SwaService';
import { ConsoleExt } from '../utils/console';

export class CliWizard {
  constructor(private readonly controller: SwaController) {}

  public async start() {
    this.controller.login(await promptCredentials());
    while (true) {
      try {
        ConsoleExt.clearConsole();

        const main = await openMainMenu();
        if (main) await evaluateInput(main, this.controller);

        const sub = await openSubMenu();
        if (sub.exit) return 0;
      } catch (error) {
        console.error(error);
      }
    }
  }
}

async function evaluateInput(input: Choice['value'], controller: SwaController): Promise<void> {
  const answer = await promptDateRange();
  if (!answer.from || !answer.to) return;

  const range: DateRange = {
    start: answer.from,
    end: answer.to,
  };
  switch (input) {
    case 'refresh':
      const refreshed = await controller.getRefreshed(range);
      console.log({ refreshed });
      break;
    case 'stats':
      const stats = await controller.getStats(range);
      console.log({ stats });
      break;
    case 'data':
      const allData = await controller.getData(range);
      console.log({ allData });
      break;
  }
}

async function openMainMenu() {
  const choices: Choice[] = [
    {
      value: 'stats',
      title: `show ${chalk.bold('stats')}`,
    },
    {
      value: 'data',
      title: `show ${chalk.bold('all')} data`,
    },
    {
      value: 'refresh',
      title: `show ${chalk.bold('refreshed')} data`,
    },
  ];
  const mainMenu: PromptObject = {
    type: 'select',
    name: 'main',
    message: 'Select an option to retrieve or transform cruise data',
    choices,
  };
  const menu = await prompts(mainMenu);
  return menu.main;
}

async function openSubMenu() {
  return await prompts({
    type: 'select',
    message: 'exit?',
    choices: [
      { value: false, title: 'no' },
      { value: true, title: 'yes' },
    ],
    name: 'exit',
  });
}

async function promptDateRange() {
  const maxRange = SwaClient.getRangeMax();
  return await prompts([
    {
      type: 'date',
      message: 'from?',
      name: 'from',
      initial: maxRange.start,
    },
    {
      type: 'date',
      message: 'to?',
      name: 'to',
      initial: maxRange.end,
    },
    {
      type: 'toggle',
      message: 'ignore validation?',
      name: 'validation',
    },
  ]);
}

async function promptCredentials() {
  const credentials = await prompts([
    {
      type: 'text',
      message: 'enter username:',
      name: 'username',
      validate: (username) => username?.length > 0,
      initial: Environment.properties.SWA_USERNAME,
    },
    {
      type: 'password',
      message: 'enter password:',
      name: 'pw',
      validate: (pw) => pw?.length > 0,
      initial: Environment.properties.SWA_PASSWORD,
    },
    {
      type: 'text',
      message: 'enter x_api_key:',
      name: 'apiKey',
      hint: 'optional',
      initial: Environment.properties.SWA_API_KEY,
    },
  ]);
  return {
    username: credentials.username,
    password: credentials.pw,
    apiKey: credentials.apiKey,
  };
}
