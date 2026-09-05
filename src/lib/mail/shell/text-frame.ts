// BUILD §12 — the plain-text twin of the same frame.
//
// Same three bands, same order: wordmark, body (blocks then the whole-mail
// line), footer. The opt-out is written out as a labelled URL — never a
// bare URL with nothing saying what it is. Like `frame.ts`, this file
// authors no sentence: every string arrives rendered from `compose.ts`.
import type { FrameParts } from "./frame";

/** The rule between the body and the footer. Layout, not voice — the
 *  plain-text equivalent of the card's bottom edge. */
const FOOTER_RULE = "—".repeat(24);

export interface TextFrameParts extends Omit<FrameParts, "rows"> {
  /** The block body, already rendered by `renderBlocksText`. */
  body: string;
}

export function frameText(parts: TextFrameParts): string {
  const bands: string[] = [parts.wordmark];

  const body = parts.wholeMailLine === null ? parts.body : [parts.body, parts.wholeMailLine].filter((s) => s !== "").join("\n\n");
  if (body !== "") bands.push(body);

  if (parts.optOut !== null) {
    bands.push([FOOTER_RULE, `${parts.optOut.label}: ${parts.optOut.href}`].join("\n"));
  }

  return bands.join("\n\n");
}
