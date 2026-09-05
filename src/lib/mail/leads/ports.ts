// BUILD §4.2 — the two things this feature reads and does not own.
//
// The giveaway needs a page to offer and a page to write, and neither is
// this node's: the opportunity engine (`src/lib/opportunities/**`, §7,
// issue #40) decides what is worth writing and in what order, and the
// draft pipeline (`src/lib/generation/**`, §8, issue #44) writes it.
// Neither module exists yet. Rather than reimplement either behind a
// private helper — which is how a second ranking and a second writer get
// into a codebase — each is a **declared port** here, with the narrowest
// shape this feature reads, and each is filled by its owner calling the
// register function below.
//
// Both defaults are honest about being unfilled. The draft writer's says
// no page could be written, which is true: with no pipeline, none can, and
// `deliverFirstPage` turns that into the written message REQ-010 criterion
// 7 owes the founder rather than into a silent nothing. The offer reader's
// default is real — it projects the `opportunities` rows the scan already
// stores — and is honest about the one thing it borrows: see its own note.
import { measured, measuredZero, unmeasured, type Measured } from "@/lib/measure/measured";
import { leadStore } from "./store";

/** What the report's free-page card and the giveaway mail both read. The
 *  six facts BP-029's `firstPageOffer()` returns, before the `offered`
 *  discriminant is put on them.
 *
 *  `format` is a plain string, deliberately. §7's eight-member closed enum
 *  is the opportunity engine's to declare (`OpportunityType`), and a second
 *  copy of it here would be the copy that goes stale. This feature never
 *  branches on the value — it carries it to the card and no further — so it
 *  needs the value, not the union, and issue #40 narrows this field to its
 *  own type when it lands. */
export interface OfferedPage {
  readonly title: string;
  readonly pagesFound: number;
  readonly targetQuery: string;
  readonly volume: Measured<number>;
  readonly rival: Measured<string>;
  readonly format: string;
}

/** The first page a scan would have written, or `null` where the scan
 *  derived none worth writing. Never throws; `'unreadable'` is its own
 *  answer, because "we could not look" is not "there is nothing". */
export type OfferReader = (
  scanId: string
) => Promise<{ read: true; page: OfferedPage | null } | { read: false }>;

/** The page itself. One call per lead, ever — the guard is
 *  `giveaway.ts`'s, because it is a fact about the lead row, not about
 *  this port. `refused` distinguishes §8's hard rules and claim check
 *  turning a page down from the pipeline failing to produce one: REQ-010
 *  criterion 7 owes the founder the cause, and those are two causes. */
export type DraftWriter = (a: {
  leadId: string;
  scanId: string;
  page: OfferedPage;
}) => Promise<
  | { written: true; title: string; markdown: string }
  | { written: false; refused: boolean }
>;

// ── The offer reader ────────────────────────────────────────────────────
//
// **What this default borrows, said plainly.** BP-029 has this function
// take "the top-ranked open opportunity (BP-013's ranking, not a ranking of
// its own)". That ranking is issue #40's and does not exist, and the
// `opportunities` table carries no rank column to read it from. So this
// default takes the scan's open opportunities in the order the engine
// wrote them, which is the order it derived them in — it invents no
// ordering, weighs nothing and scores nothing. When #40 lands it registers
// its own reader here and this default is deleted; until then the offer is
// the engine's first row rather than the engine's best row, and the
// difference is flagged in this feature's PR rather than hidden behind a
// helper named `rank`.

interface OpportunityRow {
  readonly title: string;
  readonly target_query: string;
  readonly volume: number | null;
  readonly type: string;
  readonly evidence: { rival?: unknown } | null;
  readonly created_at: string;
}

/** `volume` is nullable in the schema and the three arms are not the same
 *  fact: a real number, a real zero, and a scan that could not determine
 *  one. Null becomes `undeterminable` — the engine looked and got no
 *  answer — never a substituted 0 (REQ-004 c12). */
function volumeOf(row: OpportunityRow, at: Date): Measured<number> {
  if (row.volume === null) return unmeasured("undeterminable", at);
  return row.volume === 0 ? measuredZero(0, at) : measured(row.volume, at);
}

/** REQ-091 criterion 3: a page found without a rival to name says so,
 *  rather than standing blank or naming an invented one. The unmeasured arm
 *  is how it says so, and it travels all the way to the card. */
function rivalOf(row: OpportunityRow, at: Date): Measured<string> {
  const rival = row.evidence?.rival;
  return typeof rival === "string" && rival !== ""
    ? measured(rival, at)
    : unmeasured("undeterminable", at);
}

const defaultOfferReader: OfferReader = async (scanId) => {
  const read = await leadStore().openOpportunitiesForScan(scanId);
  if (!read.ok) return { read: false };

  const rows = read.rows as readonly OpportunityRow[];
  if (rows.length === 0) return { read: true, page: null };

  const first = rows[0] as OpportunityRow;
  const at = new Date(first.created_at);
  return {
    read: true,
    page: {
      title: first.title,
      pagesFound: rows.length,
      targetQuery: first.target_query,
      volume: volumeOf(first, at),
      rival: rivalOf(first, at),
      format: first.type,
    },
  };
};

/** Issue #44's pipeline is not built, so no page can be written. Saying so
 *  is the honest answer and is not a refusal: `refused: false` means the
 *  pipeline could not produce a page, which maps to `writing-failed` and
 *  the written message the founder is owed. */
const draftWriterNotWiredYet: DraftWriter = async () => {
  console.warn(
    JSON.stringify({
      event: "lead_draft_writer_unwired",
      detail: "no generateDraft() is registered — §8 (issue #44) has not landed",
    })
  );
  return { written: false, refused: false };
};

let offerReader: OfferReader = defaultOfferReader;
let draftWriter: DraftWriter = draftWriterNotWiredYet;

/** Wired by the opportunity engine (#40); `null` restores the default
 *  above, which reads the same rows in the engine's own write order. */
export function registerOfferReader(reader: OfferReader | null): void {
  offerReader = reader ?? defaultOfferReader;
}

/** Wired by the draft pipeline (#44); `null` restores the unwired default,
 *  which writes no page and says so. */
export function registerDraftWriter(writer: DraftWriter | null): void {
  draftWriter = writer ?? draftWriterNotWiredYet;
}

export function readOffer(scanId: string): ReturnType<OfferReader> {
  return offerReader(scanId);
}

export function writeDraft(a: Parameters<DraftWriter>[0]): ReturnType<DraftWriter> {
  return draftWriter(a);
}
