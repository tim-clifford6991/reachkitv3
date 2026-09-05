// BUILD §4.2 — plugging the address-wide store into the send seam.
//
// §12's `sendEmail()` consults exactly one stoppability store per send,
// chosen by the sending kind's own register row, and holds the `'opt-out'`
// side as a **port** with no implementation: until something fills it, a
// kind whose row says `'opt-out'` is not sent at all, because the only
// honest answer to "has this person opted out?" with no store to ask is
// "we cannot tell", and mailing on that answer is the failure the port
// exists to prevent.
//
// This module is what fills it, and it is the only place that does. It is
// idempotent and is called from every entry point in this feature that can
// reach the seam, so no caller has to remember to wire it and no ordering
// of imports can leave the nurture mail silently unsendable.
import { registerSuppressionReader } from "../send";
import { suppressionState } from "./suppress";

let wired = false;

export function wireSuppressionReader(): void {
  if (wired) return;
  registerSuppressionReader(suppressionState);
  wired = true;
}

/** The suites' door back out, so one test's wiring cannot leak into the
 *  next: `unwireSuppressionReader()` restores the seam's fail-closed
 *  default. */
export function unwireSuppressionReader(): void {
  registerSuppressionReader(null);
  wired = false;
}
