// src/ui/components/Stat.tsx
//
// `components.md` §1, verbatim: "`stats`/`stat`. Value renders through the
// mono numeral utility. One headline number per module; every value carries
// its delta or its goal, never bare" | "measured · measured-zero (prints
// `0`) · unmeasured (prints `—` plus one written line naming the reason)".
//
// `label` is required (BP-018 decision 2). The value's carrier is a
// discriminated union enforcing "never bare" at the type level: `delta` and
// `goal` are mutually exclusive and one is required whenever `state` is
// `measured`/`measured-zero`; `unmeasured` instead requires `reason`, the
// one written line naming why. The value renders through `.num`
// (`src/ui/type.css`, WO-030) — the only place this file touches a numeral.
// The em dash `unmeasured` prints is a fixed glyph marking "nothing
// measured," not a product sentence (BP-018 decision 2 is about copy, not
// punctuation); `reason` is the one written line the caller must still
// supply, so nothing here substitutes for the sentence itself.
import type React from "react";

type WithDelta = { delta: React.ReactNode; goal?: never };
type WithGoal = { goal: React.ReactNode; delta?: never };

type StatMeasured = {
  state: "measured" | "measured-zero";
  label: string;
  value: React.ReactNode;
} & (WithDelta | WithGoal);

type StatUnmeasured = {
  state: "unmeasured";
  label: string;
  /** Required — the one written line naming the reason. No fallback. */
  reason: string;
};

export type StatProps = StatMeasured | StatUnmeasured;

export function Stat(p: StatProps): React.JSX.Element {
  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-title">{p.label}</div>
        <div className="stat-value num">{p.state === "unmeasured" ? "—" : p.value}</div>
        <div className="stat-desc">
          {p.state === "unmeasured" ? p.reason : (p.delta ?? p.goal)}
        </div>
      </div>
    </div>
  );
}
