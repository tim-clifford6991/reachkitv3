// BUILD §4.4 — the footer autopilot card's "next publish time", in the state
// where there is none.
//
// REQ-040 criterion 4: "no publish is scheduled — publishing is paused,
// nothing is approved, no page is planned, or ReachKit itself stopped the
// work … in place of a time it carries one written line naming which of
// those is the case; where it was ReachKit that stopped, that line names
// ReachKit's stop as the reason no publish is scheduled (REQ-092 c7) and
// never one of the other three."
//
// ADR-011 (DECISIONS 2026-08-31), verbatim: "One arbiter decides a place's
// single empty-state line over a closed cause union with fixed precedence;
// ReachKit's own stop outranks every other cause that is also true." The
// precedence is data (`NO_PUBLISH_PRECEDENCE`) and the resolver is a
// first-match over it — not a chain of `if`s whose order is whichever one a
// later editor happens to leave on top.
import type { CopyKey } from "@/lib/presentation/copy";

export type NoPublishReason =
  | "reachkit_stopped"
  | "publishing_paused"
  | "nothing_approved"
  | "nothing_planned";

/** REQ-040 c4's four causes in the one order they are ever resolved in.
 *  `reachkit_stopped` is first: REQ-092 c7 requires that where ReachKit
 *  stopped its own work, that is the reason stated, whatever else is also
 *  true. */
export const NO_PUBLISH_PRECEDENCE: readonly NoPublishReason[] = Object.freeze([
  "reachkit_stopped",
  "publishing_paused",
  "nothing_approved",
  "nothing_planned",
] as const);

/** Which of the four causes hold. Every member is required — a cause that
 *  was not established is `false`, stated, never an absent field that reads
 *  the same as "no". */
export type NoPublishCauses = Record<NoPublishReason, boolean>;

/** The line each cause is spoken from. All four keys are BP-019's
 *  `law: 'next-publish'` family; `next-publish.stopped` is the one REQ-092
 *  c7 fixes, and it names ReachKit's stop rather than any internal cause. */
export const NO_PUBLISH_COPY_KEY: Record<NoPublishReason, CopyKey> = {
  reachkit_stopped: "next-publish.stopped",
  publishing_paused: "next-publish.paused",
  nothing_approved: "next-publish.nothing-approved",
  nothing_planned: "next-publish.none-planned",
};

/** First match over `NO_PUBLISH_PRECEDENCE`. `undefined` means no cause
 *  holds at all — which is not "no reason to show" but "a publish is
 *  scheduled", and the caller carries the time instead. */
export function resolveNoPublish(causes: NoPublishCauses): NoPublishReason | undefined {
  return NO_PUBLISH_PRECEDENCE.find((reason) => causes[reason]);
}
