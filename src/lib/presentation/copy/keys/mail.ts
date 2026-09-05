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

  // 2026-09-05, issue #30 (the mail seam, BUILD §12). Six keys the shell
  // and the whole-mail line need. Five are owner-owed and empty: every one
  // of them is a sentence the product speaks in its own voice, so none is
  // written here (constitution §1 / CLAUDE.md "never invent copy"). The
  // sixth is the product's own name, transcribed — not a sentence, on the
  // same footing as `unmeasured.dash`'s "—" and `removal.address`.
  //
  // Note on the empty five: `copy()` throws on an owner-owed key, so a
  // mail that would carry one of these lines fails loudly at compose time
  // rather than shipping an empty line to a customer. That is the intended
  // behaviour and `tests/mail/shell/whole-mail-line.test.ts` asserts it,
  // written so it keeps discriminating once the owner fills them.
  "mail.shell.wordmark": ["ReachKit", { slots: {}, fixedBy: "§12" }],
  "mail.nothing_to_report": ["", { slots: {}, fixedBy: "§12" }],
  "mail.week_unmeasured": ["", { slots: { nextDue: "date" }, fixedBy: "§12" }],
  "mail.week_partly_measured": ["", { slots: { sections: "text" }, fixedBy: "§12" }],
  "mail.unsubscribe.label": ["", { slots: {}, fixedBy: "§12" }],
  "mail.optout.label": ["", { slots: {}, fixedBy: "§12" }],
}) satisfies CopyPartition;
