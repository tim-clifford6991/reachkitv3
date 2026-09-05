// src/jobs/publish-execute.ts — BUILD §11
//
// "`publish/execute` · on approve/expiry · State machine → destination."
// The event carries the draft and the destination; this file calls the
// state machine once and reports what it said. The at-most-once guarantee
// is the `publications` row plus the destination-side marker (ADR-080) and
// the `(draft_id, destination_id)` constraint behind them — none of which
// is re-implemented here. The same pair is this job's idempotency key, so
// two deliveries of one approval publish once.
//
// In the kill switch's scope.
import { publishApproved } from "@/jobs/engine";
import { requiredString } from "./payload";
import type { JobDefinition, Outcome } from "./types";

export const publishExecute: JobDefinition = {
  id: "publish/execute",
  trigger: { kind: "event", event: "publish/execute" },
  idempotencyKey: ["draftId", "destinationId"],
  async run(input): Promise<Outcome> {
    const draftId = requiredString(input, "draftId");
    const result = await publishApproved({
      draftId,
      destinationId: requiredString(input, "destinationId"),
    });
    return "degraded" in result
      ? { outcome: "degraded", subjectId: draftId, step: result.degraded }
      : { outcome: "ran", subjectId: draftId };
  },
};
