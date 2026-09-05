// BUILD §4.1, §6.3 — the stored report, declared
//
// `ARCHITECTURE.md` gives `src/lib/scan/**` "the stored report" and names
// `readCurrentReport()` as its entry point. This file is the *shape* half
// of that row: the blob `/scan/{domain}` renders, declared once so the
// screen has one type to read and the pipeline one type to write. It holds
// no reader, no writer and no SQL — issue #25 (`runScan`, `assembleReport`,
// `storeCurrentReport`) supplies those against this shape.
//
// **Three sections are declared here and will be imported later.** BP-025
// owns the AI-answers card (`src/lib/market/questions/matrix.ts`, issue
// #26) and BP-026 the presence card (`src/lib/market/rivals/presence.ts`,
// issue #27); neither leaf exists yet. Rather than invent a second,
// differently-named shape inside the surface, the three sections take
// those interfaces' declared members verbatim, in one place, with the leaf
// that will own each named beside it. When #26/#27 land, the declaration
// here becomes a re-export of theirs and no consumer changes — the members
// are already the ones those blueprints state.
//
// Nothing here is optional-by-accident: a section that could not be
// produced is `null`, which the screen renders as a named absent section
// with one written line (REQ-004 c10/c11), never as an empty card and
// never as a spinner.
import type { AI_READER_AGENTS } from "@/lib/config/constants";
import type { Measured } from "@/lib/measure/measured";
import type { GeneratedText } from "@/lib/presentation/generated";
import type { Verdict } from "@/lib/measure/verdict";

/** One cell of the AI-answers matrix — one question, one measured SERP.
 *  BP-025 `## Public interface` (issue #26's `matrix.ts` owns it). An
 *  `unmeasured` cell lowers the denominator and is never counted as a
 *  place the customer was ignored. */
export type AnswerCell =
  | { kind: "answered"; citedDomains: readonly string[]; namesCustomer: boolean }
  | { kind: "no_answer" }
  | { kind: "unmeasured"; reason: "undeterminable" | "not_attempted" };

/** One of the twelve tracked questions, as the report stores it. `wording`
 *  is model text and therefore a `GeneratedText`: the screen reaches it
 *  only through `renderQuestion`, which refuses to yield the wording
 *  without the search it came from (REQ-093 c3).
 *
 *  No `volume` member. The owner removed per-question `{vol}/mo` on
 *  2026-09-03; a field that does not exist cannot be rendered by mistake. */
export interface StoredQuestion {
  /** 1-based, the number the list shows beside the question. */
  n: number;
  wording: GeneratedText;
  /** The search this question was derived from (REQ-006 c9). */
  search: string;
  /** The brands the AI answer named, in the order the answer named them. */
  namedBrands: readonly string[];
}

/** BUILD §4.1 module 2, left card. BP-025's `AiAnswersCard`, plus the
 *  measurement date the source chip shows. */
export interface AiAnswersSection {
  /** n — the denominator: searches whose AI answer could be read at all. */
  measuredSearches: number;
  /** m of n — searches an AI answer actually appeared on. */
  answeredSearches: number;
  /** Counted over m, never over n. */
  customerCitations: number;
  measuredAt: Date;
  /** The customer's own domain, so the matrix can label its own row. */
  ownDomain: string;
  /** Rival rows of the dot matrix, in the order the presence card orders
   *  them; one cell per row per question. */
  rivals: readonly { domain: string; cells: readonly AnswerCell[] }[];
  rows: readonly { question: StoredQuestion; cell: AnswerCell }[];
}

/** BUILD §4.1 module 2, right card. BP-026's `PresenceCard`, verbatim.
 *
 *  No `totalMonthlyVolume` member: the market-total footnote was removed
 *  by the owner on 2026-09-03, both halves (BP-026 decision 4). No rival
 *  size, band, traffic value or severity member either — the card's
 *  honesty bound is the absence of somewhere to put such a claim. */
export interface PresenceSection {
  measuredSearches: number;
  you: { domain: string; top10Count: number };
  rivals: readonly { domain: string; top10Count: number }[];
  absentFrom: readonly { keyword: string; volume: number; topHolder: string | null }[];
  framing: "shown" | "suppressed_no_rivals";
}

/** BUILD §4.1 module 3's two counts that are not on the verdict. The
 *  third, blocked readers, is `Verdict.blockedReaders` and is not
 *  duplicated here (one measurement, one home). */
export interface SupplySection {
  missingPages: Measured<number>;
  unquotablePages: Measured<number>;
}

/** BUILD §4.1 module 5 — page 1 of N, offered in exchange for an address.
 *  `title` is model text; the screen reaches it through `renderGenerated`
 *  with this page's own identity, never as a bare string. */
export interface FreePageSection {
  opportunityId: string;
  title: GeneratedText;
  slug: GeneratedText;
  /** The search the page targets, and its monthly volume. This volume is
   *  the *page's own target*, which §4.1 module 5 states as a row of the
   *  card; it is not the per-question volume the owner removed from the
   *  12-questions list on 2026-09-03. */
  target: { keyword: string; volume: number };
  /** The rival this page is written to overtake, where there is one. */
  beats: string | null;
  /** The opportunity type, rendered as written by the copy key for it. */
  format: string;
  /** How many pages the scan found in total — "page 1 of {N}". */
  totalPages: number;
}

/** What `GET /scan/{domain}` renders. One date governs the whole blob:
 *  `verdict.measuredAt` — every figure under it is that scan's. */
export interface StoredReport {
  verdict: Verdict;
  /** Which AI readers the home document's access rules block, in the
   *  pinned list's own order. Derived from `AI_READER_AGENTS` here for the
   *  same reason `_problems/unblock.ts` derives its own alias from it: the
   *  type follows the pin, so a seventh agent needs no edit in either
   *  place. `Verdict.blockedReaders` is the *count* of these and stays
   *  where it is — one measurement, two readings, no second count. */
  blockedAgents: readonly (typeof AI_READER_AGENTS)[number][];
  /** The market category the profile inferred, shown beside the score. */
  category: string | null;
  aiAnswers: AiAnswersSection | null;
  presence: PresenceSection | null;
  supply: SupplySection;
  freePage: FreePageSection | null;
}
