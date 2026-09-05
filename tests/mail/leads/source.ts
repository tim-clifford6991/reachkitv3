// tests/mail/leads/source.ts — a module's code, with its comments removed.
//
// Several of this feature's promises are dependency properties: capture
// consults no suppression store (ADR-041), the giveaway reaches the draft
// port from exactly one place, a template imports no shell and no vendor.
// Each is asserted over the module's source — and every one of those
// modules names the thing it must not reach, in a header explaining why,
// because ADR-041 and ADR-042 exist to be read there. So the assertions run
// over the code with the comments stripped: citing an ADR is not reaching
// for the mechanism it forbids.
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

export function codeOf(relativePath: string): string {
  const source = readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
    .join("\n");
}
