// src/jobs/run.ts — BUILD §11
//
// The one path every invocation takes: the kill-switch guard, then the
// body, then the log line. The guard lives here rather than inside each of
// the seven definitions so "before any spend and before any write" is a
// structural property of the runner — a new job cannot forget it, and the
// first unguarded job is not the one with no kill switch.
//
// A body that throws is logged as `failed` and rethrown: the platform's
// own retry and its dashboard are what a failure is for, and swallowing it
// here would turn a broken engine into a silent success.
import { stoppedByKillSwitch } from "./kill-switch";
import { recordInvocation } from "./observability";
import type { JobDefinition, JobInput, Outcome } from "./types";

export async function runJob(definition: JobDefinition, input: JobInput): Promise<Outcome> {
  const started = Date.now();

  if (stoppedByKillSwitch(definition.id)) {
    const outcome: Outcome = { outcome: "stopped", subjectId: null, by: "kill-switch" };
    recordInvocation({
      jobId: definition.id,
      subjectId: null,
      outcome: "stopped",
      durationMs: Date.now() - started,
    });
    return outcome;
  }

  try {
    const outcome = await definition.run(input);
    recordInvocation({
      jobId: definition.id,
      subjectId: outcome.subjectId,
      outcome: outcome.outcome,
      durationMs: Date.now() - started,
      ...(outcome.outcome === "degraded" ? { step: outcome.step } : {}),
    });
    return outcome;
  } catch (error) {
    recordInvocation({
      jobId: definition.id,
      subjectId: null,
      outcome: "failed",
      durationMs: Date.now() - started,
    });
    throw error;
  }
}
