// src/jobs/lead-nurture.ts — BUILD §11
//
// "`lead/nurture` · event + delays · Draft email, then ≤3 touches, stops on
// convert." One delivery is one touch: the event carries which touch it is,
// and `(leadId, touchIndex)` is this job's idempotency key — **per-touch
// dedupe inside a sequence, never the sequence key**. The sequence key
// `(lower(email), domain)` and its partial unique index stay the engine's
// single enforcer and are not re-derived here.
//
// The delays themselves are `NURTURE_H` (24h / 72h / 168h) and the touch
// count is bounded by `NURTURE_MAX_TOUCHES`; a touch beyond the bound is
// refused here rather than handed on, because an at-least-once platform can
// deliver a stale event and a sequence that missed its window is dropped
// forever (ADR-041).
//
// Not in the kill switch's scope: §11 stops scan, generate and publish.
import { advanceSequence } from "@/jobs/engine";
import { NURTURE_H, NURTURE_MAX_TOUCHES } from "@/lib/config/constants";
import { requiredNumber, requiredString } from "./payload";
import type { JobDefinition, Outcome } from "./types";

export const leadNurture: JobDefinition = {
  id: "lead/nurture",
  trigger: { kind: "event", event: "lead/nurture" },
  idempotencyKey: ["leadId", "touchIndex"],
  async run(input): Promise<Outcome> {
    const leadId = requiredString(input, "leadId");
    const touchIndex = requiredNumber(input, "touchIndex");
    if (touchIndex < 0 || touchIndex >= NURTURE_MAX_TOUCHES || touchIndex >= NURTURE_H.length) {
      return { outcome: "skipped", subjectId: leadId, reason: "no-subject" };
    }
    const result = await advanceSequence({ leadId, touchIndex });
    return "degraded" in result
      ? { outcome: "degraded", subjectId: leadId, step: result.degraded }
      : { outcome: "ran", subjectId: leadId };
  },
};
