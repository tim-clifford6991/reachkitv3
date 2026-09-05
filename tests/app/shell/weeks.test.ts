// tests/app/shell/weeks.test.ts — BUILD §4.4, REQ-040 criteria 6 and 7
//
// WO-154 `## Test plan`, rows 3 and 4. The criteria, verbatim:
//
//   6. "…how many weeks of measurement the site has, counted from the first
//      weekly measurement of that domain — and where the customer has
//      changed the domain, the count starts again at the first measurement
//      of the new domain… a week that ran and measured something advances
//      it, a week that produced no measurement at all… does not."
//   7. "Given the domain has no weekly measurement yet… no week count is
//      stated and in its place the domain block carries one written line
//      saying this domain has not been measured yet and naming the date its
//      first measurement is due."
import { describe, expect, it } from "vitest";
import { weeksMeasured, type MeasuredWeek } from "@/app/(account)/app/_shell/weeks";

const MONDAY = (day: number): Date => new Date(Date.UTC(2026, 8, day, 6, 0, 0));
const FIRST_DUE = MONDAY(7);

function count(domain: string, weeks: readonly MeasuredWeek[]) {
  return weeksMeasured({ domain, weeks, firstDueOn: FIRST_DUE });
}

describe("REQ-040 c6 — the count is distinct measured weeks for the current domain", () => {
  it("three measured weeks count as three, and the last one dates the line", () => {
    const result = count("example.com", [
      { domain: "example.com", weekStart: MONDAY(7), measured: true },
      { domain: "example.com", weekStart: MONDAY(14), measured: true },
      { domain: "example.com", weekStart: MONDAY(21), measured: true },
    ]);
    expect(result).toEqual({ kind: "counted", weeks: 3, lastMeasuredOn: MONDAY(21) });
  });

  it("two rows for the same week start are one week, not two", () => {
    const result = count("example.com", [
      { domain: "example.com", weekStart: MONDAY(7), measured: true },
      { domain: "example.com", weekStart: MONDAY(7), measured: true },
    ]);
    expect(result).toEqual({ kind: "counted", weeks: 1, lastMeasuredOn: MONDAY(7) });
  });

  it("a week with no measurement does not advance the count", () => {
    const result = count("example.com", [
      { domain: "example.com", weekStart: MONDAY(7), measured: true },
      { domain: "example.com", weekStart: MONDAY(14), measured: false },
      { domain: "example.com", weekStart: MONDAY(21), measured: true },
    ]);
    // Three weeks elapsed, two measured. The number the shell states is 2 —
    // "never larger than the number of weeks in which the site was measured".
    expect(result).toEqual({ kind: "counted", weeks: 2, lastMeasuredOn: MONDAY(21) });
  });

  it("mutation: counting elapsed weeks instead of measured ones overstates", () => {
    const weeks: MeasuredWeek[] = [
      { domain: "example.com", weekStart: MONDAY(7), measured: true },
      { domain: "example.com", weekStart: MONDAY(14), measured: false },
    ];
    const elapsed = new Set(weeks.map((w) => w.weekStart.getTime())).size;
    const measured = count("example.com", weeks);
    expect(measured.kind).toBe("counted");
    if (measured.kind !== "counted") return;
    expect(measured.weeks).toBeLessThan(elapsed);
  });

  it("a partially measured week does advance it — it produced something", () => {
    // REQ-065 c4's partial week: the pass ran and measured something, so it
    // is a measured week. Only "has not been measured" (c3) does not count.
    const result = count("example.com", [
      { domain: "example.com", weekStart: MONDAY(7), measured: true },
    ]);
    expect(result).toEqual({ kind: "counted", weeks: 1, lastMeasuredOn: MONDAY(7) });
  });

  it("a domain change restarts the count at the first measurement of the new domain", () => {
    const weeks: MeasuredWeek[] = [
      { domain: "old-domain.com", weekStart: MONDAY(7), measured: true },
      { domain: "old-domain.com", weekStart: MONDAY(14), measured: true },
      { domain: "new-domain.com", weekStart: MONDAY(21), measured: true },
    ];
    expect(count("new-domain.com", weeks)).toEqual({
      kind: "counted",
      weeks: 1,
      lastMeasuredOn: MONDAY(21),
    });
    // No reset step ran: the same rows, read for the old domain, still count
    // two. The count is computed, never stored.
    expect(count("old-domain.com", weeks)).toEqual({
      kind: "counted",
      weeks: 2,
      lastMeasuredOn: MONDAY(14),
    });
  });
});

describe("REQ-040 c7 — zero measured weeks states no number and names the due date", () => {
  it("no rows at all returns kind 'none' carrying firstDueOn", () => {
    expect(count("example.com", [])).toEqual({ kind: "none", firstDueOn: FIRST_DUE });
  });

  it("rows that all failed to measure return kind 'none', not a count of zero", () => {
    const result = count("example.com", [
      { domain: "example.com", weekStart: MONDAY(7), measured: false },
      { domain: "example.com", weekStart: MONDAY(14), measured: false },
    ]);
    expect(result).toEqual({ kind: "none", firstDueOn: FIRST_DUE });
    expect(result).not.toHaveProperty("weeks");
  });

  it("a domain changed before its first measurement returns kind 'none'", () => {
    const result = count("new-domain.com", [
      { domain: "old-domain.com", weekStart: MONDAY(7), measured: true },
    ]);
    expect(result).toEqual({ kind: "none", firstDueOn: FIRST_DUE });
  });

  it("firstDueOn is the caller's, so the shell and Overview cannot state two dates", () => {
    // The date is read (§11's own clock, issue #41), never computed here:
    // whatever the caller passes is what comes back, unrounded and unshifted.
    const other = new Date(Date.UTC(2027, 0, 4, 6, 0, 0));
    expect(weeksMeasured({ domain: "example.com", weeks: [], firstDueOn: other })).toEqual({
      kind: "none",
      firstDueOn: other,
    });
  });
});
