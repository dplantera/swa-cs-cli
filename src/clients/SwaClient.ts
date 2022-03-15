import { AxiosInstance, AxiosRequestConfig } from 'axios';
import chalk from 'chalk';
import { ConsoleExt } from '../utils/console';
import { Credentials, TimeRange } from './SwaClient.types';

export class SwaClient {
  public static readonly PROVIDER_ID = '87';
  public static readonly X_API_KEY = 'a291a1e3-3d98-f46c-0e8f-9ddbc7604cc2';

  private _token: {
    id: string;
    customerId: string;
    timeout: Date;
    expiry: Date;
  };

  constructor(private readonly httpClient: AxiosInstance, private auth?: Credentials) {}

  get credentials() {
    if (!this.auth) {
      throw new Error(`${chalk.red.bold('[ILLEGAL STATE]:')} credentials needed { username, password }`);
    }
    return this.auth;
  }

  set credentials(auth: Credentials) {
    this.auth = { ...auth };
  }

  public async getData(params: { range: TimeRange; skipValidation?: boolean }) {
    const token = await this.getToken(this.credentials);
    const { range, skipValidation } = params;

    console.debug(`getting data in range: ${JSON.stringify(range)}`);
    if (!skipValidation) {
      ensureTimeRangeIsValid(range);
    }
    ConsoleExt.showProgress(10);
    const response = await this.httpClient.get(
      'https://de1.cantamen.de/casirest/v3/bookings?' +
        `&end=${range.end.toISOString()}` +
        '&sort=timeRange.start,timeRange.end,id',
      {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
        auth: {
          username: token.id,
          password: token.customerId,
        },
      } as AxiosRequestConfig
    );

    return response.data;
  }

  private async login(credentials: Credentials) {
    const response = await this.httpClient.post(
      'https://de1.cantamen.de/casirest/v3/tokens?expand=customerId',
      {
        login: credentials.username,
        credential: credentials.password,
        provId: SwaClient.PROVIDER_ID,
        storeLogin: false,
      },
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'X-API-Key': this.credentials.apiKey || SwaClient.X_API_KEY,
        },
      } as AxiosRequestConfig
    );
    return response.data;
  }

  public static getRangeMax() {
    const now = new Date(new Date().toDateString());
    const twelveMonthAgo = new Date(now);
    twelveMonthAgo.setMonth(now.getMonth() - 12);
    return { start: twelveMonthAgo, end: now };
  }

  private async getToken(credentials: Credentials) {
    const isExpired = (date: Date) => date.getTime() <= Date.now();
    if (!this._token || isExpired(this._token.expiry)) {
      console.debug(`getting token...`);
      const token = await this.login(credentials);
      this._token = {
        id: token.id,
        customerId: token.customerId,
        expiry: new Date(token.expiry),
        timeout: new Date(token.timeout),
      };
    }

    console.debug(`token: ${JSON.stringify(this._token)}`);
    return this._token;
  }
}

function ensureTimeRangeIsValid(range: TimeRange): void {
  const maxRange = SwaClient.getRangeMax();
  if (+range.start > +maxRange.end || +range.end > +maxRange.end)
    throw Error(chalk.yellow.bold(`[VALIDATiON]: range borders need to be before ${range.end.toISOString()}`));

  if (+range.start < +maxRange.start || +range.end < +maxRange.start)
    throw Error(chalk.yellow.bold(`[VALIDATiON]: range borders need to be after ${range.start.toISOString()}`));
}
