// src/jobs/weekly-refresh.ts — BUILD §11
//
// "`weekly/refresh` · Mon 06:00 UTC" as ADR-060 rules it: the tick is
// hourly and due-ness is each site's own local Monday at its own local
// hour. `Mon 06:00 UTC` is not the trigger, and this file schedules on no
// UTC hour at all.
//
// One tick reads the active sites, keeps the ones whose local clock says
// Monday-at-the-due-hour, and fans the rest out under
// `JOB_FAN_OUT_CONCURRENCY` so a slow site never starves the rest of
// Monday. The `(site_id, week_start)` key is computed here and enforced by
// the engine's own unique constraint — this file never writes one.
//
// Not in the kill switch's scope directly; the scans it starts are, and
// `scan/run` is stopped at its own door.
import { activeSites, startWeeklyScan } from "@/jobs/engine";
import { fanOut, settle } from "./fan-out";
import { isWeeklyDue, weekStartOf } from "./site-clock";
import type { JobDefinition, Outcome } from "./types";

/** The hourly tick ADR-060 requires — every hour, on the hour, in every
 *  zone at once. Due-ness is decided per site inside the run. */
export const WEEKLY_TICK_CRON = "0 * * * *";

export const weeklyRefresh: JobDefinition = {
  id: "weekly/refresh",
  trigger: { kind: "cron", cron: WEEKLY_TICK_CRON },
  idempotencyKey: [],
  async run(input): Promise<Outcome> {
    const due = (await activeSites()).filter((site) => isWeeklyDue(input.now, site.timeZone));
    if (due.length === 0) return { outcome: "skipped", subjectId: null, reason: "not-due" };

    const results = await fanOut(due, (site) =>
      startWeeklyScan({ siteId: site.siteId, weekStart: weekStartOf(input.now, site.timeZone) })
    );
    return settle(results, null);
  },
};
