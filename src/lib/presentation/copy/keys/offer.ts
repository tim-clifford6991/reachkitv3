// src/lib/presentation/copy/keys/offer.ts — BP-020 decision 5, WO-041
//
// The price and offer surfaces' sentences, BP-030 and BP-031 — the
// twelfth partition, added by the planner under constitution rule 1.1 (see
// WO-041 "## Decision taken under rule 1.1", second entry): BP-020
// decision 5 named eleven partitions before the seven BP-001-owned
// surfaces existed, and /pricing's sentences have no module in that list.
// Declared here, where the partition list is written once anyway, so
// registry.ts keeps exactly one author.
//
// Nine keys seeded (WO-041 step 4): BP-030's PRICE_COPY_KEYS (price.*) and
// BP-031's offer.* keys. Empty value, owner-owed — no string is written
// here (constitution §1). The four offer.cadence.*/offer.veto.* keys carry
// a `value` slot: the values are BP-005 pins supplied by BP-031's
// offerTerms(), never written into the sentence here.
//
// 2026-09-04: the owner ruled on seven of the nine (WO-041 `## Log`, this
// date's ruling) — `price.amount`, `price.interval`, `offer.start` and the
// four `offer.cadence.*`/`offer.veto.*` slotted lines — filled verbatim,
// byte for byte, and no longer owner-owed. `price.vat_included` and
// `offer.cancel_self_service` were not part of this ruling and remain
// owner-owed, empty.
import type { CopyPartition } from "../registry.ts";

export const OFFER_COPY = Object.freeze({
  "price.amount": ["€49", { slots: {}, fixedBy: "REQ-022 c1" }],
  "price.vat_included": ["", { slots: {}, fixedBy: "REQ-022 c1" }],
  "price.interval": ["per month, VAT included", { slots: {}, fixedBy: "REQ-022 c1" }],
  "offer.cadence.page": ["One new page written for your site {value}", { slots: { value: "text" }, fixedBy: "REQ-021 c2" }],
  "offer.cadence.measure": ["Your findability re-measured {value}", { slots: { value: "text" }, fixedBy: "REQ-021 c2" }],
  "offer.cadence.movement": ["What moved, in your inbox {value}", { slots: { value: "text" }, fixedBy: "REQ-021 c2" }],
  "offer.veto.window": ["Every page waits {value} for you to stop it before it goes live — and you can cancel any time, yourself", { slots: { value: "text" }, fixedBy: "REQ-021 c2" }],
  "offer.cancel_self_service": ["", { slots: {}, fixedBy: "REQ-021 c2" }],
  "offer.start": ["Start ReachKit", { slots: {}, fixedBy: "REQ-021 c4" }],
}) satisfies CopyPartition;
