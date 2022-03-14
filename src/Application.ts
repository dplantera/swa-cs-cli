import prompts from 'prompts';
import {SwaClient} from "./clients/SwaClient";
import axios from "axios";
import {SwaService} from "./services/SwaService";
import chalk from "chalk";
import fs from "fs";
import {SwaController} from "./controller/SwaController";

type Choice = {
    value: 'stats' | 'data' | 'exit' | 'refresh' | 'token',
    title: string
}

export async function openMenu(): Promise<Choice['value']> {
    const choices: Choice[] = [
        {
            value: "stats",
            title: `show ${chalk.bold("stats")} (last 12 Month)`
        },
        {
            value: "data",
            title: `show ${chalk.bold("all")} data`
        },
        {
            value: "refresh",
            title: `show ${chalk.bold("refreshed")} data`
        },
        {
            value: "exit",
            title: `${chalk.bold("exit")} program`
        }
    ]
    const menu = await prompts([{
        type: 'select',
        name: 'selection',
        message: "Select an option to retrieve or transform cruise data",
        choices
    }]);
    return menu.selection;
}

async function promptCredentials(cache: ReturnType<typeof Cache>) {
    const credentials = await prompts([
        {
            type: 'text',
            message: 'enter username:',
            name: 'username',
            validate: (username) => username?.length > 0
        },
        {
            type: 'password',
            message: 'enter password:',
            name: 'pw',
            validate: (pw) => pw?.length > 0
        },
        {
            type: 'text',
            message: 'enter x_api_key:',
            name: 'apiKey',
            hint: 'optional'
        },
        {
            type: 'toggle',
            message: 'remember login?',
            name: 'remember',
        },
    ])
    if (credentials.remember) {
        cache.set("credentials", JSON.stringify(credentials));
    }
    return {
        username: credentials.username,
        password: credentials.pw,
        apiKey: credentials.apiKey
    }
}

const Cache = () => {
    const cacheName = './cache/remember.json';
    fs.writeFileSync(cacheName, "{}");

    return {
        get(key) {
            const cache = JSON.parse(fs.readFileSync(cacheName).toString());
            console.log({cache})
            return cache[key];
        },
        set(key: string, value: string) {
            const cache = JSON.parse(fs.readFileSync(cacheName).toString());
            cache[key] = value;
            fs.writeFileSync(cacheName, JSON.stringify(cache));
        }
    }

}

export async function start(): Promise<number | string> {
    const cache = Cache();
    const _remembered = cache.get("credentials");
    const credentials = _remembered ? _remembered : await promptCredentials(cache);
    const client = new SwaClient(axios, credentials);
    const service = new SwaService(client);
    const controller = new SwaController(service)

    while (true) {
        process.stdout.write("\x1Bc");

        const selection = await openMenu();
        try {
            switch (selection) {
                case "refresh":
                    const refreshed = await controller.getRefreshed()
                    console.log({refreshed});
                    break;
                case "stats":
                    const stats = await controller.getStats();
                    console.log({stats});
                    break
                case "data":
                    const allData = await controller.getData();
                    console.log({allData});
                    break;
                case "exit":
                    return 0;
            }
        } catch (error) {
            console.error(error);
        }

        const exit = await prompts({type: 'confirm', name: 'answer', message: 'exit?',});
        if (exit.answer) {
            return 0;
        }
    }
}