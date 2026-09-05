// src/lib/presentation/copy/keys/laws.ts — BP-020 decision 5, WO-041
//
// The sentences the cross-cutting laws are made of, which no single surface
// owns: the five stopped-work lines, the five next-publish lines and the
// two generated-page lines (WO-041 step 3). Empty value, owner-owed — no
// string is written here (constitution §1). BP-019 decision 6 adds a
// fourth law's three keys later (WO-249); this file seeds only these
// twelve.
//
// 2026-09-04: the owner ruled on three of the twelve (WO-041 `## Log`,
// this date's ruling) — `stopped.work.line`, `stopped.work.needs-nothing`
// and `next-publish.scheduled` — filled verbatim, byte for byte, and no
// longer owner-owed. The remaining nine were not part of this ruling and
// stay owner-owed, empty.
//
// 2026-09-04, separately: WO-278 (BP-019 decision 6, WO-249's block) closes
// the fourth cross-cutting law — `law: 'unmeasured'` — with the three keys
// `renderMeasured`'s `unmeasuredLine: CopyKey` argument takes. Two are
// owner-owed and empty (REQ-004 criteria 6 and 9's own written lines are
// the owner's, constitution §1); the third, `unmeasured.dash`, carries a
// value — a transcription of REQ-004's own "—" character, on the same
// footing as the thirteen band words, and the reason no dash literal
// appears anywhere in `src/lib/presentation/`.
//
// 2026-09-04, separately again: WO-287 (owner ruling 2026-09-04, sheet 2 —
// `registry/evidence/RULING-copy-2026-09-04.json`) fills
// `unmeasured.undeterminable` and `unmeasured.not-attempted`, filled
// verbatim, byte for byte; neither is owner-owed any longer. Each declares
// one `what: "text"` slot — the subject that could not be measured — the
// slot the ruled sentence itself takes; `renderMeasured` (BP-019,
// `src/lib/presentation/measured.ts`) gains the matching options member
// to supply it. `unmeasured.dash` is untouched.
//
// 2026-09-05, separately again: issue #9 (BUILD §4.4, REQ-040) adds the
// seven `shell.*` keys the app shell speaks on every app screen — sentences
// no single screen owns, which is why they sit here beside the
// `next-publish.*` family the same shell renders. Two are owner-owed and
// empty (REQ-040 c6's week line and c7's not-measured line are written
// sentences and therefore the owner's, constitution §1). Five carry a
// value, and every one of them is a **transcription** of a word `BUILD.md`
// itself prints, on the same footing as the thirteen band words: §4.4's
// "nav **Overview / Calendar / Settings**" and §4.3's "Autopilot (default,
// selected) vs Copilot". Nothing here is composed.
import type { CopyPartition } from "../registry.ts";

export const LAWS_COPY = Object.freeze({
  "stopped.work.line": ["ReachKit stopped its own work today, so no page was written. Nothing about your market changed.", { law: "stopped-work", slots: {}, fixedBy: "REQ-092 c1" }],
  "stopped.work.needs-nothing": [
    "Nothing is needed from you — ReachKit picks up again on its own.",
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
    "Next page goes live {at}",
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
  "unmeasured.undeterminable": ["{what} couldn’t be measured — nothing came back that could be read.", { law: "unmeasured", slots: { what: "text" }, fixedBy: "REQ-004 c6" }],
  "unmeasured.not-attempted": ["{what} wasn’t measured — the scan stopped early, before it got there.", { law: "unmeasured", slots: { what: "text" }, fixedBy: "REQ-004 c9" }],
  "unmeasured.dash": ["—", { law: "unmeasured", slots: {}, fixedBy: "REQ-004 c2" }],
  "shell.nav.overview": ["Overview", { slots: {}, fixedBy: "REQ-040 c1" }],
  "shell.nav.calendar": ["Calendar", { slots: {}, fixedBy: "REQ-040 c1" }],
  "shell.nav.settings": ["Settings", { slots: {}, fixedBy: "REQ-040 c1" }],
  "shell.publishing.mode.autopilot": ["Autopilot", { slots: {}, fixedBy: "REQ-040 c3" }],
  "shell.publishing.mode.copilot": ["Copilot", { slots: {}, fixedBy: "REQ-040 c3" }],
  "shell.domain.measured-weeks": [
    "",
    { slots: { weeks: "text", on: "date" }, fixedBy: "REQ-040 c6" },
  ],
  "shell.domain.not-measured": [
    "",
    { slots: { due: "date" }, fixedBy: "REQ-040 c7" },
  ],
}) satisfies CopyPartition;
