import dayjs, { type ConfigType, type Dayjs } from 'dayjs';

export { dayjs, type Dayjs };

export function now(): Dayjs {
  return dayjs();
}

export function nowDate(): Date {
  return now().toDate();
}

export function nowMs(): number {
  return now().valueOf();
}

export function addMilliseconds(value: ConfigType, amount: number): Dayjs {
  return dayjs(value).add(amount, 'millisecond');
}

export function subtractMilliseconds(value: ConfigType, amount: number): Dayjs {
  return dayjs(value).subtract(amount, 'millisecond');
}

export function isBeforeNow(value: ConfigType): boolean {
  return dayjs(value).isBefore(now());
}

export function isSameOrBeforeNow(value: ConfigType): boolean {
  return dayjs(value).valueOf() <= now().valueOf();
}
