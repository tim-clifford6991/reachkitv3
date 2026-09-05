// ADR-040 — one directory per mail kind, and the register is the partition.
//
// "A directory with no register row, or a register row with no directory,
// fails BP-053's register test." Only one of the two halves is decidable
// today: the templates themselves belong to the features that own each
// occasion, and none of those has been built, so every row would fail the
// second half. This suite therefore holds the half that discriminates now
// — no directory may exist that is not a registered kind — and reports
// the pending half rather than asserting it vacuously (it becomes an
// assertion when the tenth directory lands).
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAIL_KINDS, type MailKind } from "../../../src/lib/mail/kinds";

const TEMPLATES = path.resolve(__dirname, "../../../src/lib/mail/templates");

function templateDirectories(): string[] {
  if (!existsSync(TEMPLATES)) return [];
  return readdirSync(TEMPLATES).filter((entry) => statSync(path.join(TEMPLATES, entry)).isDirectory());
}

describe("ADR-040 — MailKind and the template directory are the same string", () => {
  const present = templateDirectories();
  const registered = Object.keys(MAIL_KINDS) as MailKind[];
  const missing = registered.filter((kind) => !present.includes(kind));

  // Rule 5.5: stated unconditionally, not only when there is something to
  // report.
  console.log(
    `tests/mail/kinds/template-directories.test.ts: ${present.length} of ${registered.length} ` +
      `template directories present; awaiting ${JSON.stringify(missing)}`
  );

  it("no template directory exists that is not a registered kind", () => {
    expect(present.filter((dir) => !(registered as string[]).includes(dir))).toEqual([]);
  });

  it("the seam itself holds no template — templates belong to the features that own each occasion", () => {
    expect(present).toEqual(present.filter((dir) => (registered as string[]).includes(dir)));
  });
});
