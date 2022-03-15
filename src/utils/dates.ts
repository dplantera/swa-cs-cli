export type Duration = { value: number; unit: 'hour' | 'ms' };
export const Dates = {
  duration(t1: Date, t2: Date, unit: Duration['unit'] = 'hour'): Duration {
    const ms = Math.abs(+t1 - +t2);
    switch (unit) {
      case 'hour':
        return {
          value: ms / 36e5,
          unit: 'hour',
        };
      case 'ms':
        return { value: ms, unit: 'ms' };
    }
  },
  toIsoDateString(date: Date) {
    return date.toISOString().replaceAll(/T.*/gm, '');
  },
};
