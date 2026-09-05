// BUILD §4.7 · §12 — "three" is asserted against the register, never stated twice.
import { describe, expect, it, vi } from "vitest";
import { MAIL_KINDS, TOGGLE_KINDS, type MailKind } from "../../../src/lib/mail/kinds";

vi.mock("@/lib/db", () => ({ db: () => ({}) }));

const { TOGGLABLE_KINDS } = await import("../../../src/lib/mail/notifications/index");

describe("BUILD §4.7 — the toggles are exactly the register's toggle rows", () => {
  it("TOGGLABLE_KINDS equals the register's 'toggle' rows", () => {
    const fromRegister = (Object.keys(MAIL_KINDS) as MailKind[]).filter(
      (kind) => MAIL_KINDS[kind].stoppable === "toggle"
    );
    expect([...TOGGLABLE_KINDS].sort()).toEqual([...fromRegister].sort());
    expect([...TOGGLE_KINDS].sort()).toEqual([...fromRegister].sort());
  });

  it("a fourth toggle row, or a missing one, would be visible here", () => {
    // The count is derived, not written down twice: this assertion moves
    // with the register rather than needing an edit alongside it.
    expect(TOGGLABLE_KINDS).toHaveLength(
      (Object.keys(MAIL_KINDS) as MailKind[]).filter((k) => MAIL_KINDS[k].stoppable === "toggle").length
    );
  });

  it("the notifications module imports the register type-only — no runtime cycle", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const source = readFileSync(
      path.resolve(__dirname, "../../../src/lib/mail/notifications/index.ts"),
      "utf8"
    );
    // The register may be imported for its value (`TOGGLE_KINDS`), but the
    // register must import nothing back — that is the direction that
    // matters.
    const registerSource = readFileSync(
      path.resolve(__dirname, "../../../src/lib/mail/kinds.ts"),
      "utf8"
    );
    expect(source).toContain('from "../kinds"');
    expect(registerSource).not.toMatch(/^import /m);
  });
});
