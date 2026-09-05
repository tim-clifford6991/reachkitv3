// BUILD §4.2 — the page a founder traded their address for.
//
// One directory per mail kind, named for the kind (ADR-040), holding a
// block list and nothing else: no shell, no formatter, no vendor knowledge,
// no conditional and no sentence of its own. Every value that can be absent
// enters as a `Measured<T>` and the omission rule drops its block — so an
// unmeasured search volume takes its own block and its disclosure note with
// it rather than printing 0.
//
// **Read ADR-041 before removing the opt-out from this mail.** `first-page`
// is `stoppable: false`, so suppression never blocks its send — and it
// still carries the opt-out link. `stoppable: false` governs whether
// suppression blocks the send, not whether the mail carries a way to stop
// what comes next: the page has already been asked for, and the opt-out in
// it stops the follow-up, not the page. REQ-010 c11 says "any of these
// emails", with no exception, which is why `optOut` is a **required** field
// of what a lead template returns — a lead mail without one is
// unrepresentable rather than merely untested.
import type { Measured } from "@/lib/measure/measured";
import type { CopyKey } from "@/lib/presentation/copy";
import type { MailBlock } from "../../blocks/types";
import type { OptOutControl } from "../../shell/compose";
import { optOutTokenFor } from "../../leads/optout";

// The keys this template speaks, named once each. `satisfies CopyKey` is
// what checks them, and hoisting them out of the block literals is the
// convention `shell/compose.ts` already follows — a key sitting in a field
// called `subject` or `text` is indistinguishable, to the string-literal
// sweep, from a sentence written there.
const SUBJECT = "mail.firstPage.subject" satisfies CopyKey;
const TARGET_SEARCH = "mail.firstPage.target_search" satisfies CopyKey;
const VOLUME_LABEL = "mail.firstPage.volume_label" satisfies CopyKey;
const VOLUME_NOTE = "mail.firstPage.volume_note" satisfies CopyKey;
const FIRST_OF_N = "mail.firstPage.first_of_n" satisfies CopyKey;

export interface LeadMail {
  readonly subject: CopyKey;
  readonly blocks: readonly MailBlock[];
  readonly optOut: OptOutControl;
}

/** The address the opt-out link points at. An internal route shape, not a
 *  customer-visible string: `/opt-out/{token}` is BP-001's public route and
 *  `PUBLIC_PATHS` already carries it. */
export function optOutHref(email: string): string {
  return `/opt-out/${optOutTokenFor(email)}`;
}

export function optOutControlFor(email: string): OptOutControl {
  // `mechanism` names which of ADR-042's two mechanisms this link belongs
  // to, so the address-wide opt-out and the kind-scoped unsubscribe can
  // never be confused at the point they are put in front of a reader.
  return { href: optOutHref(email), mechanism: "opt-out" };
}

export function buildFirstPage(a: {
  email: string;
  pageTitle: string;
  markdown: string;
  targetQuery: string;
  volume: Measured<number>;
  pagesFound: number;
}): LeadMail {
  return {
    subject: SUBJECT,
    blocks: [
      // The page arrives whole. `written: true` is what carries the
      // generated-text label with it — model text cannot reach a mail
      // without the label that identifies it.
      { block: "pageBody", pageTitle: a.pageTitle, written: true, markdown: a.markdown },
      { block: "paragraph", text: TARGET_SEARCH, vars: { query: a.targetQuery } },
      {
        block: "stat",
        label: VOLUME_LABEL,
        value: a.volume,
        format: "perMonth",
        note: VOLUME_NOTE,
      },
      { block: "paragraph", text: FIRST_OF_N, vars: { pagesFound: a.pagesFound } },
    ],
    optOut: optOutControlFor(a.email),
  };
}
