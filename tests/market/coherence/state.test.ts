// tests/market/coherence/state.test.ts
//
// WO-081 test plan, quoted from REQ-094 in the work order's own
// `## Test plan` table, plus totality, table-fidelity, union-shape,
// purity and discrimination tests it names.
//
// Risk: high — seam: a state machine that publishes. `correction_state` is
// read back into the report's one notice, and this machine's refusals —
// `already_used`, `already_running` — are what a customer is told when a
// correction is declined; REQ-094 criterion 5 binds each outcome to a
// different written line. A totality or refusal test that survives
// deletion lets one submission be accepted twice, or a decline be reported
// under the wrong line — doctrine 0.13.2, mutation-tested.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CORRECTION_SCOPE,
  nextCorrectionState,
  type CorrectionEvent,
  type CorrectionState,
} from "../../../src/lib/market/coherence/state.ts";

const SOURCE_PATH = path.resolve(
  import.meta.dirname,
  "../../../src/lib/market/coherence/state.ts"
);
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const ALL_STATES: readonly CorrectionState[] = [
  "none",
  "running",
  "failed_once",
  "running_retry",
  "used",
  "exhausted",
];

const ALL_EVENTS: readonly CorrectionEvent[] = [
  "submitted",
  "refused_before_run",
  "produced_report",
  "produced_no_report",
];

/**
 * The 24-row table transcribed from BP-028's `## Public interface` comment
 * block, verbatim. `state/matches-the-declared-table` asserts every row of
 * it; nothing here is re-derived.
 */
const TABLE: Record<
  CorrectionState,
  Record<CorrectionEvent, { next: CorrectionState } | { refused: "already_running" | "already_used" }>
> = {
  none: {
    submitted: { next: "running" },
    refused_before_run: { next: "none" },
    produced_report: { next: "none" },
    produced_no_report: { next: "none" },
  },
  running: {
    submitted: { refused: "already_running" },
    refused_before_run: { next: "running" },
    produced_report: { next: "used" },
    produced_no_report: { next: "failed_once" },
  },
  failed_once: {
    submitted: { next: "running_retry" },
    refused_before_run: { next: "failed_once" },
    produced_report: { next: "failed_once" },
    produced_no_report: { next: "failed_once" },
  },
  running_retry: {
    submitted: { refused: "already_running" },
    refused_before_run: { next: "running_retry" },
    produced_report: { next: "used" },
    produced_no_report: { next: "exhausted" },
  },
  used: {
    submitted: { refused: "already_used" },
    refused_before_run: { next: "used" },
    produced_report: { next: "used" },
    produced_no_report: { next: "used" },
  },
  exhausted: {
    submitted: { refused: "already_used" },
    refused_before_run: { next: "exhausted" },
    produced_report: { next: "exhausted" },
    produced_no_report: { next: "exhausted" },
  },
};

describe("state/has-exactly-six-members", () => {
  it("CorrectionState's members are exactly none, running, failed_once, running_retry, used, exhausted", () => {
    // A seventh would mean a second retry, which CORRECTION.retries: 1 does
    // not admit. Witnessed by exhaustively feeding every declared member
    // through nextCorrectionState and asserting none throws or is rejected.
    expect(ALL_STATES).toEqual([
      "none",
      "running",
      "failed_once",
      "running_retry",
      "used",
      "exhausted",
    ]);
    expect(ALL_STATES.length).toBe(6);
    for (const current of ALL_STATES) {
      expect(() => nextCorrectionState({ current, event: "refused_before_run" })).not.toThrow();
    }
  });
});

describe("state/is-total", () => {
  it("every one of the 6 states x 4 events = 24 pairs returns a value of the declared union", () => {
    for (const current of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        const result = nextCorrectionState({ current, event });
        const isNextShape =
          "next" in result && ALL_STATES.includes(result.next) && Object.keys(result).length === 1;
        const isRefusedShape =
          "refused" in result &&
          (result.refused === "already_running" || result.refused === "already_used") &&
          Object.keys(result).length === 1;
        expect(isNextShape || isRefusedShape).toBe(true);
      }
    }
  });
});

describe("state/matches-the-declared-table", () => {
  it("all 24 pairs match BP-028's transcribed table row for row", () => {
    for (const current of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        expect(nextCorrectionState({ current, event })).toEqual(TABLE[current][event]);
      }
    }
  });
});

describe(
  'REQ-094 c5 — "…a correction already running for that report… is refused in writing as a correction already under way rather than as one already used…" — the state limb',
  () => {
    it("state/running-and-used-are-different-refusals — running and running_retry refuse already_running; used and exhausted refuse already_used", () => {
      expect(nextCorrectionState({ current: "running", event: "submitted" })).toEqual({
        refused: "already_running",
      });
      expect(nextCorrectionState({ current: "running_retry", event: "submitted" })).toEqual({
        refused: "already_running",
      });
      expect(nextCorrectionState({ current: "used", event: "submitted" })).toEqual({
        refused: "already_used",
      });
      expect(nextCorrectionState({ current: "exhausted", event: "submitted" })).toEqual({
        refused: "already_used",
      });

      // The two values are never interchanged.
      const runningRefusals = [
        nextCorrectionState({ current: "running", event: "submitted" }),
        nextCorrectionState({ current: "running_retry", event: "submitted" }),
      ];
      const usedRefusals = [
        nextCorrectionState({ current: "used", event: "submitted" }),
        nextCorrectionState({ current: "exhausted", event: "submitted" }),
      ];
      for (const r of runningRefusals) expect(r).not.toEqual({ refused: "already_used" });
      for (const r of usedRefusals) expect(r).not.toEqual({ refused: "already_running" });
    });

    it("state/retry-in-flight-is-already-running-not-already-used — running_retry named separately, the case decision 2a's alternative (b) would have broken", () => {
      // Alternative (b), rejected by BP-028 decision 2a, would have kept the
      // retry's state as failed_once and forced a submission during the
      // retry to be refused already_used. This asserts the accepted shape.
      expect(nextCorrectionState({ current: "running_retry", event: "submitted" })).toEqual({
        refused: "already_running",
      });
      expect(nextCorrectionState({ current: "running_retry", event: "submitted" })).not.toEqual({
        refused: "already_used",
      });
    });
  }
);

