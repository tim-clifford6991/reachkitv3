// BUILD §4.2 — hours and days as milliseconds, once.
//
// Unit conversions, not tunables: nothing here is a decision anyone could
// take differently, and none of it belongs in `src/lib/config/constants.ts`
// beside the numbers that are decisions. Every cadence, deadline and retry
// interval this feature uses comes from a pin there and is turned into a
// `Date` through one of these two functions, so no module in the feature
// carries an arithmetic literal of its own.
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

export function hoursAfter(at: Date, hours: number): Date {
  return new Date(at.getTime() + hours * MS_PER_HOUR);
}

export function daysAfter(at: Date, days: number): Date {
  return hoursAfter(at, days * HOURS_PER_DAY);
}

export function minutesAfter(at: Date, minutes: number): Date {
  return new Date(at.getTime() + (minutes * MS_PER_HOUR) / 60);
}
