// src/jobs/publish-verify.ts — BUILD §11
//
// "`publish/verify` · +24h · Liveness checks." The delay is declared on the
// trigger (`PUBLISH_VERIFY_DELAY_H`) and implemented by the platform in
// `client.ts`; this body does not sleep and holds no timer.
//
// **Deliberately outside the kill switch's scope.** §11 stops "scan +
// generate + publish"; verification is read-only — it buys nothing and
// writes no page — and stopping it would leave pages published just before
// the stop permanently unchecked. Widening `KILL_SWITCH_SCOPE` to include
// this id is the mutation `tests/jobs/kill-switch.test.ts` fails on.
import { verifyLive } from "@/jobs/engine";
import { PUBLISH_VERIFY_DELAY_H } from "@/lib/config/constants";
import { requiredString } from "./payload";
import type { JobDefinition, Outcome } from "./types";

export const publishVerify: JobDefinition = {
  id: "publish/verify",
  trigger: { kind: "event", event: "publish/verify", afterHours: PUBLISH_VERIFY_DELAY_H },
  idempotencyKey: ["publicationId"],
  async run(input): Promise<Outcome> {
    const publicationId = requiredString(input, "publicationId");
    const result = await verifyLive({ publicationId });
    return "degraded" in result
      ? { outcome: "degraded", subjectId: publicationId, step: result.degraded }
      : { outcome: "ran", subjectId: publicationId };
  },
};
