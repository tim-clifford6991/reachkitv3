// src/lib/presentation/copy/keys/overview.ts — BP-020 decision 5, WO-041
//
// Overview's sentences. Three keys seeded (WO-041 step 3): the
// no-presence-yet lines for the weekly-presence chart, week and
// partial-week states. Empty value, owner-owed — no string is written here
// (constitution §1). The block that owns Overview fills every other
// sentence this surface needs.
//
// 2026-09-05: issue #9 (BUILD §4.4) adds `overview.head` — the one written
// line this screen states inside the app shell until its own content lands
// (issue #15, §4.5). Owner-owed and empty: it is a customer-visible sentence
// (constitution §1).
import type { CopyPartition } from "../registry.ts";

export const OVERVIEW_COPY = Object.freeze({
  "place.overview.weekly-presence.chart": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-041 c3" },
  ],
  "place.overview.weekly-presence.week": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-065 c3" },
  ],
  "place.overview.weekly-presence.partial-week": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-065 c4" },
  ],
  "overview.head": ["", { slots: {}, fixedBy: "BUILD §4.5" }],
}) satisfies CopyPartition;
