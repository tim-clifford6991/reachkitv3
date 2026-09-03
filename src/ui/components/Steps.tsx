// src/ui/components/Steps.tsx
//
// `components.md` §1, verbatim: "`steps`. **Each step's label required** —
// this is what the scan's named stages render through, so an unlabelled
// step cannot exist (REQ-003 c1: never an unlabelled spinner)" | "pending ·
// active · done".
//
// Each step's `label` is a required field of its own array entry (the same
// shape `Tabs`' `TabItem` takes), so a stage with no name has no way into
// this component.
import type React from "react";

export interface StepItem {
  id: string;
  /** Required — an unlabelled stage cannot render (REQ-003 c1). */
  label: string;
  state: "pending" | "active" | "done";
}

export function Steps(p: { steps: StepItem[] }): React.JSX.Element {
  return (
    <ul className="steps">
      {p.steps.map((step) => (
        <li
          key={step.id}
          className={`step${step.state === "done" || step.state === "active" ? " step-primary" : ""}`}
          data-state={step.state}
        >
          {step.label}
        </li>
      ))}
    </ul>
  );
}
