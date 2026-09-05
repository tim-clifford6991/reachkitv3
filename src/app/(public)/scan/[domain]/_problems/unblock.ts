// BUILD §4.1 module 3 — the lines a founder pastes into their robots file
//
// Composed from the one pinned agent list (`AI_READER_AGENTS`, ADR-022)
// and from no other source. Never from a model, never from a template read
// out of data, never assembled from a report field: a wrong robots line is
// worse than none, so this file's whole output is a function of which
// members of that pin are blocked.
//
// The output order is the pin's, always — the pin is what is iterated, not
// the argument — so two reports blocking the same agents in a different
// order produce byte-identical blocks.
import { AI_READER_AGENTS } from "@/lib/config/constants";

/** Derived from the pin, so the type and the membership cannot drift
 *  apart: a seventh agent added to `constants.ts` needs no edit here. */
export type AiReaderAgent = (typeof AI_READER_AGENTS)[number];

// The two robots.txt directives, and the blank line between records.
// These are protocol tokens read by a crawler, not sentences a person
// reads, so they are not copy keys — the same footing `VERIFY.userAgent`
// stands on in `constants.ts`.
const USER_AGENT_FIELD = "User-agent";
const ALLOW_FIELD = "Allow";
const ALLOW_ALL_PATH = "/";

/** One directive pair per blocked member, in `AI_READER_AGENTS` order,
 *  with a blank line between records — the shape a robots.txt parser
 *  requires. Total: an empty input returns an empty array, even though
 *  `cardsOf` never reaches this function on a zero or unmeasured count. */
export function unblockLines(blocked: readonly AiReaderAgent[]): readonly string[] {
  const wanted = new Set<string>(blocked);
  const lines: string[] = [];
  for (const agent of AI_READER_AGENTS) {
    if (!wanted.has(agent)) continue;
    if (lines.length > 0) lines.push("");
    lines.push(`${USER_AGENT_FIELD}: ${agent}`);
    lines.push(`${ALLOW_FIELD}: ${ALLOW_ALL_PATH}`);
  }
  return lines;
}
