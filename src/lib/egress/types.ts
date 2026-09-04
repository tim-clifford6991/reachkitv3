// src/lib/egress/types.ts — WO-018, transcribed verbatim from BP-006
// `## Public interface` (as of 2026-08-31).
//
// `FetchOutcome` is `safeFetch`'s return type: a discriminated union, never
// a thrown error, so a caller can distinguish "could not determine"
// (REQ-004 criterion 6) from "read it and it contained nothing" (REQ-004
// criterion 7) — BP-006 `## Error & edge behavior`, decision 1.
export type FetchOutcome =
  | { ok: true; status: number; url: string; html: string; bytes: number; readAt: Date }
  | { ok: false; reason: 'dns' | 'refused' | 'timeout' | 'too_large' | 'blocked_by_policy'
              | 'robots_disallowed' | 'status'; status?: number; url: string; readAt: Date }

/** Declared here because `readRobots` produces it and this is the one module
 *  that reads a `robots.txt`. BP-010 returns `Measured<RobotsPolicy>` from
 *  `measureDomain`, BP-024's `verdictOf` takes one and BP-047 serves one; none
 *  of them declared it. It is a parse of a fetched document, never a judgement
 *  about it: what each rule means for the blocked-readers count is BP-024's and
 *  what ReachKit serves on a hosted domain is BP-047's. */
export interface RobotsPolicy {
  ok: true
  origin: string
  readAt: Date
  /** True where the document tells *every* reader not to crawl — REQ-004 c7's
   *  "a home document the scan read that tells every reader not to index it". */
  disallowsAll: boolean
  /** Per user-agent token, whether this document disallows it at the origin
   *  root. Keyed by the token as written in the document, lowercased; the
   *  closed set the product counts over is BP-005's `AI_READER_AGENTS`
   *  (ADR-022, ADR-090) and is applied by the caller, not here. */
  disallowedAgents: Readonly<Record<string, boolean>>
  /** Sitemap declarations found in the document, in the order they appeared. */
  sitemaps: readonly string[]
  /** True where the origin answered 404 or an equivalent "no robots.txt".
   *  That is a *read* with nothing in it — REQ-004 criterion 7's `zero`, not
   *  criterion 6's `undeterminable` — and the distinction is the reason this
   *  field exists rather than a null policy. */
  absent: boolean
}
