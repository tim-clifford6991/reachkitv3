// src/lib/presentation/copy/keys/mail.ts — BP-020 decision 5, WO-041
//
// The mail seam's sentences, BP-016 and BP-029. Two keys seeded (WO-041
// step 4): the opt-out confirmation and invalid-token lines. Empty value,
// owner-owed — no string is written here (constitution §1). BP-029 owns
// the opt-out surface and lives in src/lib/mail/leads/**, so this is
// already the right module for its two lines; no thirteenth partition is
// needed for them.
//
// 2026-09-04: the owner ruled on both (WO-041 `## Log`, this date's
// ruling) — filled verbatim, byte for byte. Neither is owner-owed any
// more.
import type { CopyPartition } from "../registry.ts";

export const MAIL_COPY = Object.freeze({
  "optout.confirmed": ["You’re unsubscribed. ReachKit won’t email you again — about this site or any other.", { slots: {}, fixedBy: "REQ-011 c3" }],
  "optout.invalid": ["That unsubscribe link isn’t valid any more. Reply to any ReachKit email with \"stop\" and we’ll stop by hand.", { slots: {}, fixedBy: "REQ-011 c3" }],
}) satisfies CopyPartition;
