// BUILD §4.5 — Overview, the default view, at `/app`.
//
// A placeholder inside the shell (issue #9): this screen's content — the
// head line and its badge, the growth chart, the three stat tiles, the
// rival gaps, the this-week strip — is issue #15's. What this file
// establishes is that the route exists, renders inside the shell, and
// speaks only through the registry.
//
// It declares no `Surface`: the shell's layout owns this route's screen
// root (see `../layout.tsx`), and a second one would be a second
// `[data-surface]` in the document.
//
// `overview.head` is owner-owed, so nothing is written here until the owner
// writes it — never a placeholder sentence.
import type React from "react";
import { copy } from "@/lib/presentation/copy";
import { writtenLine } from "./_shell/written";

export default function OverviewPage(): React.JSX.Element {
  const head = writtenLine("overview.head");
  return (
    <>
      <h1>{copy("shell.nav.overview")}</h1>
      {head === null ? null : <p>{head}</p>}
    </>
  );
}
