// src/lib/vendors/dataforseo/index.ts — WO-023, BP-008 decision 1: "the
// closed list is the module's exported surface. A call the product may not
// make is a compile error, not a review finding."
//
// This file's exported set is exactly BP-008's six functions and nothing
// else — no generic `dataforseo(endpoint, params)`, no re-export of
// `transport.ts`. `tests/vendors/never-list.test.ts` asserts the exported
// key set is exactly these six names; adding a seventh export of any shape
// fails it by construction (never-list, enforced by absence).
//
// **Stubs, by design (rule 4.2 note, not a defect of this build).** This
// work order's own file-plan row says "created here empty of
// implementations so the closed list is one readable file from the first
// commit" and its `## Out of scope` reserves the three Labs bodies to
// WO-024 and the three SERP/AI bodies to WO-025. Every function below
// therefore throws until one of those two work orders replaces its body —
// the *signature*, not the implementation, is what this order ships, and
// the signature is what `tests/vendors/never-list.test.ts` and WO-286
// (which imports `SerpResult` from `./types.ts` at this path) depend on.
//
// **Signature note — this file matches *current* BP-008, not WO-023's own
// inlined `## Interfaces` block (rule 4.2, said once here).** BP-008 was
// amended 2026-09-03 by ADR-094 (landmine): `serpOrganic` gained a third,
// required argument, `loadAsyncAiOverview: boolean`, and the never-list's
// bullet was corrected — `load_async_ai_overview` is no longer wholly
// unreachable, it is the never-list's one admitted exception, on exactly
// one call site (BP-025's, out of this WO's scope), enforced by the
// parameter being required rather than defaulted (BP-008 decision 2's
// pattern, applied a second time). WO-023's own `## Interfaces` block and
// two `## Test plan` rows still quote the pre-amendment blueprint text
// (cut 2026-08-31, never refreshed against the 2026-09-03 amendment) and
// so read as though `load_async_ai_overview` has no function at all. This
// build follows current BP-008 — the WO's own `## Interfaces` header
// instructs "verbatim from BP-008 `## Public interface`" and rule 2.4
// makes the blueprint the one home for this fact — rather than the WO's
// stale transcription of it, which is now wrong on its face (BP-008's
// current interface block, quoted in this WO's own pack, disagrees with
// it in the same document). Flagged once, here; not re-argued elsewhere.
// The never-list test below is written to the current, amended contract.
import type { CostContext } from "@/lib/costs";
import type { Measured } from "@/lib/measure/measured";
import type {
  AiAnswer,
  CompetitorRow,
  RankedRow,
  SerpResult,
  SuggestionRow,
} from "./types";

function notYetImplemented(fn: string, wo: string): never {
  throw new Error(`src/lib/vendors/dataforseo: ${fn}() is not yet implemented — see ${wo}.`);
}

export async function rankedKeywords(
  c: CostContext,
  a: { domain: string; rows: 50 | 100 | 300 }
): Promise<Measured<RankedRow[]>> {
  void c;
  void a;
  notYetImplemented("rankedKeywords", "WO-024");
}

export async function keywordSuggestions(
  c: CostContext,
  a: { seed: string; rows: 50 }
): Promise<Measured<SuggestionRow[]>> {
  void c;
  void a;
  notYetImplemented("keywordSuggestions", "WO-024");
}

export async function competitorsDomain(
  c: CostContext,
  a: { domain: string }
): Promise<Measured<CompetitorRow[]>> {
  void c;
  void a;
  notYetImplemented("competitorsDomain", "WO-024");
}

// `loadAsyncAiOverview` is required, never defaulted (ADR-094 decision 1) —
// the never-list's one admitted exception, and only on this function.
export async function serpOrganic(
  c: CostContext,
  a: { query: string; mode: "live" | "std"; loadAsyncAiOverview: boolean }
): Promise<Measured<SerpResult>> {
  void c;
  void a;
  notYetImplemented("serpOrganic", "WO-025");
}

export async function aiMode(
  c: CostContext,
  a: { query: string; mode: "live" | "std" }
): Promise<Measured<AiAnswer>> {
  void c;
  void a;
  notYetImplemented("aiMode", "WO-025");
}

export async function llmScraper(
  c: CostContext,
  a: { query: string; mode: "std" }
): Promise<Measured<AiAnswer>> {
  void c;
  void a;
  notYetImplemented("llmScraper", "WO-025");
}
