// BUILD §4.7 — Settings, at `/app/settings`.
//
// A placeholder inside the shell (issue #9): the two columns of cards — the
// three product answers, publishing, notifications, billing, account, your
// content and the danger zone — are issue #18's (with #52's danger-zone
// actions). This file establishes the route, the shell around it, and the
// registry as the only voice.
//
// It declares no `Surface`: the shell's layout owns this route's screen
// root (see `../../layout.tsx`).
import type React from "react";
import { copy } from "@/lib/presentation/copy";
import { writtenLine } from "../_shell/written";

export default function SettingsPage(): React.JSX.Element {
  const head = writtenLine("settings.head");
  return (
    <>
      <h1>{copy("shell.nav.settings")}</h1>
      {head === null ? null : <p>{head}</p>}
    </>
  );
}
