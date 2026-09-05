// src/lib/presentation/copy/keys/settings.ts — BP-020 decision 5, WO-041
//
// Settings' sentences. Empty on purpose: WO-041 seeds no string here. The
// block that owns Settings fills this file and touches no other partition.
//
// 2026-09-05: issue #9 (BUILD §4.4) adds `settings.head` — the one written
// line this screen states inside the app shell until its own content lands
// (issue #18, §4.7). Owner-owed and empty: it is a customer-visible sentence
// (constitution §1).
import type { CopyPartition } from "../registry.ts";

export const SETTINGS_COPY = Object.freeze({
  "settings.head": ["", { slots: {}, fixedBy: "BUILD §4.7" }],
}) satisfies CopyPartition;
