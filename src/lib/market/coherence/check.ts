// src/lib/market/coherence/check.ts — WO-080, BP-028
//
// Three verdicts, not two: `coherent`, `incoherent`, `unjudgeable` — never
// two. Below `COHERENCE.minMeasuredSearches` (3) the check has no input:
// with fewer than three measured top-tens no domain can reach the
// threshold whatever they contain, so a coherent and an incoherent market
// would produce the identical result. `unjudgeable` says so instead of
// guessing — REQ-094 criterion 2's promise, and this WO's whole reason to
// exist (BP-028 `## Error & edge behavior`).
//
// The threshold is a pinned *expression*, never a pinned number
// (BP-028 decision 1: "The threshold is a pinned expression, not a pinned
// number"). Neither `2` nor `4` appears as a literal in this file
// (`structure.md` rule 5) — both operands are read from `COHERENCE`.
import { COHERENCE } from "@/lib/config/constants";
import { registrableDomain } from "@/lib/market/rivals/domains";

/**
 * A local, structural view of BP-008's `SerpResult` — not a second
 * declaration of that type (rule 2.4), a narrower read of it.
 *
 * `checkCoherence` reads only the organic top ten's domains (BP-028 step 3
 * counts appearances in "the supplied SERPs' top tens"; it never touches
 * `ai_overview`). This WO's own purity clause (`check/is-pure`, below and
 * in the test file) forbids an import into `src/lib/vendors/`, where
 * BP-008's canonical `SerpResult` is declared
 * (`src/lib/vendors/dataforseo/types.ts`, WO-023's file plan) — and no
 * neutral re-export of it exists yet under `src/lib/market/` for a pure
 * consumer to import instead. WO-080's file plan is two files and cannot
 * add a third to hold one. Any real `SerpResult` (carrying `ai_overview`
 * and more besides) satisfies this narrower shape structurally.
 *
 * Flagged in the WO-080 return as a `rests-on` row: the same kind of
 * cross-node disagreement ADR-095 resolved for `report.market` and
 * `coherence`, and the architect's to resolve the same way — not decided
 * unilaterally here.
 */
export interface SerpResult {
  organic: readonly { domain: string }[];
}

export type CoherenceVerdict =
  | { verdict: "coherent" }
  | { verdict: "incoherent"; threshold: number; best: number }
  | { verdict: "unjudgeable"; measuredCount: number };

/** max(2, ceil(n / 4)) — a share of what was measured, never an absolute
 *  count. Rescales with the denominator: 3 at n = 12 (BUILD.md §6.7 step
 *  5's literal, at that one denominator), 2 at n = 4, never the whole
 *  number measured (REQ-094 criterion 2; REQ-006 criterion 1's variable
 *  denominator). */
export function coherenceThreshold(measuredCount: number): number {
  return Math.max(
    COHERENCE.minAppearances,
    Math.ceil(measuredCount / COHERENCE.shareDivisor)
  );
}

/**
 * Judges a report's market coherent, incoherent, or unjudgeable against a
 * threshold that rescales with what was actually measured.
 *
 * Below `COHERENCE.minMeasuredSearches`, returns `unjudgeable` before
 * counting anything: with that few measured top-tens no domain can reach
 * the threshold whatever they contain, so a coherent and an incoherent
 * market would produce the identical result — the boundary this WO is
 * mutation-tested against (doctrine 0.13.2).
 */
export function checkCoherence(a: {
  serps: readonly SerpResult[];
  measuredCount: number;
}): CoherenceVerdict {
  const { serps, measuredCount } = a;

  if (measuredCount < COHERENCE.minMeasuredSearches) {
    return { verdict: "unjudgeable", measuredCount };
  }

  // Per registrable domain, in how many of the supplied SERPs' top tens it
  // appears — once per SERP, however many results on that SERP share the
  // domain.
  const appearances = new Map<string, number>();
  for (const serp of serps) {
    const seenOnThisSerp = new Set<string>();
    for (const result of serp.organic) {
      const domain = registrableDomain(result.domain);
      if (domain === null || seenOnThisSerp.has(domain)) continue;
      seenOnThisSerp.add(domain);
      appearances.set(domain, (appearances.get(domain) ?? 0) + 1);
    }
  }

  let best = 0;
  for (const count of appearances.values()) {
    if (count > best) best = count;
  }

  const threshold = coherenceThreshold(measuredCount);
  return best >= threshold
    ? { verdict: "coherent" }
    : { verdict: "incoherent", threshold, best };
}
