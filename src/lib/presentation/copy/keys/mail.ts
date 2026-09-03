// src/lib/presentation/copy/keys/mail.ts — BP-020 decision 5, WO-041
//
// The mail seam's sentences, BP-016 and BP-029. Two keys seeded (WO-041
// step 4): the opt-out confirmation and invalid-token lines. Empty value,
// owner-owed — no string is written here (constitution §1). BP-029 owns
// the opt-out surface and lives in src/lib/mail/leads/**, so this is
// already the right module for its two lines; no thirteenth partition is
// needed for them.
import type { CopyPartition } from "../registry.ts";

export const MAIL_COPY = Object.freeze({
  "optout.confirmed": ["", { slots: {}, fixedBy: "REQ-011 c3" }],
  "optout.invalid": ["", { slots: {}, fixedBy: "REQ-011 c3" }],
}) satisfies CopyPartition;
