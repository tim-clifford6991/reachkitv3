// src/lib/presentation/generated/text.ts — BP-020, WO-279 (supersedes WO-043)
//
// Model output, wrapped at the point it is read out of storage. An
// unwrapped string is the product's own voice by construction: `fromStored`
// is the only constructor of `GeneratedText`, no overload accepts a literal
// and no widening cast appears in this file — a hand-written sentence
// cannot be laundered into the generated arm to escape REQ-093 criterion 1.
//
// `renderGenerated` is the one sink for model text (REQ-093 criterion 2):
// it cannot be called without the identity of the page the text belongs
// to, and it returns the label and the text as one value, so a caller
// cannot render the text and drop the label. This file imports nothing
// under `src/lib/llm/` — REQ-093 criterion 5 holds because nothing here
// ever reaches for a model at render time; `renderGenerated` renders
// whatever `fromStored` read from storage, untouched.
import { copy } from "@/lib/presentation/copy";

/** The seven stored columns a language model can produce (BP-020 `## Public
 *  interface`). `tests/presentation/generated/flow-gate.test.ts` gates
 *  every value read from one of these against reaching a surface any other
 *  way than through `renderGenerated` or `renderQuestion`. */
export type GeneratedColumn =
  | "drafts.body"
  | "drafts.title"
  | "drafts.slug"
  | "drafts.description"
  | "opportunities.proposed_title"
  | "opportunities.proposed_slug"
  | "questions.wording";

/** Model output, wrapped at the point it is read out of storage. */
export interface GeneratedText {
  readonly source: "model";
  readonly text: string;
}

/** The only constructor of a `GeneratedText`. No overload accepts a literal
 *  and no widening cast appears in this file — a model string cannot
 *  arrive without declaring which column it came from. */
export function fromStored(column: GeneratedColumn, value: string): GeneratedText {
  return Object.freeze({ source: "model", text: value });
}

/** REQ-093 criterion 2. A written page carries all four fields; a proposed
 *  page carries a title and a slug and has no description arm at all — the
 *  requirement admits none, so none is representable. */
export type PageIdentity =
  | {
      state: "written";
      pageId: string;
      title: GeneratedText;
      slug: GeneratedText;
      body: GeneratedText;
      description?: GeneratedText;
    }
  | {
      state: "proposed";
      opportunityId: string;
      title: GeneratedText;
      slug: GeneratedText;
    };

/** One label producer (rule 7.1): both `renderGenerated` and
 *  `generatedLabel` delegate here, so there is exactly one place that
 *  chooses between the two `generated.page.*` keys. */
function labelFor(pageTitle: string, written: boolean): string {
  return written
    ? copy("generated.page.written", { pageTitle })
    : copy("generated.page.proposed", { pageTitle });
}

/** The one sink for model text. It cannot be called without the identity of
 *  the page the text belongs to, and it returns the label and the text as
 *  one value, so a caller cannot render the text and drop the label.
 *  `text` is returned untruncated — the decision to truncate belongs to
 *  the surface (BP-020 `## Error & edge behavior`, tenth bullet). */
export function renderGenerated(
  field: GeneratedText,
  page: PageIdentity
): { label: string; text: string; proposed: boolean } {
  const proposed = page.state === "proposed";
  return { label: labelFor(page.title.text, !proposed), text: field.text, proposed };
}

/** BP-019's declared helper, unchanged: the label alone, for a caller that
 *  already holds a `renderGenerated` result and needs its label
 *  separately. */
export function generatedLabel(a: { pageTitle: string; written: boolean }): { label: string } {
  return { label: labelFor(a.pageTitle, a.written) };
}
