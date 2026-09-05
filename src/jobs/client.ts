// src/jobs/client.ts — BUILD §11
//
// **The platform choice, and the only file that names it.**
//
// `BUILD.md` §1's stack table: "Jobs | **Inngest** (or Vercel cron +
// queue)". Inngest is taken, on §1's own bolding and on what the seven jobs
// need that a bare cron does not: at-least-once delivery with durable
// retry, an idempotency key per delivery, a per-function concurrency bound,
// and a scheduled delay (`publish/verify`'s +24h) that is not a table of
// pending rows this product would otherwise have to grow and sweep itself.
// It adds no dependency — `inngest` is already pinned in `package.json` —
// so the alternative's only advantage does not apply.
//
// Everything platform-shaped lives here: the client, the mapping from a
// neutral `JobDefinition` to a platform function, and the HTTP handler set.
// No other file under `src/jobs/`, and no file under `src/lib/`, names the
// platform — `tests/jobs/registry.test.ts` asserts it. Swapping the
// platform is therefore this file plus the one route that mounts it.
//
// The two bindings the SDK reads for itself — `INNGEST_EVENT_KEY` and
// `INNGEST_SIGNING_KEY` — are deliberately not members of
// `src/lib/config/env.ts`: that schema is `BUILD.md` §15's list, an owner
// file, and its key set is asserted exactly. They are named in the PR under
// "Owner owes" instead.
import { Inngest } from "inngest";
import { serve as serveFunctions } from "inngest/next";
import { runJob } from "./run";
import type { JobDefinition } from "./types";

/** The application id, stable across deployments — renaming it orphans
 *  every function's history, so it is written once, here. */
export const APP_ID = "reachkit";

export const client = new Inngest({ id: APP_ID });

type PlatformFunction = ReturnType<typeof client.createFunction>;

/** The neutral idempotency key (`["draftId", "destinationId"]`) as the
 *  platform's own expression. A job file states field names; only this
 *  function knows what the platform does with them. */
function idempotencyExpression(fields: readonly string[]): string | undefined {
  if (fields.length === 0) return undefined;
  return fields.map((field) => `event.data.${field}`).join(' + "/" + ');
}

function triggerOf(definition: JobDefinition): { event: string } | { cron: string } {
  return definition.trigger.kind === "cron"
    ? { cron: definition.trigger.cron }
    : { event: definition.trigger.event };
}

/** Maps one `JobDefinition` onto the platform. The body is always
 *  `runJob()`, so the kill-switch guard and the one log line are applied to
 *  every job by construction rather than by each definition remembering. */
export function defineJob(definition: JobDefinition): PlatformFunction {
  const idempotency = idempotencyExpression(definition.idempotencyKey);
  const afterHours =
    definition.trigger.kind === "event" ? definition.trigger.afterHours : undefined;

  return client.createFunction(
    {
      id: definition.id.replace("/", "-"),
      name: definition.id,
      triggers: [triggerOf(definition)],
      ...(idempotency === undefined ? {} : { idempotency }),
    },
    async ({ event, step }) => {
      if (afterHours !== undefined) {
        await step.sleep("declared-delay", `${afterHours}h`);
      }
      return step.run("job", () =>
        runJob(definition, {
          data: (event?.data ?? {}) as Readonly<Record<string, unknown>>,
          now: new Date(),
        })
      );
    }
  );
}

/** The HTTP handler set the `/api/jobs` route mounts. It serves exactly the
 *  definitions it is given — an unregistered job is unreachable. */
export function serveJobs(definitions: readonly JobDefinition[]) {
  return serveFunctions({ client, functions: definitions.map(defineJob) });
}
