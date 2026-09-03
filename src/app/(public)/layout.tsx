// src/app/(public)/layout.tsx
//
// BP-001 decision "three route groups — `(public)`, `(account)`, `(hosted)`
// — with the authorisation rule attached to the group rather than to the
// route" (current numbering: decision 3; WO-002's own `## Test plan` cites
// it as "decision 2" — the quoted text is unchanged, only the ordinal has
// drifted since this work order was cut). This group declares nothing
// about sessions — `## Error & edge behavior`: "Every route under
// `src/app/(public)/**` renders without a session, a cookie or a payment."
// The group's own existence, matched by WO-003's middleware, is the
// authorisation boundary; there is no check to write in this file. It
// renders `{children}` and nothing else (WO-002 `## Steps` step 3: a
// pass-through).
import type React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
