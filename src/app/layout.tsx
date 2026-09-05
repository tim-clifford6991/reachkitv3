// src/app/layout.tsx
//
// BP-001 `## Module / boundary`: "`src/app/layout.tsx`" — the one root
// document every ReachKit-addressed surface renders inside. It carries
// BP-018's theme and fonts and holds no product copy of its own (BP-018
// decision 2: "no component has a default string"): this file renders
// `{children}` and nothing else — no navigation, no heading, no string.
//
// Theme: `src/ui/theme.css` (WO-029) declares its three states against the
// bare `:root` selector — the browser's root element is `<html>`, so
// importing the stylesheet here *is* the whole attribute contract. WO-029
// wrote no toggle script, only the CSS selectors this layout does not
// duplicate: bare `:root` = light, `:root:not([data-theme="light"])` = the
// media-guarded dark state, `:root[data-theme="dark"]` = the explicit
// future toggle. No `data-theme` is set from here.
//
// Fonts: `fontVariables` (`"rk-fonts"`, `src/ui/fonts.ts`) is the class
// `src/ui/type.css`'s `.rk-fonts` rule binds `--font-ui`/`--font-mono` on —
// `fonts.ts`'s own header: "the two files meet ... at the root layout".
// `fonts.ts` alone only loads the two families' `@font-face` bytes
// (side-effect imports); it does not itself bind the variable names, so
// `type.css` is imported here too, alongside `fonts.ts`, for the class to
// have a rule to match — WO-030's file plan: "Exports the two CSS variable
// names the root layout binds."
//
// Layout tokens: `src/ui/layout/layout.css` declares `--breakpoint-lg`,
// `--breakpoint-xl` and `--t-floor` on `:root` (ADR-093; issue #62). The
// conformance suite reads them off every route's document, so the one
// stylesheet every route shares is where they are imported.
import type React from "react";

import "@/ui/theme.css";
import "@/ui/type.css";
import "@/ui/layout/layout.css";
import { fontVariables } from "@/ui/fonts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
