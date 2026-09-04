// src/lib/presentation/copy/keys/report.ts — BP-020 decision 5, WO-041; the
// eight landing keys added by WO-070.
//
// The report surface's sentences. One key seeded (WO-041 step 3): the
// no-presence-yet line for the first page of the rival list. Empty value,
// owner-owed — no string is written here (constitution §1: customer-visible
// strings are the owner's). The block that owns the report surface fills
// every other sentence this surface needs.
//
// WO-070 adds the landing page's eight keys here rather than in a
// thirteenth partition (constitution rule 2.2/BP-020 decision 5's own
// reasoning, applied the same way WO-249 applied it to `laws.ts`): BP-022
// is "the leaf that owns the landing field, the report address, and
// everything that decides what loads there" (BP-022 `## Responsibility`)
// — one node, one partition file, so the landing headline, field label,
// submit label and the five `DomainProblem` lines (`src/lib/scan/domain.ts`,
// WO-051) sit beside the one key this surface already owned.
//
// 2026-09-03: the owner ruled on the headline, field label and submit
// label (WO-070 `## Log`, "landing copy approved"; strings per `BUILD.md`
// §3) — those three are filled verbatim, byte for byte, and no longer
// owner-owed.
//
// 2026-09-04: the owner ruled on the five `DomainProblem` lines (WO-070
// `## Log`, this date's ruling) — filled verbatim, byte for byte. All
// eight landing keys are now supplied; none is owner-owed. No `law` tag
// on any of the eight: none of `CopyMeta.law`'s four cross-cutting arms
// names this surface.
//
// 2026-09-04, separately: the owner also ruled on this file's other key,
// `place.report.first-page.rival` (WO-041 `## Log`, this date's ruling) —
// filled verbatim, byte for byte. Every key this partition declares now
// has a string; none is owner-owed.
//
// 2026-09-04, separately again: WO-278 (BP-024 decision 6, rule 1.1 — see
// `## Decision taken under rule 1.1`) adds the three `verdict.limiting.*`
// keys `LIMITING_LINES` (`src/lib/presentation/bands.ts`) resolves — one
// per `ScoreFactorName`. They ship owner-owed and empty: the one written
// line REQ-004 criterion 2 requires is a customer-visible string and
// therefore the owner's (constitution §1). No sentence is written here.
//
// 2026-09-04, separately again: WO-287 (owner ruling 2026-09-04, sheet 2 —
// `registry/evidence/RULING-copy-2026-09-04.json`) fills the three
// `verdict.limiting.*` values above, filled verbatim, byte for byte; none
// is owner-owed any longer. The same ruling adds thirteen new keys for the
// report address's own sentences — `removal.*`, `notice.*`, `control.*`
// and `copy-link.label` — the gap the design-guardian named on WO-282's
// v1 preview (its `## Log`, 2026-09-04 preview line). They land in this
// partition rather than a thirteenth (constitution rule 2.2/BP-020
// decision 5, the same reasoning WO-070 and WO-249 already applied here
// and to `laws.ts`): BP-022 owns the report address, and `report.ts` is
// its partition. No `law` tag on any of the thirteen: none of
// `CopyMeta.law`'s four cross-cutting arms names this surface.
import type { CopyPartition } from "../registry.ts";

export const REPORT_COPY = Object.freeze({
  "verdict.limiting.foundations": ["What holds your score down most: the foundations — how your site is built and how easily it can be read.", { slots: {}, fixedBy: "REQ-004 c2" }],
  "verdict.limiting.answerability": ["What holds your score down most: answerability — how well your pages answer the questions buyers actually ask.", { slots: {}, fixedBy: "REQ-004 c2" }],
  "verdict.limiting.presence": ["What holds your score down most: presence — how often you appear where buyers look, in Google and in AI answers.", { slots: {}, fixedBy: "REQ-004 c2" }],
  "removal.address": ["remove@reachkit.app", { slots: {}, fixedBy: "REQ-002 c1" }],
  "removal.line.on-report": ["Own this site and want this report taken down? Write to {address}.", { slots: { address: "text" }, fixedBy: "REQ-002 c1" }],
  "removal.line.removed": ["This report was removed at the site owner’s request. To make {domain} scannable again, write to {address}.", { slots: { domain: "text", address: "text" }, fixedBy: "REQ-002 c3" }],
  "notice.incomplete": ["This report is incomplete — {what} wasn’t measured.", { slots: { what: "text" }, fixedBy: "REQ-001 c14" }],
  "notice.measurement-failed": ["The last measurement didn’t finish, so nothing new was stored.", { slots: {}, fixedBy: "REQ-001 c16" }],
  "notice.correction-failed": ["The correction didn’t finish — this is the report from before it.", { slots: {}, fixedBy: "REQ-094 c7" }],
  "notice.refused.network-limit": ["That’s five scans from your network in the last hour — you can scan again in {wait}.", { slots: { wait: "text" }, fixedBy: "REQ-003 c6" }],
  "notice.refused.scan-running": ["A scan is already running from your network. It finishes in about {wait}, then this one can start.", { slots: { wait: "text" }, fixedBy: "REQ-003 c7" }],
  "control.rescan-age": ["Measure again", { slots: {}, fixedBy: "REQ-001 c15" }],
  "control.rescan-incomplete": ["Measure what’s missing", { slots: {}, fixedBy: "REQ-001 c14" }],
  "control.retry": ["Try again", { slots: {}, fixedBy: "REQ-001 c16" }],
  "control.correction-retry": ["Try the correction again", { slots: {}, fixedBy: "REQ-094 c7" }],
  "copy-link.label": ["Copy link", { slots: {}, fixedBy: "REQ-001 c7" }],
  "place.report.first-page.rival": [
    "No rival holds this ground yet",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-010 c1" },
  ],
  "landing.headline": [
    "See what AI tells buyers about your market — and write your way in.",
    { slots: {}, fixedBy: "REQ-001 c1" },
  ],
  "landing.field.label": ["Your website", { slots: {}, fixedBy: "REQ-001 c1" }],
  "landing.submit.label": ["Scan my site", { slots: {}, fixedBy: "REQ-001 c1" }],
  "landing.problem.empty": ["Type your website’s address first — for example, example.com.", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.not-a-hostname": ["That doesn’t look like a website address. Try the form example.com.", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.ip-literal": ["That’s a numeric address, not a website name. Type the name people visit, like example.com.", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.no-public-suffix": ["That address is missing its ending — try example.com rather than example.", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.too-long": ["That’s longer than any website address can be — check for extra text pasted in.", { slots: {}, fixedBy: "REQ-001 c3" }],
}) satisfies CopyPartition;
