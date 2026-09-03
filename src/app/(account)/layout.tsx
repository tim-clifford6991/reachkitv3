// src/app/(account)/layout.tsx
//
// BP-001 decision "three route groups ... with the authorisation rule
// attached to the group rather than to the route" (see the numbering note
// in `(public)/layout.tsx`). `src/app/(account)/**` requires a session
// (`## NFR budget`: "Authorisation: default-deny"). The check itself is
// WO-003's middleware, matched against this group's path — a work order
// this one does not depend on and so does not implement; this layout
// consumes nothing that does not exist yet and, per WO-002 `## Steps`
// step 3, is a pass-through, exactly like `(public)/layout.tsx`. It holds
// no shell chrome of its own — BP-037 owns
// `src/app/(account)/app/layout.tsx`.
import type React from "react";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
