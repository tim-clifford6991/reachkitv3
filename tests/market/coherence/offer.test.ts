// tests/market/coherence/offer.test.ts — BUILD §6.7
//
// What the report's face shows, and whether the correction control is
// drawn — decided from one stored report and a supplied clock, with a
// fixed `now` in every test and no ambient date anywhere.
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  categoryOnReport,
  correctionOffer,
  type ReportFacts,
} from "../../../src/lib/market/coherence/offer.ts";
import type { CorrectionState } from "../../../src/lib/market/coherence/state.ts";
import { CORRECTION } from "../../../src/lib/config/constants.ts";

const SOURCE_PATH = path.resolve(import.meta.dirname, "../../../src/lib/market/coherence/offer.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = new Date("2026-09-05T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

const ALL_STATES: readonly CorrectionState[] = [
  "none",
  "running",
  "failed_once",
  "running_retry",
  "used",
  "exhausted",
];

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

function facts(over: Partial<ReportFacts> = {}): ReportFacts {
  return {
    scanId: "scan-1",
    measuredAt: daysAgo(1),
    category: "user onboarding software",
    correctionState: "none",
    domainRemoved: false,
    ...over,
  };
}

describe("REQ-094 c1 — the category is on the face of a report of any age; only the control expires", () => {
  it("category/shown-at-every-age", () => {
    for (const age of [0, 1, CORRECTION.offerMaxAgeDays, 400]) {
      expect(categoryOnReport(facts({ measuredAt: daysAgo(age) }))).toEqual({
        shown: true,
        category: "user onboarding software",
      });
    }
  });

  it("category/null-is-not-reached-never-guessed", () => {
    const shown = categoryOnReport(facts({ category: null }));
    expect(shown).toEqual({ shown: false, reason: "not_reached" });
    expect(JSON.stringify(shown)).not.toMatch(/category/);
  });

  it("offer/still-offered-when-category-not-reached — correcting supplies what the scan never reached", () => {
    expect(correctionOffer({ report: facts({ category: null }), now: NOW })).toEqual({
      offered: true,
      as: "first",
    });
  });

  it("offer/expires-at-seven-days — offered below the pin, refused at it and above", () => {
    expect(correctionOffer({ report: facts({ measuredAt: daysAgo(CORRECTION.offerMaxAgeDays - 1) }), now: NOW })).toEqual({
      offered: true,
      as: "first",
    });
    for (const age of [CORRECTION.offerMaxAgeDays, CORRECTION.offerMaxAgeDays + 1, 400]) {
      expect(correctionOffer({ report: facts({ measuredAt: daysAgo(age) }), now: NOW })).toEqual({
        offered: false,
        because: "report_too_old",
      });
    }
  });

  it("offer/age-is-whole-days — a report a few hours short of the pin is still offered", () => {
    const hoursShort = new Date(NOW.getTime() - (CORRECTION.offerMaxAgeDays * DAY_MS - 3 * 60 * 60 * 1000));
    expect(correctionOffer({ report: facts({ measuredAt: hoursShort }), now: NOW })).toEqual({
      offered: true,
      as: "first",
    });
  });

  it("the age bound is read from the pin — the literal 7 does not appear in this file", () => {
    const body = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(body).not.toMatch(/\b7\b/);
    expect(body).toMatch(/CORRECTION\.offerMaxAgeDays/);
  });
});

describe("REQ-094 c5 — a correction already under way and one already used are different reasons", () => {
  it("offer/used-and-in-progress-are-different-reasons", () => {
    expect(correctionOffer({ report: facts({ correctionState: "used" }), now: NOW })).toEqual({
      offered: false,
      because: "used",
    });
    for (const state of ["running", "running_retry"] as const) {
      expect(correctionOffer({ report: facts({ correctionState: state }), now: NOW })).toEqual({
        offered: false,
        because: "in_progress",
      });
    }
  });

  it("offer/running-retry-is-in-progress-not-exhausted — a retry in flight has not been spent", () => {
    expect(correctionOffer({ report: facts({ correctionState: "running_retry" }), now: NOW })).not.toEqual({
      offered: false,
      because: "exhausted",
    });
  });

  it("offer/in-progress-outranks-report-too-old — a running correction on an old report is still in progress", () => {
    expect(
      correctionOffer({ report: facts({ correctionState: "running", measuredAt: daysAgo(30) }), now: NOW })
    ).toEqual({ offered: false, because: "in_progress" });
  });

  it("offer/used-outranks-report-too-old — the reader is told the most specific true reason", () => {
    expect(
      correctionOffer({ report: facts({ correctionState: "used", measuredAt: daysAgo(30) }), now: NOW })
    ).toEqual({ offered: false, because: "used" });
  });

  it("offer/domain-removed-outranks-everything", () => {
    expect(
      correctionOffer({
        report: facts({ domainRemoved: true, correctionState: "none", measuredAt: daysAgo(30) }),
        now: NOW,
      })
    ).toEqual({ offered: false, because: "domain_removed" });
  });
});

describe("REQ-094 c7 — a correction that produced no report offers one retry, and then the report stands", () => {
  it("offer/failed-once-offers-a-retry", () => {
    expect(correctionOffer({ report: facts({ correctionState: "failed_once" }), now: NOW })).toEqual({
      offered: true,
      as: "retry",
    });
  });

  it("offer/exhausted-offers-nothing", () => {
    expect(correctionOffer({ report: facts({ correctionState: "exhausted" }), now: NOW })).toEqual({
      offered: false,
      because: "exhausted",
    });
  });
});

describe("REQ-094 c6 — the offer is per report and holds no state across calls", () => {
  it("offer/is-per-report", () => {
    const spent = facts({ scanId: "old", correctionState: "exhausted" });
    const fresh = facts({ scanId: "new", correctionState: "none" });
    expect(correctionOffer({ report: spent, now: NOW })).toEqual({ offered: false, because: "exhausted" });
    expect(correctionOffer({ report: fresh, now: NOW })).toEqual({ offered: true, as: "first" });
    expect(correctionOffer({ report: spent, now: NOW })).toEqual({ offered: false, because: "exhausted" });
  });

  it("offer/covers-every-correction-state — all six return a value of the union at a fixed age", () => {
    for (const state of ALL_STATES) {
      const offer = correctionOffer({ report: facts({ correctionState: state }), now: NOW });
      if (offer.offered) expect(["first", "retry"]).toContain(offer.as);
      else expect(["used", "exhausted", "in_progress", "report_too_old", "domain_removed"]).toContain(offer.because);
    }
  });
});

describe("Purity — the offer never reads the pipeline and never reads a clock of its own", () => {
  it("offer/never-reads-the-pipeline", () => {
    for (const forbidden of [
      /from\s+["'][^"']*lib\/scan/,
      /from\s+["'][^"']*lib\/db/,
      /from\s+["'][^"']*lib\/costs/,
      /from\s+["'][^"']*lib\/vendors/,
      /from\s+["'][^"']*lib\/llm/,
    ]) {
      expect(SOURCE).not.toMatch(forbidden);
    }
    expect(SOURCE).not.toMatch(/Date\.now\(\)/);
    expect(SOURCE).not.toMatch(/new Date\(/);
  });

  it("offer/never-reads-the-pipeline — a fixed now produces a fixed result", () => {
    const report = facts({ measuredAt: daysAgo(2) });
    const first = correctionOffer({ report, now: NOW });
    for (let i = 0; i < 20; i += 1) expect(correctionOffer({ report, now: NOW })).toEqual(first);
  });

  it("categoryOnReport and correctionOffer share no branch — a null category does not change the offer", () => {
    for (const state of ALL_STATES) {
      expect(correctionOffer({ report: facts({ correctionState: state, category: null }), now: NOW })).toEqual(
        correctionOffer({ report: facts({ correctionState: state, category: "a category" }), now: NOW })
      );
    }
  });
});

describe("Observability — the offer outcome, never the category or the scan id", () => {
  it("offer/logs-the-outcome-only", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    correctionOffer({ report: facts({ category: "a very specific category", scanId: "scan-secret" }), now: NOW });
    const line = spy.mock.calls.at(-1)?.[0] as string;
    expect(JSON.parse(line)).toEqual({ event: "correction_offer", offered: true, as: "first" });
    expect(line).not.toContain("a very specific category");
    expect(line).not.toContain("scan-secret");
  });
});
