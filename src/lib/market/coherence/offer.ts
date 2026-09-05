// src/lib/market/coherence/offer.ts — BUILD §6.7 step 5
//
// What the report's face shows, and whether the correction control is
// drawn. A reader always gets a route: either the category the report
// measured, or a plain statement that the scan never reached one — never a
// guess, and never a default category, which does not exist anywhere in
// this file.
//
// The offer is computed at render time from one stored report and a
// supplied clock, and from nothing else. It never asks the scan pipeline
// whether a scan could run: a report renders its offer correctly even
// while scanning is switched off, because the refusal for that belongs at
// submission, where the reason exists, and costs the reader neither of
// their two attempts. This module resolves no import into
// `src/lib/scan/`, `src/lib/db/`, `src/lib/costs/` or `src/lib/vendors/`,
// and reads no ambient clock — a fixed `now` produces a fixed result, so
// moving a threshold re-renders correctly against every report already
// stored.
import { CORRECTION } from "@/lib/config/constants";
import type { CorrectionState } from "./state";

/** What this node needs from a stored report, supplied by its caller.
 *  Deliberately not the scan module's stored-report type: even a type-only
 *  import of it would put a `src/lib/market` → `src/lib/scan` edge into
 *  the build graph. The report address reads the report and hands these
 *  five fields in. */
export interface ReportFacts {
  scanId: string;
  measuredAt: Date;
  /** `null` where the scan never reached a category — it stopped early, or
   *  could not read the pages a category is inferred from. */
  category: string | null;
  correctionState: CorrectionState;
  domainRemoved: boolean;
}

export type CategoryOnReport =
  | { shown: true; category: string }
  | { shown: false; reason: "not_reached" };

export type CorrectionOffer =
  | { offered: true; as: "first" | "retry" }
  | {
      offered: false;
      because: "used" | "exhausted" | "in_progress" | "report_too_old" | "domain_removed";
    };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The category the report measured, shown on the face of a report of
 * **any** age — only the *control* expires. Where the scan never reached
 * one, nothing is named and nothing is guessed; what the report already
 * requires of that unmeasured input stands there instead.
 */
export function categoryOnReport(report: ReportFacts): CategoryOnReport {
  return report.category === null
    ? { shown: false, reason: "not_reached" }
    : { shown: true, category: report.category };
}

/** Whole days between two instants, floored — the unit the offer's age
 *  bound is stated in. */
function wholeDaysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Whether a correction is still on offer for this report, and if not, the
 * most specific true reason.
 *
 * The branch order is the reason order, and reordering it changes what a
 * reader is told:
 *  1. the domain's report was removed on the owner's written request;
 *  2. a correction is **in progress** — both running members take this arm
 *     as one condition, because a retry in flight is in progress and has
 *     not been spent until it returns;
 *  3. the one correction has been used, or both attempts are exhausted —
 *     terminal, and distinct from `in_progress`;
 *  4. the report is old enough that the reader's route is a re-scan, not a
 *     correction;
 *  5. a correction that ran and produced no report offers its single
 *     retry;
 *  6. otherwise the first correction is on offer.
 *
 * Where the scan never reached a category the control is still offered, on
 * the same terms: correcting supplies the category the scan never reached.
 * `categoryOnReport` and `correctionOffer` share no branch.
 *
 * The offer is per report. This function holds no state across calls, so a
 * re-scan — a new stored report, carrying `correctionState: 'none'` of its
 * own — carries one correction, whatever the report before it measured or
 * failed to.
 */
export function correctionOffer(a: { report: ReportFacts; now: Date }): CorrectionOffer {
  const { report, now } = a;

  if (report.domainRemoved) return logged({ offered: false, because: "domain_removed" });

  if (report.correctionState === "running" || report.correctionState === "running_retry") {
    return logged({ offered: false, because: "in_progress" });
  }

  if (report.correctionState === "used") return logged({ offered: false, because: "used" });
  if (report.correctionState === "exhausted") return logged({ offered: false, because: "exhausted" });

  if (wholeDaysBetween(report.measuredAt, now) >= CORRECTION.offerMaxAgeDays) {
    return logged({ offered: false, because: "report_too_old" });
  }

  return logged(
    report.correctionState === "failed_once" ? { offered: true, as: "retry" } : { offered: true, as: "first" }
  );
}

/** BP-028 `## NFR budget`: the offer outcome. The returned value already
 *  carries everything a caller needs to log and nothing is added to it
 *  here; no category and no scan id reaches a log line from this file. */
function logged(offer: CorrectionOffer): CorrectionOffer {
  console.log(
    JSON.stringify(
      offer.offered
        ? { event: "correction_offer", offered: true, as: offer.as }
        : { event: "correction_offer", offered: false, because: offer.because }
    )
  );
  return offer;
}
