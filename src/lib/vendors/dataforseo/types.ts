// src/lib/vendors/dataforseo/types.ts — WO-023, BP-008 `## Public interface`.
//
// Product types, not vendor payload shapes (BP-008 file-plan row): every
// field here is what the rest of the corpus needs to read, not whatever
// name-and-nesting DataForSEO's own JSON happens to use. Parsing a real
// vendor response into these shapes is WO-024's (`RankedRow`,
// `SuggestionRow`, `CompetitorRow`) and WO-025's (`SerpResult`, `AiAnswer`)
// job — out of this work order's scope (`## Out of scope`) — this file
// only fixes the address those two work orders parse into and the one
// WO-286 imports from (this file's own header, dispatch note).

/** `rankedKeywords` — one keyword the domain ranks for. */
export interface RankedRow {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
}

/** `keywordSuggestions` — one keyword DataForSEO returns for a seed term. */
export interface SuggestionRow {
  keyword: string;
  searchVolume: number;
}

/** `competitorsDomain` — one domain DataForSEO names as a search competitor. */
export interface CompetitorRow {
  domain: string;
  overlapKeywords: number;
}

/** One organic result inside a `SerpResult`'s top 10 (depth 10, fixed by
 *  `transport.ts`, never a caller argument). */
export interface SerpOrganicRow {
  position: number;
  domain: string;
  url: string;
  title: string;
}

/** The AI Overview element of one SERP, if Google served one. BP-008
 *  `## Error & edge behavior` (ADR-094 decision 3a): the settlement closure
 *  reads `asynchronousAiOverview` to decide the vendor's own documented
 *  charge — base price where this element is absent or
 *  `asynchronousAiOverview` is `false`, the surcharge rate otherwise — so
 *  this field is not cosmetic; it is what `serpOrganic`'s `settleCents`
 *  argument to `CostContext.recordFetch` reads. */
export interface SerpAiOverview {
  /** `false` when Google served no AI Overview at all on this SERP. */
  present: boolean;
  /** DataForSEO's own `asynchronous_ai_overview` flag on the response
   *  element — meaningless when `present` is `false`. */
  asynchronousAiOverview: boolean;
  /** The domains the AI Overview cited, in the order DataForSEO returned
   *  them. Empty when `present` is `false`. */
  referenceDomains: readonly string[];
}

/** `serpOrganic` — organic top-10 **and** the `ai_overview` item with its
 *  reference domains, per BP-008's `## Responsibility` ("the free AI
 *  matrix rides here at 0c extra"). */
export interface SerpResult {
  organic: readonly SerpOrganicRow[];
  aiOverview: SerpAiOverview;
}

/** `aiMode` and `llmScraper` — one AI engine's synthesized answer, if it
 *  gave one, and the domains it cited. */
export interface AiAnswer {
  answered: boolean;
  text: string;
  citedDomains: readonly string[];
}
