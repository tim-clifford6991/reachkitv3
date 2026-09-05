// src/jobs/site-clock.ts — BUILD §11
//
// ADR-060, verbatim: "Weekly measurement is triggered hourly and gated on
// each site's own local Monday; 'Mon 06:00 UTC' is not the trigger." This
// module is that gate, and the same shape serves `draft/generate`'s
// evening. Nothing here reads UTC to decide anything: every question is
// asked of the site's own zone through `Intl.DateTimeFormat`, which is the
// platform's own IANA database and so needs no dependency and no table of
// offsets to go stale.
//
// A tick lands once an hour, so "due" means "this is the site's due hour,
// on the site's due day" — a window one hour wide in the site's own clock.
// Two ticks inside one such hour cannot happen; a tick missed by the
// platform is a run the site does not get that week, which the engine's
// own `(site_id, week_start)` constraint tolerates.
import { WEEK_START, WEEKLY_DUE_HOUR_LOCAL, DRAFT_DUE_HOUR_LOCAL } from "@/lib/config/constants";

/** A wall-clock reading in one site's zone. */
export interface LocalClock {
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  readonly weekday: number;
  /** 0–23. */
  readonly hour: number;
  /** The local calendar date, `YYYY-MM-DD`. */
  readonly date: string;
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = Object.freeze({
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
});

/** `WEEK_START` is pinned as the word "monday"; this is the same fact as a
 *  weekday number, derived rather than written twice. A pin this module
 *  cannot read is a boot failure, not a silent fallback to Monday. */
function weekdayIndexOf(word: string): number {
  const key = word.slice(0, 1).toUpperCase() + word.slice(1, 3).toLowerCase();
  const index = WEEKDAY_INDEX[key];
  if (index === undefined) {
    throw new Error(`src/jobs/site-clock.ts: "${word}" is not a weekday this module can read.`);
  }
  return index;
}

const WEEK_START_INDEX = weekdayIndexOf(WEEK_START);

/** Reads `instant` in `timeZone`. Throws on an unknown zone rather than
 *  silently falling back to UTC — a site whose zone we cannot read is not a
 *  site we may measure on the wrong day. */
export function localClock(instant: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const at = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekday = WEEKDAY_INDEX[at("weekday")];
  if (weekday === undefined) {
    throw new Error(`src/jobs/site-clock.ts: could not read a weekday in time zone "${timeZone}".`);
  }
  // `hour12: false` renders midnight as "24" in some locales; normalise it.
  const hour = Number(at("hour")) % 24;
  return {
    weekday,
    hour,
    date: `${at("year")}-${at("month")}-${at("day")}`,
  };
}

/** ADR-060's gate: the site's own Monday, at the site's own due hour. */
export function isWeeklyDue(instant: Date, timeZone: string): boolean {
  const local = localClock(instant, timeZone);
  return local.weekday === WEEK_START_INDEX && local.hour === WEEKLY_DUE_HOUR_LOCAL;
}

/** The site-local Monday the instant belongs to, `YYYY-MM-DD` — the
 *  `week_start` half of the engine's `(site_id, week_start)` key. Because
 *  `isWeeklyDue` only admits the site's Monday, this is that Monday's own
 *  date; it is computed rather than assumed so a caller outside the due
 *  hour still gets the week it is in. */
export function weekStartOf(instant: Date, timeZone: string): string {
  const local = localClock(instant, timeZone);
  const daysSinceWeekStart = (local.weekday - WEEK_START_INDEX + 7) % 7;
  if (daysSinceWeekStart === 0) return local.date;
  const back = new Date(instant.getTime() - daysSinceWeekStart * 24 * 60 * 60 * 1000);
  return localClock(back, timeZone).date;
}

/** `draft/generate`'s gate: the site's own evening hour, every day. */
export function isDraftDue(instant: Date, timeZone: string): boolean {
  return localClock(instant, timeZone).hour === DRAFT_DUE_HOUR_LOCAL;
}

/** The site-local calendar date a draft generated now is for. Generation
 *  runs the evening before the publish date, so it is tomorrow's date in
 *  the site's own zone. */
export function nextPublishDate(instant: Date, timeZone: string): string {
  const tomorrow = new Date(instant.getTime() + 24 * 60 * 60 * 1000);
  return localClock(tomorrow, timeZone).date;
}
