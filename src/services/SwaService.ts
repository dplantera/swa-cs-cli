import {Cruse, SwaClient} from "../clients/SwaClient";
import fs from "fs";
import chalk from "chalk";
import ProgressBar from 'progress'
import {Dates, Duration} from "../utils/dates";


type Totals = {
    distanceInMeter: number, distanceInKM: number, cruse: number, firstDate: string, lastDate: string, hours: number, totalDuration: Duration
}

export class SwaService {
    constructor(private readonly swaClient: SwaClient) {
    }

    public async getRefreshedData() {
        return await this.getDataFromCache({forceRefresh: true})
    }

    public async getDataFromCache({forceRefresh}: { forceRefresh: boolean } = {forceRefresh: false}): Promise<Cruse[]> {
        const nameCache = `./cache/data_${new Date().toISOString().replaceAll(/T.*/gm, "")}.json`

        if (!forceRefresh && fs.existsSync(nameCache)) {
            console.log(`reading cache: ${nameCache}`)
            const file = fs.readFileSync(nameCache);
            return await Promise.resolve(JSON.parse(file.toString()));
        }
        const bar = new ProgressBar(':bar', {total: 20});
        const timer = setInterval(function () {
            bar.tick();
            if (bar.complete) {
                console.log('\ncomplete\n');
                clearInterval(timer);
            }
        }, 250);
        const data = await this.swaClient.getData();
        fs.writeFileSync(nameCache, JSON.stringify(data));
        return data;
    }

    public async getTotalLastYear(): Promise<Totals> {
        let minDate = Date.now();
        let maxDate = 0;

        const data = await this.getDataFromCache();
        const total = data.reduce((prev, cur) => {
            if (cur.cancelled) {
                console.log(`${chalk.yellow.bold("[Canceled Cruise]")} with id: ${chalk.yellow.bold(cur.id)}`);
                return prev;
            }
            prev.cruse += 1;
            prev.distanceInMeter += cur.distance;
            const start = new Date(cur.timeRange.start);
            const end = new Date(cur.timeRange.end);

            minDate = Math.min(minDate, start.getTime());
            maxDate = Math.max(maxDate, start.getTime())
            prev.hours += Dates.duration(start, end).value;

            return prev;
        }, {distanceInMeter: 0, distanceInKM: 0, cruse: 0, firstDate: "", lastDate: "", hours: 0, totalDuration: {value:0, unit:'hour'} as Duration})
        total.distanceInKM = total.distanceInMeter / 1000;
        total.firstDate = new Date(minDate).toISOString();
        total.lastDate = new Date(maxDate).toISOString();
        total.totalDuration = Dates.duration(new Date(total.firstDate), new Date(total.lastDate));
        return total;
    }

    public getRemaining(total: Totals) {
        return {
            km: 3600 - total.distanceInKM,
            hours: 360 - total.hours,
            totalKmPerHour: (total.distanceInKM / total.totalDuration.value),
        };
    }

    public getProspectiveCosts(remaining: Remaining) {
        const CarInfo = {
            MID_CLASS: {
                perHour: {
                    value: 2.6,
                    unit: 'EUR'
                },
                perKm: {
                    value: 0.29,
                    unit: 'EUR'
                }
            }
        }
        const km = remaining.km * CarInfo.MID_CLASS.perKm.value;
        const hours = remaining.hours * CarInfo.MID_CLASS.perHour.value;

        return {
            costUnit: CarInfo.MID_CLASS.perKm.unit,
            totalCostsByRemainingKm: km,
            totalCostsByRemainingHours: hours,
            totalMax: km + hours,
            totalMin: remaining.hours * remaining.totalKmPerHour * (CarInfo.MID_CLASS.perKm.value + CarInfo.MID_CLASS.perHour.value)
        }
    }
}

type Remaining = {
    km: number,
    hours: number,
    totalKmPerHour: number
}