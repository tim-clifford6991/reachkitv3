// BUILD §4.2 — the message that closes a request no page is coming for.
//
// REQ-010 criterion 7: the founder is told the page is not coming **and
// why**, in a written statement naming the cause. This mail is that
// statement, and it is one they cannot stop — it closes the request they
// made, which is why the kind's register row says `stoppable: false`.
//
// It carries one notice block and no page body: there is no `pageBody` arm
// in this template at all, so a half-written page can never arrive wearing
// an apology.
//
// The cause arrives as an already-resolved `CopyKey`, not as a
// `FirstPageFailure`. The exhaustive map from one to the other lives in
// `leads/giveaway.ts`, where the union is declared, because the report's
// own surface renders the **same** key in place for a founder still
// looking at it — one map, read twice, rather than two that drift.
//
// **Read ADR-041 before removing the opt-out from this mail.** Like the
// page itself, it is unstoppable and still carries the way to stop what
// comes next.
import type { CopyKey } from "@/lib/presentation/copy";
import { optOutControlFor, type LeadMail } from "../first-page";

/** Named once, for the same reason the first-page template names its own:
 *  a key sitting in a field called `subject` is indistinguishable, to the
 *  string-literal sweep, from a sentence written there. */
const SUBJECT = "mail.firstPageUnavailable.subject" satisfies CopyKey;

export function buildFirstPageUnavailable(a: {
  email: string;
  causeLine: CopyKey;
}): LeadMail {
  return {
    subject: SUBJECT,
    blocks: [{ block: "notice", text: a.causeLine }],
    optOut: optOutControlFor(a.email),
  };
}
