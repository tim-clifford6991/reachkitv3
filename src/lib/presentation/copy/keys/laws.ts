// src/lib/presentation/copy/keys/laws.ts — BP-020 decision 5, WO-041
//
// The sentences the cross-cutting laws are made of, which no single surface
// owns: the five stopped-work lines, the five next-publish lines and the
// two generated-page lines (WO-041 step 3). Empty value, owner-owed — no
// string is written here (constitution §1). BP-019 decision 6 adds a
// fourth law's three keys later (WO-249); this file seeds only these
// twelve.
import type { CopyPartition } from "../registry.ts";

export const LAWS_COPY = Object.freeze({
  "stopped.work.line": ["", { law: "stopped-work", slots: {}, fixedBy: "REQ-092 c1" }],
  "stopped.work.needs-nothing": [
    "",
    { law: "stopped-work", slots: {}, fixedBy: "REQ-092 c2" },
  ],
  "stopped.work.resumes-on": [
    "",
    { law: "stopped-work", slots: { date: "date" }, fixedBy: "REQ-092 c4" },
  ],
  "stopped.work.no-time-promised": [
    "",
    { law: "stopped-work", slots: {}, fixedBy: "REQ-092 c4" },
  ],
  "stopped.work.partial-pass": [
    "",
    { law: "stopped-work", slots: {}, fixedBy: "REQ-092 c6" },
  ],
  "next-publish.stopped": ["", { law: "next-publish", slots: {}, fixedBy: "REQ-092 c7" }],
  "next-publish.scheduled": [
    "",
    { law: "next-publish", slots: { at: "date" }, fixedBy: "REQ-040 c4" },
  ],
  "next-publish.paused": ["", { law: "next-publish", slots: {}, fixedBy: "REQ-040 c4" }],
  "next-publish.nothing-approved": [
    "",
    { law: "next-publish", slots: {}, fixedBy: "REQ-040 c4" },
  ],
  "next-publish.none-planned": [
    "",
    { law: "next-publish", slots: {}, fixedBy: "REQ-040 c4" },
  ],
  "generated.page.written": [
    "",
    { slots: { pageTitle: "text" }, fixedBy: "REQ-093 c2" },
  ],
  "generated.page.proposed": [
    "",
    { slots: { pageTitle: "text" }, fixedBy: "REQ-093 c2" },
  ],
}) satisfies CopyPartition;
