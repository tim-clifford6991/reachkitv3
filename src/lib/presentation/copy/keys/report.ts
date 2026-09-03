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
// WO-051) sit beside the one key this surface already owned. All seven are
// **owner-owed and empty**, exactly on WO-041's terms: `copy()` throws
// naming the key until the owner supplies the sentence (constitution §1 —
// customer-visible strings are the owner's, and WO-070's own file plan
// renders keys, never wording it invents). No `law` tag: none of
// `CopyMeta.law`'s four cross-cutting arms names this surface.
import type { CopyPartition } from "../registry.ts";

export const REPORT_COPY = Object.freeze({
  "place.report.first-page.rival": [
    "",
    { law: "no-presence-yet", slots: {}, fixedBy: "REQ-010 c1" },
  ],
  "landing.headline": ["", { slots: {}, fixedBy: "REQ-001 c1" }],
  "landing.field.label": ["", { slots: {}, fixedBy: "REQ-001 c1" }],
  "landing.submit.label": ["", { slots: {}, fixedBy: "REQ-001 c1" }],
  "landing.problem.empty": ["", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.not-a-hostname": ["", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.ip-literal": ["", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.no-public-suffix": ["", { slots: {}, fixedBy: "REQ-001 c3" }],
  "landing.problem.too-long": ["", { slots: {}, fixedBy: "REQ-001 c3" }],
}) satisfies CopyPartition;
