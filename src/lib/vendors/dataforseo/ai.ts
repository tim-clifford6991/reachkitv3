// BUILD §6.2 — aiMode and llmScraper: the paid battery's two AI-answer engines (issue #23)
//
// Google AI Mode (its own SERP endpoint, live or standard) and the ChatGPT
// LLM Scraper (standard queue only — there is no live variant to call, so
// the type admits none). Both are **paid battery only**: §6.2/§6.3 rule the
// free path makes zero AI Optimization calls, and no compile-time shape can
// tell a free `CostContext` from a paid one, so each reads `c.cap` and under
// `FREE` returns `unmeasured / not_attempted` without reaching the vendor —
// a refusal, not a throw (§6.5: caps degrade, never throw).
//
// Prices are the §6.1 pins for the mode used. Cache: the battery is
// re-measured weekly, and no §6.4 window names it; `CACHE_WINDOWS_D.own`
// (7d) is the shortest pinned window and the one a weekly cadence fits.
// An engine that gave no answer is the vendor's own zero-result — `[]`,
// never cached (§6.4: no negative cache) — and surfaces as the `zero` arm
// carrying `answered: false`.
import type { CostContext } from "@/lib/costs";
import { CACHE_WINDOWS_D, PRICE_BOOK, SERP_LOCATION } from "@/lib/config/constants";
import { mapMeasured, unmeasured, type Measured } from "@/lib/measure/measured";
import { asArray, asString, callEndpoint, isRecord, ledgered, referenceDomains, type EndpointPaths } from "./envelope";
import type { DataForSeoMode } from "./transport";
import type { AiAnswer } from "./types";

const LOCALE_KEY = `${SERP_LOCATION.location}|${SERP_LOCATION.language}`;
const NO_ANSWER: AiAnswer = { answered: false, text: "", citedDomains: [] };

const AI_MODE = "/v3/serp/google/ai_mode";
const AI_MODE_PATHS: EndpointPaths = {
  live: `${AI_MODE}/live/advanced`,
  std: { taskPost: `${AI_MODE}/task_post`, taskGet: (id) => `${AI_MODE}/task_get/advanced/${encodeURIComponent(id)}` },
};

const LLM_SCRAPER = "/v3/ai_optimization/chat_gpt/llm_scraper";
const LLM_SCRAPER_PATHS: EndpointPaths = {
  std: { taskPost: `${LLM_SCRAPER}/task_post`, taskGet: (id) => `${LLM_SCRAPER}/task_get/advanced/${encodeURIComponent(id)}` },
};

/** Google AI Mode returns its answer as one `ai_overview` item with
 *  `markdown` and `references` (same shape as the organic SERP's overview). */
export function parseAiMode(result: unknown): AiAnswer[] | undefined {
  if (!isRecord(result)) return undefined;
  if (result.items === null || result.items === undefined) return [];
  if (!Array.isArray(result.items)) return undefined;
  for (const item of result.items) {
    if (!isRecord(item) || item.type !== "ai_overview") continue;
    const cited = new Set<string>(referenceDomains(item.references));
    for (const element of asArray(item.items)) {
      if (isRecord(element)) for (const d of referenceDomains(element.references)) cited.add(d);
    }
    const text = asString(item.markdown) ?? asString(item.text) ?? "";
    if (!text && cited.size === 0) return [];
    return [{ answered: true, text, citedDomains: [...cited] }];
  }
  return [];
}

/** The ChatGPT scraper's result: an item carrying `markdown` and `sources`
 *  — "the sources the model actually cited or relied on in its final
 *  answer" — which is what counts as a citation; `search_results` (what
 *  it retrieved, cited or not) deliberately does not. */
export function parseLlmScraper(result: unknown): AiAnswer[] | undefined {
  if (!isRecord(result)) return undefined;
  if (result.items === null || result.items === undefined) return [];
  if (!Array.isArray(result.items)) return undefined;
  for (const item of result.items) {
    if (!isRecord(item)) continue;
    const text = asString(item.markdown) ?? asString(item.text);
    const cited = referenceDomains(item.sources);
    if (!text && cited.length === 0) continue;
    return [{ answered: true, text: text ?? "", citedDomains: cited }];
  }
  return [];
}

function paidOnly<T>(c: CostContext, at: Date): Measured<T> | undefined {
  return c.cap === "FREE" ? unmeasured<T>("not_attempted", at) : undefined;
}

export async function aiMode(c: CostContext, a: { query: string; mode: DataForSeoMode }): Promise<Measured<AiAnswer>> {
  const refused = paidOnly<AiAnswer>(c, new Date());
  if (refused) return refused;
  const rows = await ledgered<AiAnswer>(c, {
    source: "serp/google/ai_mode",
    cacheKey: `${a.query}|${LOCALE_KEY}`,
    freshnessDays: CACHE_WINDOWS_D.own,
    costCents: a.mode === "live" ? PRICE_BOOK.AI_MODE_LIVE_C : PRICE_BOOK.AI_MODE_STD_C,
    fetch: () => callEndpoint(AI_MODE_PATHS, a.mode, { keyword: a.query }),
    parse: parseAiMode,
  });
  return mapMeasured(rows, (r) => r[0] ?? NO_ANSWER);
}

export async function llmScraper(c: CostContext, a: { query: string; mode: "std" }): Promise<Measured<AiAnswer>> {
  const refused = paidOnly<AiAnswer>(c, new Date());
  if (refused) return refused;
  const rows = await ledgered<AiAnswer>(c, {
    source: "ai_optimization/chat_gpt/llm_scraper",
    cacheKey: `${a.query}|${LOCALE_KEY}`,
    freshnessDays: CACHE_WINDOWS_D.own,
    costCents: PRICE_BOOK.CHATGPT_SCRAPE_STD_C,
    fetch: () => callEndpoint(LLM_SCRAPER_PATHS, a.mode, { keyword: a.query }),
    parse: parseLlmScraper,
  });
  return mapMeasured(rows, (r) => r[0] ?? NO_ANSWER);
}
