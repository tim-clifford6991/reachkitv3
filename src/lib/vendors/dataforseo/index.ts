// BUILD §6.3 — the closed DataForSEO endpoint list, and nothing else (issue #23; WO-023 landed the shape)
//
// This file's exported set is exactly the six functions ARCHITECTURE.md's
// vendors row names — no generic `dataforseo(endpoint, params)`, no
// re-export of `transport.ts` or `envelope.ts`. `tests/vendors/never-list.test.ts`
// asserts the exported key set is exactly these six names; adding a seventh
// export of any shape fails it by construction. Everything BUILD §6.4's
// never-list forbids — SERP depth > 10, search operators, clickstream flags,
// Labs historical endpoints, a fourth engine, AI Keyword Data — has no
// function here to call. The never-list's one admitted exception,
// `load_async_ai_overview`, is `serpOrganic`'s required `loadAsyncAiOverview`
// argument (DECISIONS 2026-09-03 / ADR-094) and reaches the wire on no other
// function.
//
// Signatures are BP-008's `## Public interface` verbatim (archived), the
// row counts typed from the price-book pins so a count the book does not
// price is a compile error.
export { competitorsDomain, keywordSuggestions, rankedKeywords } from "./labs";
export { serpOrganic } from "./serp";
export { aiMode, llmScraper } from "./ai";
