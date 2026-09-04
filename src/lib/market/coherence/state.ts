// src/lib/market/coherence/state.ts — WO-081, BP-028
//
// Six members, not five. `running` and `running_retry` are both *running*
// states and differ only in which attempt is in flight, because
// `(running, produced_no_report)` must yield `failed_once` on a first
// attempt and `exhausted` on the retry — one pair, two results, which a
// total function cannot produce (BP-028 decision 2a). Decision 2 records
// why the attempt count lives in the state rather than in `ReportFacts`:
// an `attempts` field outside the machine lets a caller hand it a stale
// count, and re-entering that shape by a side door is rejected the same
// way alternative (a) was.
//
// This module is pure and resolves no import outside its own declarations
// (BP-028 decision 3: `src/lib/market/` never calls into `src/lib/scan/`).
// It takes no `ReportFacts` and no clock; the machine's only memory is the
// `current` state its caller supplies.
//
// Risk: high — seam: a state machine that publishes. `correction_state` is
// stored on the scan row and read back into the report's one notice, and
// this machine's refusals — `already_used`, `already_running` — are what a
// customer is told when a correction is declined; REQ-094 criterion 5 binds
// each outcome to a different written line. Mutation-tested (doctrine
// 0.13.2, rule 2b).

export type CorrectionState =
  | "none"
  | "running"
  | "failed_once"
  | "running_retry"
  | "used"
  | "exhausted";

export type CorrectionEvent =
  | "submitted"
  | "refused_before_run"
  | "produced_report"
  | "produced_no_report";

/** Narrows an exhausted union to `never`; called only from a branch a
 *  correct caller cannot reach. If a case is ever removed from one of the
 *  switches below, the value reaching this call is no longer narrowed to
 *  `never` and the file fails to compile — BP-028's "a compile error
 *  rather than a fall-through arm", not a runtime default. */
function assertNever(x: never): never {
  throw new Error(`nextCorrectionState: unhandled pair (unreachable) — ${JSON.stringify(x)}`);
}

/**
 * Total over the product of six states and four events — twenty-four
 * pairs, transcribed from BP-028's `## Public interface` table. An
 * unhandled pair is a compile error (`assertNever`), never a
 * fall-through.
 *
 * Observability (BP-028 NFR budget: "each state transition with its
 * event"): this function is pure and 0¢/no-I/O (BP-028's own budget), so
 * the transition itself — `current`, `event` and the returned `next` or
 * `refused` — already carries everything a caller needs to log; nothing
 * is added here that the return shape does not already state.
 */
export function nextCorrectionState(a: {
  current: CorrectionState;
  event: CorrectionEvent;
}): { next: CorrectionState } | { refused: "already_running" | "already_used" } {
  const { current, event } = a;

  switch (event) {
    case "refused_before_run":
      // A refusal before the correction ran consumes neither attempt:
      // nothing was measured and nothing was spent. Every state maps to
      // itself, unchanged (BP-028 `## Error & edge behavior`).
      return { next: current };

    case "submitted":
      switch (current) {
        case "none":
          return { next: "running" };
        case "failed_once":
          return { next: "running_retry" };
        case "running":
        case "running_retry":
          // A submission during the retry is `already_running`, not
          // `already_used` — the retry has not been spent until it
          // returns (decision 2a; both running members refuse the same
          // way).
          return { refused: "already_running" };
        case "used":
        case "exhausted":
          return { refused: "already_used" };
        default:
          return assertNever(current);
      }

    case "produced_report":
      switch (current) {
        case "running":
        case "running_retry":
          // Produced from either running member — including a report
          // whose re-measurement stopped early (criterion 7's last
          // sentence: a correction that stopped early did produce a
          // report) — moves to `used`.
          return { next: "used" };
        // Unreachable from a correct caller. BP-028's table names these
        // pairs "unreachable, and a compile error rather than a
        // fall-through arm" but states no return value for them, while
        // decision 2 requires totality over states x events.
        // `{ next: current }` is the only return that satisfies
        // totality without inventing a transition: it advances nothing
        // and spends nothing (WO-081 step 5, placement choice, rule
        // 1.1) — enumerated here, not caught by a `default`.
        case "none":
        case "failed_once":
        case "used":
        case "exhausted":
          return { next: current };
        default:
          return assertNever(current);
      }

    case "produced_no_report":
      switch (current) {
        case "running":
          // First attempt: failed once, retry available.
          return { next: "failed_once" };
        case "running_retry":
          // Second attempt: exhausted. The one pair the five-member
          // union could not separate from the case above (decision 2a).
          return { next: "exhausted" };
        // Unreachable from a correct caller — same placement choice as
        // the `produced_report` arm above.
        case "none":
        case "failed_once":
        case "used":
        case "exhausted":
          return { next: current };
        default:
          return assertNever(current);
      }

    default:
      return assertNever(event);
  }
}

/**
 * What a correction re-measures and what it carries forward. BP-012 reads
 * this constant rather than deciding the scope itself, so no correction
 * can re-read the domain's own pages by accident (REQ-094 criterion 3).
 */
export const CORRECTION_SCOPE = Object.freeze({
  reDerive: Object.freeze([
    "market",
    "questions",
    "ai_answers",
    "google_presence",
    "rivals",
    "score",
  ] as const),
  carryForward: Object.freeze(["foundations", "answerability", "on_page", "robots"] as const),
});
