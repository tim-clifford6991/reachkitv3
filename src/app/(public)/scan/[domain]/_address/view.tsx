// BUILD §4.1 — the total switch over what a visit resolved to
//
// Exactly one arm renders. The `switch` is total over `AddressState.kind`
// with a `never` default, so an eighth arm added to `state.ts` fails the
// build until it has a rendering here — which is what makes "never a blank
// page, a 404 or an unhandled error" a property of the type rather than a
// promise in prose.
//
// Every line on every arm is a `CopyKey`. The `malformed` arm reuses the
// landing page's own five `landing.problem.*` lines rather than minting
// five more: same union, same wording obligation, one home per claim.
import type React from "react";
import { Alert, Btn } from "@/ui/components";
import { copy, type CopyKey } from "@/lib/presentation/copy";
import LandingPage from "@/app/(public)/page";
import { ReportView } from "./report-view";
import { RemovedView } from "./removal";
import { ScanProgress } from "./progress";
import type { AddressRefusal, AddressState } from "./state";

const REFUSAL_KEY: Readonly<Record<AddressRefusal["reason"], CopyKey>> = Object.freeze({
  "network-limit": "notice.refused.network-limit",
  "scan-running": "notice.refused.scan-running",
});

const SECONDS_PER_MINUTE = 60;

function waitText(retryAfterSeconds: number): string {
  return copy("report.wait.minutes", {
    minutes: String(Math.ceil(retryAfterSeconds / SECONDS_PER_MINUTE)),
  });
}

/** The frame every non-report arm renders inside: one column, the same
 *  gutters the report uses, so the six short arms and the long one are not
 *  two different pages. */
function Pane(p: { children: React.ReactNode }): React.JSX.Element {
  return <main className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">{p.children}</main>;
}

export function AddressView(p: {
  state: AddressState;
  /** The canonical address of this report — REQ-001 c7's copy-link value,
   *  built by the route and never composed inside a view. */
  canonicalUrl: string;
}): React.JSX.Element {
  const state = p.state;
  switch (state.kind) {
    // REQ-001 c4: one written line names what is wrong, and the landing
    // field is offered — never a blank page, an unhandled error, or a scan.
    case "malformed":
      // The landing page's own component, not a second form: it already
      // renders the one field, the one submit and the one written line
      // per `DomainProblem`, and it carries both the JavaScript and the
      // no-JavaScript transport. Rendering it here is what "offered the
      // landing field" means, with no second copy of it to keep in step.
      return (
        <Pane>
          <LandingPage searchParams={{ problem: state.problem, value: state.value }} />
        </Pane>
      );

    // REQ-002 c3 / REQ-001 c18: one line, the same address, and no route
    // back — no control, no form, no link anywhere in this arm.
    case "removed":
      return (
        <Pane>
          <RemovedView domain={state.domain} />
        </Pane>
      );

    // REQ-001 c9: a scan is already underway with no further action from
    // the visitor. The client posts /api/scan on first frame; nothing is
    // posted during server render.
    case "starting":
      return (
        <Pane>
          <ScanProgress domain={state.domain} />
        </Pane>
      );
    case "scanning":
      return (
        <Pane>
          <ScanProgress domain={state.domain} scanId={state.scanId} />
        </Pane>
      );

    // REQ-003 c12: the refusal in writing, and no scan starts. This arm
    // offers no control at all.
    case "refused":
      return (
        <Pane>
          <Alert
            tone="neutral"
            message={copy(REFUSAL_KEY[state.refusal.reason], {
              wait: waitText(state.refusal.retryAfterSeconds),
            })}
          />
        </Pane>
      );

    // REQ-001 c16: one line says what happened, one manual retry is
    // offered, and no scan starts by itself.
    case "cooldown":
      return (
        <Pane>
          <Alert tone="warn" message={copy("notice.measurement-failed")} />
          <Btn label={copy("control.retry")} />
        </Pane>
      );

    case "report":
      return <ReportView state={state} canonicalUrl={p.canonicalUrl} />;

    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
