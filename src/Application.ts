import { SwaClient } from './clients/SwaClient';
import axios from 'axios';
import { SwaService } from './services/SwaService';
import { SwaController } from './controller/SwaController';
import { CliWizard } from './ui/CliWizard';

export async function start(): Promise<number | string> {
  const client = new SwaClient(axios);
  const service = new SwaService(client);
  const controller = new SwaController(service);
  const ui = new CliWizard(controller);
  return await ui.start();
}
