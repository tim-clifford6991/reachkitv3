// BUILD §4.2 — the three touches, and the third is the last.
//
// Max three mails per domain per address, at 24h, 72h and 168h from the
// sequence's start, stopping on conversion or opt-out. Each touch is its
// own pair of keys — a subject and a line — indexed by the touch number, so
// which touch this is is carried by the **type**, not by a conditional
// inside the template. There is no fourth entry in either tuple, so a
// fourth touch does not compile.
//
// `nurture` is the one lead-directed kind whose register row says
// `stoppable: 'opt-out'`: the send seam consults the address-wide
// suppression store immediately before the vendor call, and this is the
// mail that store exists to stop.
import type { CopyKey } from "@/lib/presentation/copy";
import { optOutControlFor, type LeadMail } from "../first-page";

/** 1, 2 or 3 — REQ-010 c9's "at most three", stated as a type. */
export type NurtureTouch = 1 | 2 | 3;

const SUBJECTS: readonly [CopyKey, CopyKey, CopyKey] = [
  "mail.nurture.subject.1",
  "mail.nurture.subject.2",
  "mail.nurture.subject.3",
];

const BODIES: readonly [CopyKey, CopyKey, CopyKey] = [
  "mail.nurture.body.1",
  "mail.nurture.body.2",
  "mail.nurture.body.3",
];

export function buildNurture(a: {
  email: string;
  domain: string;
  touch: NurtureTouch;
}): LeadMail {
  const index = a.touch - 1;
  return {
    subject: SUBJECTS[index] as CopyKey,
    blocks: [{ block: "paragraph", text: BODIES[index] as CopyKey, vars: { domain: a.domain } }],
    optOut: optOutControlFor(a.email),
  };
}
