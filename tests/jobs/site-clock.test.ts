// tests/jobs/site-clock.test.ts — BUILD §11
//
// ADR-060, verbatim: "Weekly measurement is triggered hourly and gated on
// each site's own local Monday; 'Mon 06:00 UTC' is not the trigger."
//
// The mutation this file exists to catch is scheduling on a UTC hour: a
// site at UTC−7 is due on *its* Monday 06:00 (13:00 UTC) and is **not** due
// at 06:00 UTC, when its own clock still says Sunday 23:00. A gate written
// against UTC passes the second case and fails here.
import { describe, expect, it } from "vitest";
import { isDraftDue, isWeeklyDue, localClock, nextPublishDate, weekStartOf } from "@/jobs/site-clock";
import { DRAFT_DUE_HOUR_LOCAL, WEEKLY_DUE_HOUR_LOCAL } from "@/lib/config/constants";

// 2026-09-07 is a Monday.
const MONDAY_0600_UTC = new Date("2026-09-07T06:00:00Z");
const LA = "America/Los_Angeles"; // UTC−7 on this date
const BERLIN = "Europe/Berlin"; // UTC+2 on this date

describe("ADR-060 — the gate is the site's own local Monday, never Mon 06:00 UTC", () => {
  it("a UTC site is due at 06:00 UTC on Monday", () => {
    expect(isWeeklyDue(MONDAY_0600_UTC, "UTC")).toBe(true);
  });

  it("a site at UTC−7 is NOT due at 06:00 UTC — its own clock still says Sunday", () => {
    expect(localClock(MONDAY_0600_UTC, LA)).toMatchObject({ weekday: 7, hour: 23 });
    expect(isWeeklyDue(MONDAY_0600_UTC, LA)).toBe(false);
  });

  it("that same site IS due at its own Monday 06:00 local (13:00 UTC)", () => {
    const own = new Date("2026-09-07T13:00:00Z");
    expect(localClock(own, LA)).toMatchObject({ weekday: 1, hour: WEEKLY_DUE_HOUR_LOCAL });
    expect(isWeeklyDue(own, LA)).toBe(true);
  });

  it("a site east of UTC is due before the UTC one, on its own clock", () => {
    const own = new Date("2026-09-07T04:00:00Z"); // 06:00 in Berlin
    expect(isWeeklyDue(own, BERLIN)).toBe(true);
    expect(isWeeklyDue(own, "UTC")).toBe(false);
  });
});

describe("the hourly tick makes each site due exactly once a week", () => {
  it.each([["UTC"], [LA], [BERLIN]])(
    "%s: exactly one of the 168 hourly ticks in a week is due",
    (zone) => {
      const start = Date.UTC(2026, 8, 7, 0, 0, 0);
      let due = 0;
      for (let hour = 0; hour < 168; hour++) {
        if (isWeeklyDue(new Date(start + hour * 3_600_000), zone)) due++;
      }
      expect(due).toBe(1);
    }
  );

  it("the week_start key is stable across every tick inside one site-local week", () => {
    const start = Date.UTC(2026, 8, 7, 7, 0, 0); // the site's own Monday 00:00
    const keys = new Set<string>();
    for (let hour = 0; hour < 24 * 7; hour++) {
      keys.add(weekStartOf(new Date(start + hour * 3_600_000), LA));
    }
    expect([...keys]).toEqual(["2026-09-07"]);
  });

  it("the week_start key is the site's own Monday, not UTC's", () => {
    // 06:00 UTC on Monday is still Sunday in Los Angeles, so the week it
    // belongs to there began on the *previous* Monday.
    expect(weekStartOf(MONDAY_0600_UTC, "UTC")).toBe("2026-09-07");
    expect(weekStartOf(MONDAY_0600_UTC, LA)).toBe("2026-08-31");
  });
});

describe("draft/generate is due at the site's own evening hour, every day", () => {
  it("each site is due once a day, in its own zone", () => {
    const start = Date.UTC(2026, 8, 7, 0, 0, 0);
    for (const zone of ["UTC", LA, BERLIN]) {
      const dueHours = [...Array(24).keys()].filter((h) =>
        isDraftDue(new Date(start + h * 3_600_000), zone)
      );
      expect(dueHours, zone).toHaveLength(1);
    }
  });

  it("two sites in different zones are each triggered in their own evening", () => {
    const berlinEvening = new Date("2026-09-07T16:00:00Z"); // 18:00 Berlin
    const laEvening = new Date("2026-09-08T01:00:00Z"); // 18:00 Los Angeles
    expect(isDraftDue(berlinEvening, BERLIN)).toBe(true);
    expect(isDraftDue(berlinEvening, LA)).toBe(false);
    expect(isDraftDue(laEvening, LA)).toBe(true);
    expect(isDraftDue(laEvening, BERLIN)).toBe(false);
    expect(localClock(laEvening, LA).hour).toBe(DRAFT_DUE_HOUR_LOCAL);
  });

  it("generation runs the evening before the date it publishes for", () => {
    const berlinEvening = new Date("2026-09-07T16:00:00Z");
    expect(localClock(berlinEvening, BERLIN).date).toBe("2026-09-07");
    expect(nextPublishDate(berlinEvening, BERLIN)).toBe("2026-09-08");
  });
});

describe("a zone this module cannot read is a failure, not a fallback to UTC", () => {
  it("throws on an unknown time zone", () => {
    expect(() => localClock(MONDAY_0600_UTC, "Mars/Olympus")).toThrow();
  });
});
