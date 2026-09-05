// src/jobs/account-maintenance.ts — BUILD §11
//
// The seventh id. `BUILD.md` §11's table names six jobs; five obligations
// in the rest of the spec fall due on a clock and no read path can serve
// them — a payment awaiting sign-in, a payment with no account, a
// hosting-end notice, a hosting stop, an account due for purge. This tick
// is their trigger and nothing more.
//
// **No domain logic here.** One tick is five due-work queries and five
// hand-offs: each returned subject goes straight back to the module that
// owns its rule. This file holds no predicate over a timestamp, no
// threshold and no ordering — a tick whose five queries return nothing is
// five indexed reads and no writes.
//
// Not in the kill switch's scope: halting it would hold a purge, withhold a
// hosting notice and strand a paid customer waiting for a sign-in link,
// none of which is spend and none of which §11's stop is about.
import {
  accountsDueForPurge,
  backstopProvision,
  chaseSignIn,
  noticeHostingEnd,
  paymentsAwaitingSignIn,
  paymentsWithoutAccounts,
  purgeAccount,
  sitesDueHostingEndNotice,
  sitesDueHostingStop,
  stopHosting,
  type EngineResult,
} from "@/jobs/engine";
import { MAINTENANCE_TICK_MINUTES } from "@/lib/config/constants";
import { fanOut, settle } from "./fan-out";
import type { JobDefinition, Outcome } from "./types";

/** Every `MAINTENANCE_TICK_MINUTES`, derived from the pin rather than
 *  written twice, so the mail lands inside the first tick after the promise
 *  falls due. */
export const MAINTENANCE_CRON = `*/${MAINTENANCE_TICK_MINUTES} * * * *`;

/** The five obligations, each a query and the hand-off that owns its rule.
 *  Adding a sixth is an edit to this list — never a predicate in the body
 *  below. */
const DUE_WORK: readonly {
  readonly due: () => Promise<readonly string[]>;
  readonly handOff: (subjectId: string) => Promise<EngineResult>;
}[] = Object.freeze([
  { due: paymentsAwaitingSignIn, handOff: chaseSignIn },
  { due: paymentsWithoutAccounts, handOff: backstopProvision },
  { due: sitesDueHostingEndNotice, handOff: noticeHostingEnd },
  { due: sitesDueHostingStop, handOff: stopHosting },
  { due: accountsDueForPurge, handOff: purgeAccount },
]);

export const accountMaintenance: JobDefinition = {
  id: "account/maintenance",
  trigger: { kind: "cron", cron: MAINTENANCE_CRON },
  idempotencyKey: [],
  async run(): Promise<Outcome> {
    let handedOff = 0;
    for (const { due, handOff } of DUE_WORK) {
      const subjects = await due();
      handedOff += subjects.length;
      const results = await fanOut(subjects, (subjectId) => handOff(subjectId));
      const settled = settle(results, null);
      if (settled.outcome === "degraded") return settled;
    }
    return handedOff === 0
      ? { outcome: "skipped", subjectId: null, reason: "no-subject" }
      : { outcome: "ran", subjectId: null };
  },
};
