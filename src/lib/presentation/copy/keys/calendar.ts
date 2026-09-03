// src/lib/presentation/copy/keys/calendar.ts — BP-020 decision 5, WO-041
//
// The calendar's sentences. Three keys seeded (WO-041 step 3): the
// no-presence-yet line for a date carrying no page, and the two cause
// lines. Empty value, owner-owed — no string is written here (constitution
// §1). The block that owns the calendar fills every other sentence this
// surface needs.
import type { CopyPartition } from "../registry.ts";

export const CALENDAR_COPY = Object.freeze({
  "place.calendar.date.page": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-043 c5" },
  ],
  "cause.unrecognised": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-043 c4" },
  ],
  "cause.supply-exhausted": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-043 c3" },
  ],
}) satisfies CopyPartition;
