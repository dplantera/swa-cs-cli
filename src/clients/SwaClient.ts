import {AxiosInstance, AxiosRequestConfig} from "axios";

export type Credentials = { username: string, password: string, apiKey: string }
export type TimeRange = { start: Date, end: Date };

export class SwaClient {
    public static readonly PROVIDER_ID = "87";
    public static readonly X_API_KEY = "a291a1e3-3d98-f46c-0e8f-9ddbc7604cc2";

    private _token: { id: string, customerId: string, timeout: Date, expiry: Date }

    constructor(private readonly httpClient: AxiosInstance, private readonly auth: Credentials) {
    }

    public async getData(params?: { range?: TimeRange }) {
        const token = await this.getToken(this.auth);
        const _range = this.getRangeOrDefault(params?.range);

        console.debug(`getting data in range: ${JSON.stringify(_range)}`)
        const response = await this.httpClient.get(
            "https://de1.cantamen.de/casirest/v3/bookings?" +
            "expand=bookeeId" +
            "&expand=customerId" +
            "&expand=price.bookeeId" +
            "&expand=addProp.addPropType" +
            "&expand=entrance" +
            "&changeable=false" +
            "&withSubCustomers=false" +
            "&bookingType=NORMAL" +
            "&bookingType=INSTANT_ACCESS" +
            `&start=${_range.start}` +
            `&end=${_range.end}` +
            "&sort=timeRange.start,timeRange.end,id", {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json, text/plain, */*",
                },
                auth: {
                    username: token.id,
                    password: token.customerId
                }

            });

        return response.data;
    }

    private async login(credentials: Credentials) {
        const response = await this.httpClient.post(
            "https://de1.cantamen.de/casirest/v3/tokens?expand=customerId", {
                "login": credentials.username,
                "credential": credentials.password,
                "provId": SwaClient.PROVIDER_ID,
                "storeLogin": false
            },
            {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Encoding": "gzip, deflate, br",
                    "X-API-Key": this.auth.apiKey || SwaClient.X_API_KEY
                },

            } as AxiosRequestConfig);
        return response.data;
    }


    private async getToken(credentials: Credentials) {
        const isExpired = (date: Date) => date.getTime() <= Date.now();
        if (!this._token || isExpired(this._token.expiry)) {
            console.debug(`getting token...`)
            const token = await this.login(credentials);
            this._token = {
                id: token.id,
                customerId: token.customerId,
                expiry: new Date(token.expiry),
                timeout: new Date(token.timeout)
            }
        }

        console.debug(`token: ${JSON.stringify(this._token)}`)
        return this._token;
    }

    private getRangeOrDefault(range?: TimeRange) {
        const now = new Date();
        const twelveMonthAgo = new Date(now);
        twelveMonthAgo.setMonth((now.getMonth() - 12));
        return range ? range : {start: twelveMonthAgo.toISOString(), end: now.toISOString()}
    }
}

type TimeRangeString = {
    "start": string,
    "end": string
}

export type Cruse = {
    "id": string,
    "provId": string,
    "timeRange": TimeRangeString,
    "bookeeId": string,
    "customerId": string,
    "bookingTypes": [],
    "price": {
        "priceItems": [],
        "bookingId": string,
        "timeRange": TimeRangeString,
        "id": string
    },
    "addProps": [],
    "changeable": boolean,
    "cancelled": boolean,
    "billingState": "DELIVERED" | "NOT_DELIVERED",
    "distance": number,
    "entrances": [],
    "rideShareAllowed": boolean
}