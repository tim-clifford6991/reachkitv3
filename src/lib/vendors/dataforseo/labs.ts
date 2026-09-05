// BUILD §6.3 — DataForSEO Labs: rankedKeywords, keywordSuggestions, competitorsDomain (issue #23)
//
// The three Labs endpoints §6.3 admits. Labs is live-only at the vendor
// ("DataForSEO Labs API supports only the Live method of data retrieval"),
// so none takes a `mode`. Each is priced from `PRICE_BOOK` by the row count
// it asks for (§6.1) and cached on the §6.4 window its subject earns:
// `rows` decides both — 50 and 300 are the customer's own domain (7d),
// 100 is a rival's (30d); suggestions are the market's (30d);
// `competitors_domain` keys on the customer's rankings (30d, the rival
// window — it is a warm-start supplement, §6.6).
//
// Per-rival `ranked_keywords` on the free path is on the never-list (§6.4);
// that is the caller's tier logic — this module offers exactly the three
// row counts the price book prices and nothing else.
import type { CostContext } from "@/lib/costs";
import { CACHE_WINDOWS_D, PRICE_BOOK, SERP_LOCATION, VENDOR } from "@/lib/config/constants";
import type { Measured } from "@/lib/measure/measured";
import { asArray, asNumber, asString, callEndpoint, isRecord, ledgered } from "./envelope";
import type { CompetitorRow, RankedRow, SuggestionRow } from "./types";

const LABS = "/v3/dataforseo_labs/google";
const LOCALE_KEY = `${SERP_LOCATION.location}|${SERP_LOCATION.language}`;

export type RankedRows = typeof PRICE_BOOK.RANKED_FREE_ROWS | typeof PRICE_BOOK.RANKED_RIVAL_ROWS | typeof PRICE_BOOK.RANKED_PAID_ROWS;

/** Row count → the price-book pin that prices it. The three admitted
 *  counts are the three pinned rows; there is no formula and no fourth. */
function rankedCostCents(rows: RankedRows): number {
  switch (rows) {
    case PRICE_BOOK.RANKED_FREE_ROWS:
      return PRICE_BOOK.RANKED_FREE_COST_C;
    case PRICE_BOOK.RANKED_RIVAL_ROWS:
      return PRICE_BOOK.RANKED_RIVAL_COST_C;
    case PRICE_BOOK.RANKED_PAID_ROWS:
      return PRICE_BOOK.RANKED_PAID_COST_C;
  }
}

/** Row count → §6.4 window. The rival count is the only one that is not
 *  the customer's own domain. */
function rankedFreshnessDays(rows: RankedRows): number {
  return rows === PRICE_BOOK.RANKED_RIVAL_ROWS ? CACHE_WINDOWS_D.rival : CACHE_WINDOWS_D.own;
}

function parseRanked(result: unknown): RankedRow[] | undefined {
  if (!isRecord(result)) return undefined;
  if (result.items === null || result.items === undefined) return [];
  if (!Array.isArray(result.items)) return undefined;
  const rows: RankedRow[] = [];
  for (const item of result.items) {
    if (!isRecord(item)) continue;
    const kd = isRecord(item.keyword_data) ? item.keyword_data : undefined;
    const keyword = kd ? asString(kd.keyword) : undefined;
    if (!keyword) continue;
    const info = kd && isRecord(kd.keyword_info) ? kd.keyword_info : undefined;
    const serp = isRecord(item.ranked_serp_element) && isRecord(item.ranked_serp_element.serp_item)
      ? item.ranked_serp_element.serp_item
      : undefined;
    const position = serp ? (asNumber(serp.rank_group) ?? asNumber(serp.rank_absolute)) : undefined;
    if (position === undefined) continue;
    rows.push({
      keyword,
      position,
      searchVolume: (info ? asNumber(info.search_volume) : undefined) ?? 0,
      url: (serp ? asString(serp.url) : undefined) ?? "",
    });
  }
  return rows;
}

function parseSuggestions(result: unknown): SuggestionRow[] | undefined {
  if (!isRecord(result)) return undefined;
  if (result.items === null || result.items === undefined) return [];
  if (!Array.isArray(result.items)) return undefined;
  const rows: SuggestionRow[] = [];
  for (const item of result.items) {
    if (!isRecord(item)) continue;
    const keyword = asString(item.keyword);
    if (!keyword) continue;
    const info = isRecord(item.keyword_info) ? item.keyword_info : undefined;
    rows.push({ keyword, searchVolume: (info ? asNumber(info.search_volume) : undefined) ?? 0 });
  }
  return rows;
}

function parseCompetitors(target: string, result: unknown): CompetitorRow[] | undefined {
  if (!isRecord(result)) return undefined;
  if (result.items === null || result.items === undefined) return [];
  if (!Array.isArray(result.items)) return undefined;
  const rows: CompetitorRow[] = [];
  for (const item of asArray(result.items)) {
    if (!isRecord(item)) continue;
    const domain = asString(item.domain)?.toLowerCase();
    // The vendor lists the target itself as its own first "competitor".
    if (!domain || domain === target.toLowerCase()) continue;
    rows.push({ domain, overlapKeywords: asNumber(item.intersections) ?? 0 });
  }
  return rows;
}

export async function rankedKeywords(
  c: CostContext,
  a: { domain: string; rows: RankedRows }
): Promise<Measured<RankedRow[]>> {
  return ledgered<RankedRow>(c, {
    source: "dataforseo_labs/google/ranked_keywords",
    cacheKey: `${a.domain}|${a.rows}|${LOCALE_KEY}`,
    freshnessDays: rankedFreshnessDays(a.rows),
    costCents: rankedCostCents(a.rows),
    fetch: () =>
      callEndpoint({ live: `${LABS}/ranked_keywords/live` }, "live", {
        target: a.domain,
        limit: a.rows,
      }),
    parse: parseRanked,
  });
}

export async function keywordSuggestions(
  c: CostContext,
  a: { seed: string; rows: typeof VENDOR.suggestionsRows }
): Promise<Measured<SuggestionRow[]>> {
  return ledgered<SuggestionRow>(c, {
    source: "dataforseo_labs/google/keyword_suggestions",
    cacheKey: `${a.seed}|${a.rows}|${LOCALE_KEY}`,
    freshnessDays: CACHE_WINDOWS_D.suggestions,
    costCents: PRICE_BOOK.SUGGESTIONS_COST_C,
    fetch: () =>
      callEndpoint({ live: `${LABS}/keyword_suggestions/live` }, "live", {
        keyword: a.seed,
        limit: a.rows,
      }),
    parse: parseSuggestions,
  });
}

export async function competitorsDomain(c: CostContext, a: { domain: string }): Promise<Measured<CompetitorRow[]>> {
  return ledgered<CompetitorRow>(c, {
    source: "dataforseo_labs/google/competitors_domain",
    cacheKey: `${a.domain}|${LOCALE_KEY}`,
    freshnessDays: CACHE_WINDOWS_D.rival,
    costCents: PRICE_BOOK.COMPETITORS_DOMAIN_COST_C,
    fetch: () =>
      callEndpoint({ live: `${LABS}/competitors_domain/live` }, "live", {
        target: a.domain,
        limit: VENDOR.competitorsDomainRows,
      }),
    parse: (result) => parseCompetitors(a.domain, result),
  });
}
