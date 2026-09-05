// src/lib/market/questions/profile.ts — WO-071, BP-025 `## Public interface`
// (BUILD §6.7 step 1).
//
// **Risk: high — seams: money, and data leaving the system.** This is the
// order that turns a domain's own home (and optional pricing) text into a
// billable nano call, and decides which of that customer's own text
// crosses to the vendor. Mutation-tested (doctrine 0.13.2, rule 2b):
//   1. **Spend** — the call is issued through `llm()`, which is the one
//      seam every model call's cost passes through (`CostContext.
//      recordFetch`, BP-009/BP-007). This file makes no call of its own
//      outside `llm()` and opens no `fetch`.
//   2. **What crosses the boundary** — `input` is exactly `{ home,
//      pricing }` as the caller supplied it: no keyword, no search term,
//      no selection state, nothing else in this module's future siblings
//      is read here. `deriveProfile` synthesises nothing: an `unmeasured`
//      `llm()` result is returned unaltered, with no default `Profile`
//      substituted for it — a test that survives deleting that pass-through
//      would turn an unreadable home page into a paid call over invented
//      output.
import { z } from "zod";
import type { CostContext } from "@/lib/costs";
import type { Measured } from "@/lib/measure/measured";
import { llm } from "@/lib/llm";

/** BP-025 `## Public interface`, verbatim. */
export interface Profile {
  category: string; // buyer vocabulary, never the site's marketing language
  job: string;
  offeringType: string;
  audienceTerms: readonly string[]; // 2–4
  namedRivals: readonly string[]; // rivals the site itself names
  vocabulary: readonly string[]; // the relevance guard's support set
  brandTokens: readonly string[]; // the own-brand drop set
}

/** The model's output, parsed against exactly `Profile`'s seven fields —
 *  `.strictObject` so a response carrying an eighth field (a keyword, a
 *  selected search) does not parse (`## Steps` step 2). A response that
 *  does not parse is a failed call: `llm()`'s own seam already returns
 *  `unmeasured` for it, and no rescue path is added here. */
const PROFILE_SCHEMA = z.strictObject({
  category: z.string(),
  job: z.string(),
  offeringType: z.string(),
  audienceTerms: z.array(z.string()).min(2).max(4),
  namedRivals: z.array(z.string()),
  vocabulary: z.array(z.string()),
  brandTokens: z.array(z.string()),
});

/** BP-025 `## Public interface`, verbatim signature. One `llm()` call,
 *  `site: 'profile'`, `tier: 'nano'`; the `CostContext` passed straight
 *  through and the `Measured<Profile>` `llm()` returns handed back
 *  unaltered — no default category, no fallback to the site's own
 *  marketing wording, no retry (`llm()` already retries once on a parse
 *  failure; this function does not retry again). */
export function deriveProfile(
  c: CostContext,
  a: { home: string; pricing?: string }
): Promise<Measured<Profile>> {
  return llm(c, {
    site: "profile",
    input: { home: a.home, pricing: a.pricing },
    schema: PROFILE_SCHEMA,
    tier: "nano",
  }).then((result) => {
    logProfileOutcome(result);
    return result;
  });
}

/** BP-025 `## NFR budget`: "Observability: profile outcome kind, …" — the
 *  outcome kind (`measured` / `zero` / `unmeasured` + reason) and nothing
 *  else. Never the profile's own fields: `category`, `vocabulary` and the
 *  rest are the customer's own derived text and have no seam that permits
 *  them into a log line. */
function logProfileOutcome(result: Measured<Profile>): void {
  console.log(
    JSON.stringify(
      result.kind === "unmeasured"
        ? { event: "profile_outcome", kind: result.kind, reason: result.reason }
        : { event: "profile_outcome", kind: result.kind }
    )
  );
}
