// src/ui/components/Card.tsx
//
// `components.md` §1, verbatim: "`card`/`card-body`/`card-title`. Title slot
// takes a **verdict node**, not a metric label — §2.5: the card leads with
// the answer" | "default · degraded (one written line in place of a missing
// section — never an empty card, never a spinner)".
//
// `title` takes `React.ReactNode` (a verdict node — typically a `Badge` or a
// pair of them), never a plain label string, so a caller cannot pass a
// metric name where a verdict belongs by construction. The two states are a
// discriminated union on `state`, which is required and has no default:
// `degraded` carries `degradedLine` (the one written line) and no
// `children`; `default` carries `children` (the card body) and no
// `degradedLine`. Neither arm has a fallback string.
import type React from "react";

type CardDefault = {
  state: "default";
  title: React.ReactNode;
  children: React.ReactNode;
};

type CardDegraded = {
  state: "degraded";
  title: React.ReactNode;
  /** The one written line replacing a missing section — required, never a
   * fallback (BP-018 decision 2). Never an empty card, never a spinner. */
  degradedLine: string;
};

export type CardProps = CardDefault | CardDegraded;

export function Card(p: CardProps): React.JSX.Element {
  return (
    <div className="card">
      <div className="card-body">
        <div className="card-title">{p.title}</div>
        {p.state === "degraded" ? <p>{p.degradedLine}</p> : p.children}
      </div>
    </div>
  );
}
