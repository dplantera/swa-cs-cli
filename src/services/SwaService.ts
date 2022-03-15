import { SwaClient } from '../clients/SwaClient';
import fs from 'fs';
import chalk from 'chalk';
import { Dates, Duration } from '../utils/dates';
import { Booking, Credentials, TimeRange } from '../clients/SwaClient.types';

type Totals = {
  distanceInMeter: number;
  distanceInKM: number;
  cruse: number;
  firstDate: string;
  lastDate: string;
  hours: number;
  totalDuration: Duration;
};

type DateFormat = `${string}-${string}-${string}`;
export type DateRange = {
  start: DateFormat;
  end: DateFormat;
};

export class SwaService {
  constructor(private readonly swaClient: SwaClient) {}

  public login(auth: Credentials) {
    this.swaClient.credentials = auth;
  }

  public async getRefreshedData(range: DateRange) {
    return await this.getDataFromCache({ forceRefresh: true, dateRange: range });
  }

  public async getDataFromCache(
    { forceRefresh, dateRange }: { forceRefresh?: boolean; dateRange?: DateRange } = {
      forceRefresh: false,
    }
  ): Promise<Booking[]> {
    const maxRange = SwaClient.getRangeMax();
    const rangeTarget: TimeRange = {
      start: new Date(dateRange?.start ?? maxRange.start),
      end: new Date(dateRange?.end ?? maxRange.end),
    };
    const nameCacheMax = `./cache/data_${Dates.toIsoDateString(maxRange.start)}_${Dates.toIsoDateString(
      maxRange.end
    )}.json`;
    const nameCacheTarget = `./cache/data_${Dates.toIsoDateString(rangeTarget.start)}_${Dates.toIsoDateString(
      rangeTarget.end
    )}.json`;
    const cachedDataInRange = doGetFromCache(rangeTarget, nameCacheMax, nameCacheTarget, forceRefresh);
    if (cachedDataInRange.length > 0) {
      return cachedDataInRange;
    }

    const data = await this.swaClient.getData({ range: rangeTarget });
    fs.writeFileSync(nameCacheTarget, JSON.stringify(data));
    return data;
  }

  public async getTotals(range: DateRange): Promise<Totals> {
    let minDate = Date.now();
    let maxDate = 0;

    const data = await this.getDataFromCache({ dateRange: range });
    const total = data.reduce(
      (prev, cur) => {
        if (cur.cancelled) {
          console.log(`${chalk.yellow.bold('[Canceled Cruise]')} with id: ${chalk.yellow.bold(cur.id)}`);
          return prev;
        }
        prev.cruse += 1;
        prev.distanceInMeter += cur.distance;
        const start = new Date(cur.timeRange.start);
        const end = new Date(cur.timeRange.end);

        minDate = Math.min(minDate, start.getTime());
        maxDate = Math.max(maxDate, start.getTime());
        prev.hours += Dates.duration(start, end).value;

        return prev;
      },
      {
        distanceInMeter: 0,
        distanceInKM: 0,
        cruse: 0,
        firstDate: '',
        lastDate: '',
        hours: 0,
        totalDuration: { value: 0, unit: 'hour' } as Duration,
      }
    );
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
      totalKmPerHour: total.distanceInKM / total.totalDuration.value,
    };
  }

  public getProspectiveCosts(remaining: Remaining) {
    const CarInfo = {
      MID_CLASS: {
        perHour: {
          value: 2.6,
          unit: 'EUR',
        },
        perKm: {
          value: 0.29,
          unit: 'EUR',
        },
      },
    };
    const km = remaining.km * CarInfo.MID_CLASS.perKm.value;
    const hours = remaining.hours * CarInfo.MID_CLASS.perHour.value;

    return {
      costUnit: CarInfo.MID_CLASS.perKm.unit,
      totalCostsByRemainingKm: km,
      totalCostsByRemainingHours: hours,
      totalMax: km + hours,
      totalMin:
        remaining.hours * remaining.totalKmPerHour * (CarInfo.MID_CLASS.perKm.value + CarInfo.MID_CLASS.perHour.value),
    };
  }
}

function doGetFromCache(rangeTarget: TimeRange, nameCacheMax: string, nameCacheTarget: string, forceRefresh?: boolean) {
  if (forceRefresh || !(fs.existsSync(nameCacheMax) || fs.existsSync(nameCacheTarget))) {
    return [];
  }
  console.log(`reading cache: ${nameCacheMax}`);
  const file = fs.existsSync(nameCacheTarget) ? fs.readFileSync(nameCacheTarget) : fs.readFileSync(nameCacheMax);
  const cacheData: Booking[] = JSON.parse(file.toString());
  const toTimeRange = (range) => ({
    start: new Date(range?.start),
    end: new Date(range?.end),
  });
  return cacheData.filter((cruse) => {
    const rangeCache = toTimeRange(cruse.timeRange);
    return +rangeCache.start >= +rangeTarget.start && +rangeCache.end <= +rangeTarget.end;
  });
}

type Remaining = {
  km: number;
  hours: number;
  totalKmPerHour: number;
};
