// src/lib/market/questions/matrix.ts — BUILD §6.7 — the AI-answers card,
// assembled from SERPs the twelve questions already bought (§6.2's ruling,
// §6.6's cold-start law).
//
// One cell per question, two counts that can only be read against what was
// measured, and no field an instruction, a technique or a severity could
// be written into. The card reports what was measured and nothing more.
//
// **Three cell kinds, never two.** A search whose SERP could not be
// measured lowers the denominator and is never a place the customer was
// ignored; a search Google served no AI answer on is excluded from both
// counts and is not an absence either — it carries no `namesCustomer`
// field at all, so no surface can read one as `false` and draw it as a
// miss. Only an `answered` cell can say anything about the customer.
//
// **Which answers this card could see** is `coverage`, decided by the
// caller and carried on the card as a state, never as a sentence
// (DECISIONS 2026-09-03 / ADR-094). The free report's initial twelve
// question-SERPs are bought with `loadAsyncAiOverview: true` and count
// Google's actual AI answers — `async_included`. A market correction's
// re-run does not buy them: the free scan's 12¢ cap stands and a
// correction spends no second allowance, so the corrected card counts only
// what Google had already cached — `cached_only`, and the report's
// disclosure line is rendered from that state.
//
// **This module buys nothing.** It reads the `Measured<MarketSerp>[]` the
// scan already paid for and resolves no import into `src/lib/vendors/`,
// `src/lib/costs/` or `src/lib/llm/`. Domain normalisation and the
// own-domain test are `../rivals/domains`' — one implementation in the
// product, not two.
import type { Measured } from "@/lib/measure/measured";
import { isOwnDomain, registrableDomain } from "../rivals/domains";
import type { MarketSerp, QuestionView } from "../views";

export type AnswerCell =
  | { kind: "answered"; citedDomains: readonly string[]; namesCustomer: boolean }
  | { kind: "no_answer" }
  | { kind: "unmeasured"; reason: "undeterminable" | "not_attempted" };

/** The row is a **view**, not the `Question` value. It carries the wording
 *  and the search text the provenance line requires and nothing else from
 *  the selected search: there is no field a monthly volume can travel in
 *  (the owner removed per-question `{vol}/mo` on 2026-09-03). The full
 *  selected search, volume included, stays in the report's questions
 *  section, where selection provenance and the opportunity ranking read
 *  it. */
export interface AnswerRow {
  questionId: string;
  text: string;
  phrasing: "template" | "model";
  keyword: string;
  cell: AnswerCell;
}

export interface AiAnswersCard {
  /** n — how many of the questions' SERPs were measured at all. */
  measuredSearches: number;
  /** m of n — on how many of those an AI answer appeared. */
  answeredSearches: number;
  /** Counted over m, never over n. */
  customerCitations: number;
  rows: readonly AnswerRow[];
  /** Which AI answers this card could see. A state, never a sentence. */
  coverage: "async_included" | "cached_only";
}

/** An AI Overview's reference hosts, reduced to registrable domains: nulls
 *  dropped, first-seen order preserved, exact duplicates collapsed once. */
function citedDomainsOf(hosts: readonly string[]): string[] {
  const domains: string[] = [];
  const seen = new Set<string>();
  for (const host of hosts) {
    const domain = registrableDomain(host);
    if (domain === null || seen.has(domain)) continue;
    seen.add(domain);
    domains.push(domain);
  }
  return domains;
}

/**
 * One cell per question, one arm each:
 *
 *  - the SERP was not measured → `unmeasured`, carrying the reason the
 *    measurement itself gave. It lowers n and counts nowhere else.
 *  - Google served no AI Overview → `no_answer`, excluded from both
 *    counts.
 *  - otherwise `answered`. An AI answer that cited no domain at all is
 *    `answered` with `citedDomains: []` — the answer named no brand, which
 *    is a different fact from no answer appearing, and it raises m.
 */
function cellFor(measured: Measured<MarketSerp> | undefined, ownDomain: string): AnswerCell {
  if (measured === undefined) return { kind: "unmeasured", reason: "not_attempted" };
  if (measured.kind === "unmeasured") return { kind: "unmeasured", reason: measured.reason };
  if (!measured.value.aiOverview.present) return { kind: "no_answer" };

  const citedDomains = citedDomainsOf(measured.value.aiOverview.referenceDomains);
  return {
    kind: "answered",
    citedDomains,
    namesCustomer: citedDomains.some((domain) => isOwnDomain(domain, ownDomain)),
  };
}

/**
 * Pairs each question with the SERP bought for its search, in question
 * order — `serps[i]` is the SERP for `questions[i]`, the scan's own
 * parallel record of one battery. `rows.length === questions.length`
 * always: a question whose SERP is missing entirely is an `unmeasured`
 * cell, never a dropped row.
 *
 * The five invariants this function holds, asserted in
 * `tests/market/questions/matrix.test.ts`:
 *   `measuredSearches === rows.filter(r => r.cell.kind !== 'unmeasured').length`
 *   `answeredSearches === rows.filter(r => r.cell.kind === 'answered').length`
 *   `customerCitations <= answeredSearches`
 *   `rows.length === questions.length`
 *   every `row.keyword` is its question's own search keyword, and no row
 *   carries any other field of one.
 */
export function buildAiAnswersCard(a: {
  questions: readonly QuestionView[];
  serps: readonly Measured<MarketSerp>[];
  ownDomain: string;
  coverage: AiAnswersCard["coverage"];
}): AiAnswersCard {
  const rows: AnswerRow[] = a.questions.map((question, i) => ({
    questionId: question.id,
    text: question.text,
    phrasing: question.phrasing,
    keyword: question.search.keyword,
    cell: cellFor(a.serps[i], a.ownDomain),
  }));

  const answered = rows.filter((row) => row.cell.kind === "answered");
  const card: AiAnswersCard = {
    measuredSearches: rows.filter((row) => row.cell.kind !== "unmeasured").length,
    answeredSearches: answered.length,
    customerCitations: answered.filter((row) => row.cell.kind === "answered" && row.cell.namesCustomer).length,
    rows,
    coverage: a.coverage,
  };

  logCells(card);
  return card;
}

/** BP-025 `## NFR budget`: the per-cell outcome kind. Kinds only — no
 *  question, keyword or cited domain reaches a log line from here. */
function logCells(card: AiAnswersCard): void {
  console.log(
    JSON.stringify({
      event: "ai_answers_card",
      coverage: card.coverage,
      cells: card.rows.map((row) => row.cell.kind),
    })
  );
}
