// BUILD §4.6 — Calendar (with day panel), at `/app/calendar`.
//
// A placeholder inside the shell (issue #9): the month switcher, the stage
// filter cards, the seven-column grid and the 290px day panel are issue
// #16's, and the grid and panel are two of §2.2's five custom surfaces
// (issue #10). This file establishes the route, the shell around it, and
// the registry as the only voice.
//
// It declares no `Surface`: the shell's layout owns this route's screen
// root (see `../../layout.tsx`).
import type React from "react";
import { copy } from "@/lib/presentation/copy";
import { writtenLine } from "../_shell/written";

export default function CalendarPage(): React.JSX.Element {
  const head = writtenLine("calendar.head");
  return (
    <>
      <h1>{copy("shell.nav.calendar")}</h1>
      {head === null ? null : <p>{head}</p>}
    </>
  );
}