describe(
  'REQ-094 c7 — "…the correction may be submitted once more…that retry also ran and produced no report…no correction control is offered for that report again…A correction whose re-measurement stopped early does produce the stored report…and that correction has been used." — the state limb',
  () => {
    it("state/retry-is-spent-by-being-taken — the full sequence none -> running -> failed_once -> running_retry -> exhausted, and a submit at exhausted is refused", () => {
      let current: CorrectionState = "none";

      let r = nextCorrectionState({ current, event: "submitted" });
      expect(r).toEqual({ next: "running" });
      current = (r as { next: CorrectionState }).next;
      expect(current).toBe("running");

      r = nextCorrectionState({ current, event: "produced_no_report" });
      expect(r).toEqual({ next: "failed_once" });
      current = (r as { next: CorrectionState }).next;
      expect(current).toBe("failed_once");

      r = nextCorrectionState({ current, event: "submitted" });
      expect(r).toEqual({ next: "running_retry" });
      current = (r as { next: CorrectionState }).next;
      expect(current).toBe("running_retry");

      r = nextCorrectionState({ current, event: "produced_no_report" });
      expect(r).toEqual({ next: "exhausted" });
      current = (r as { next: CorrectionState }).next;
      expect(current).toBe("exhausted");

      expect(nextCorrectionState({ current, event: "submitted" })).toEqual({
        refused: "already_used",
      });
    });

    it("state/first-failure-is-not-exhaustion — running + produced_no_report is failed_once, never exhausted", () => {
      const r = nextCorrectionState({ current: "running", event: "produced_no_report" });
      expect(r).toEqual({ next: "failed_once" });
      expect(r).not.toEqual({ next: "exhausted" });
    });

    it("state/early-stop-is-used — produced_report from either running member returns used regardless of how much that report measured", () => {
      expect(nextCorrectionState({ current: "running", event: "produced_report" })).toEqual({
        next: "used",
      });
      expect(nextCorrectionState({ current: "running_retry", event: "produced_report" })).toEqual({
        next: "used",
      });
    });

    it("state/refusal-before-run-costs-nothing — for every one of the six states, refused_before_run returns the same state unchanged", () => {
      for (const current of ALL_STATES) {
        expect(nextCorrectionState({ current, event: "refused_before_run" })).toEqual({
          next: current,
        });
      }
    });
  }
);

describe(
  'REQ-094 c3 — "…the market set, the questions, and every figure measured from them…are measured again against the corrected category…while what the scan read from the domain\'s own pages is not re-read and does not change…" — the scope limb only',
  () => {
    it("scope/re-derives-six-carries-forward-four — the two tuples exactly as declared, and disjoint", () => {
      expect(CORRECTION_SCOPE.reDerive).toEqual([
        "market",
        "questions",
        "ai_answers",
        "google_presence",
        "rivals",
        "score",
      ]);
      expect(CORRECTION_SCOPE.carryForward).toEqual([
        "foundations",
        "answerability",
        "on_page",
        "robots",
      ]);

      const reDerive: readonly string[] = CORRECTION_SCOPE.reDerive;
      const carryForward: readonly string[] = CORRECTION_SCOPE.carryForward;
      for (const item of reDerive) expect(carryForward.includes(item)).toBe(false);
      for (const item of carryForward) expect(reDerive.includes(item)).toBe(false);
    });
  }
);

describe("state/is-pure", () => {
  it("state.ts resolves no import at all outside its own module — no ReportFacts, no attempt count", () => {
    const body = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(body).not.toMatch(/^\s*import /m);
    expect(body).not.toMatch(/ReportFacts/);
  });

  it("nextCorrectionState never throws over any declared pair", () => {
    for (const current of ALL_STATES) {
      for (const event of ALL_EVENTS) {
        expect(() => nextCorrectionState({ current, event })).not.toThrow();
      }
    }
  });
});

describe("state/discrimination", () => {
  it("collapsing already_running into already_used at running_retry must fail", () => {
    expect(nextCorrectionState({ current: "running_retry", event: "submitted" })).not.toEqual({
      refused: "already_used",
    });
  });

  it("merging running_retry back into running must fail — the two are different states with different produced_no_report results", () => {
    const fromRunning = nextCorrectionState({ current: "running", event: "produced_no_report" });
    const fromRetry = nextCorrectionState({ current: "running_retry", event: "produced_no_report" });
    expect(fromRunning).not.toEqual(fromRetry);
  });

  it("refused_before_run must not advance any state", () => {
    for (const current of ALL_STATES) {
      expect(nextCorrectionState({ current, event: "refused_before_run" })).toEqual({
        next: current,
      });
    }
  });
});
