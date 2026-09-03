// src/ui/components/Input.tsx
//
// `components.md` §1, verbatim: "`input`. Placeholder **and** label
// required, never defaulted" | "default · invalid (one written line, value
// intact) · disabled".
//
// `label` and `placeholder` are both required with no default (BP-018
// decision 2). `invalid` is a discriminated union: passing `invalid: true`
// requires `invalidMessage` (the one written line) in the same object —
// there is no call shape that marks a field invalid without also supplying
// the sentence explaining why. The invalid value stays intact: this
// component never clears `value` itself.
"use client";

import type React from "react";

type InputBase = {
  /** Required — no default label exists. */
  label: string;
  /** Required — no default placeholder exists. */
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

type InputValid = InputBase & { invalid?: false };
type InputInvalid = InputBase & {
  invalid: true;
  /** Required whenever `invalid` is true — the one written line. */
  invalidMessage: string;
};

export type InputProps = InputValid | InputInvalid;

export function Input(p: InputProps): React.JSX.Element {
  return (
    <div>
      <label className="label">
        <span className="label-text">{p.label}</span>
      </label>
      <input
        type="text"
        className={["input", p.invalid ? "input-error" : ""].filter(Boolean).join(" ")}
        placeholder={p.placeholder}
        value={p.value}
        disabled={p.disabled}
        aria-invalid={p.invalid === true}
        onChange={(e) => p.onChange?.(e.target.value)}
      />
      {p.invalid ? <p className="text-error">{p.invalidMessage}</p> : null}
    </div>
  );
}
