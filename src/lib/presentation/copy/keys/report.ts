// src/lib/presentation/copy/keys/report.ts — BP-020 decision 5, WO-041
//
// The report surface's sentences. One key seeded (WO-041 step 3): the
// no-presence-yet line for the first page of the rival list. Empty value,
// owner-owed — no string is written here (constitution §1: customer-visible
// strings are the owner's). The block that owns the report surface fills
// every other sentence this surface needs.
import type { CopyPartition } from "../registry.ts";

export const REPORT_COPY = Object.freeze({
  "place.report.first-page.rival": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-010 c1" },
  ],
}) satisfies CopyPartition;
