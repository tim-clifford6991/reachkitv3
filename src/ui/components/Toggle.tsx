// src/ui/components/Toggle.tsx
//
// `components.md` §1, verbatim: "`toggle`. Label required; no default
// on/off wording" | "on · off · disabled".
//
// `label` and `checked` are both required (BP-018 decision 2 and rule 1.1's
// "no indeterminate call shape" pattern already used by `Progress`): there
// is no on/off wording built into this component at all, only the caller's
// own label text rendered beside the control.
"use client";

import type React from "react";

export function Toggle(p: {
  /** Required — no default on/off wording exists. */
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="label cursor-pointer gap-2">
      <input
        type="checkbox"
        className="toggle"
        checked={p.checked}
        disabled={p.disabled}
        onChange={(e) => p.onChange?.(e.target.checked)}
      />
      <span>{p.label}</span>
    </label>
  );
}
