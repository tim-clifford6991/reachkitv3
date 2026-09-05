// BUILD §4.4 — the one read the shell makes.
//
// The typed seam WO-154 calls `readShell`. Every app screen's layout calls
// it and nothing else; what it reads behind the type is this issue's
// fixture (`fixture.ts`) and, when §11's weekly measurement (#41) and §9's
// publishing (#45) land, the queries WO-154's file plan describes — one
// request-cached read, no second caller, no second shape.
//
// `React.cache` is what makes it one read per request even though the
// layout, the sidebar and the tab bar each ask: the layout asks once and
// passes the model down today, and a later screen that asks again gets the
// same object rather than a second query.
import { cache } from "react";
import { assembleShell, type ShellModel } from "./model";
import { FIXTURE_SHELL_FACTS } from "./fixture";

export const readShell = cache(async function readShell(): Promise<ShellModel> {
  return assembleShell(FIXTURE_SHELL_FACTS);
});
