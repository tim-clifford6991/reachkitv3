// BUILD §4.2 — the first-page template: the page, its search, and the count.
import { describe, expect, it } from "vitest";
import { applyEnvFixture } from "../../env-fixture";
import { measured, measuredZero, unmeasured } from "../../../../src/lib/measure/measured";

applyEnvFixture();

const { buildFirstPage } = await import("../../../../src/lib/mail/templates/first-page");
const { applyOptOutToken, readOptOutToken } = await import(
  "../../../../src/lib/mail/leads/optout"
);
const { setLeadStore } = await import("../../../../src/lib/mail/leads/store");
const { omittedIndexes } = await import("../../../../src/lib/mail/blocks/omit");

const AT = new Date("2026-09-05T00:00:00.000Z");

function build(volume = measured(1900, AT)) {
  return buildFirstPage({
    email: "anna@example.com",
    pageTitle: "How Acme compares to Rival",
    markdown: "# How Acme compares to Rival\n\nA paragraph, unaltered.\n",
    targetQuery: "acme vs rival",
    volume,
    pagesFound: 6,
  });
}

describe('REQ-010 c4 — "it contains the complete page in a copy-ready form, the target search with its monthly volume, and a line stating this is the first of the pages found for that domain"', () => {
  it("the page arrives whole as a pageBody block, markdown unaltered", () => {
    const mail = build();
    expect(mail.blocks[0]).toEqual({
      block: "pageBody",
      pageTitle: "How Acme compares to Rival",
      written: true,
      markdown: "# How Acme compares to Rival\n\nA paragraph, unaltered.\n",
    });
  });

  it("the body is passed through, never re-wrapped or truncated", () => {
    const long = "#".repeat(4) + " head\n\n" + "word ".repeat(2000);
    const mail = buildFirstPage({
      email: "anna@example.com",
      pageTitle: "t",
      markdown: long,
      targetQuery: "q",
      volume: measured(1, AT),
      pagesFound: 1,
    });
    expect((mail.blocks[0] as { markdown: string }).markdown).toBe(long);
  });

  it("model text carries the label that identifies it: written is true on the page body", () => {
    expect((build().blocks[0] as { written: boolean }).written).toBe(true);
  });

  it("the target search renders with its measured monthly volume", () => {
    const mail = build();
    expect(mail.blocks[1]).toEqual({
      block: "paragraph",
      text: "mail.firstPage.target_search",
      vars: { query: "acme vs rival" },
    });
    expect(mail.blocks[2]).toEqual({
      block: "stat",
      label: "mail.firstPage.volume_label",
      value: measured(1900, AT),
      format: "perMonth",
      note: "mail.firstPage.volume_note",
    });
  });

  it("the first-of-N line renders with pagesFound as a var", () => {
    expect(build().blocks[3]).toEqual({
      block: "paragraph",
      text: "mail.firstPage.first_of_n",
      vars: { pagesFound: 6 },
    });
  });

  it("an unmeasured volume omits its block entirely rather than printing 0 — and takes its disclosure note with it", () => {
    const mail = build(unmeasured("undeterminable", AT));
    // §12's omission rule, exercised on the one template that carries a
    // volume outside the report. The template holds no conditional of its
    // own: the block is declared and `omit.ts` drops it.
    expect(omittedIndexes(mail.blocks)).toEqual([2]);

    // A real zero is a value and is not omitted: the two are not the same
    // fact.
    expect(omittedIndexes(build(measuredZero(0, AT)).blocks)).toEqual([]);
  });

  it("the search itself still renders when its volume does not — the query is known, the number is not", () => {
    const mail = build(unmeasured("not_attempted", AT));
    expect(omittedIndexes(mail.blocks)).not.toContain(1);
  });
});

describe('REQ-010 c11 — "when it is opened, then it carries a working opt-out"', () => {
  it("the template returns an optOut href, and the token in it round-trips to the address it was built for", async () => {
    const state = { suppressions: new Map<string, string>() };
    setLeadStore({
      insertLead: async () => ({ ok: false }),
      readLead: async () => ({ ok: true, lead: null }),
      patchLead: async () => ({ ok: true }),
      leadsInSequenceState: async () => ({ ok: true, leads: [] }),
      leadsInFirstPageState: async () => ({ ok: true, leads: [] }),
      leadsForAddress: async () => ({ ok: true, leads: [] }),
      isSuppressed: async (email: string) => ({
        ok: true,
        suppressed: state.suppressions.has(email),
      }),
      addSuppression: async (email: string, cause: string) => {
        state.suppressions.set(email, cause);
        return { ok: true };
      },
      scanDomain: async () => ({ ok: true, domain: null }),
      openOpportunitiesForScan: async () => ({ ok: true, rows: [] }),
    });

    const mail = build();
    expect(mail.optOut.mechanism).toBe("opt-out");
    expect(mail.optOut.href).toMatch(/^\/opt-out\//);

    const token = mail.optOut.href.replace("/opt-out/", "");
    expect(readOptOutToken(token)).toEqual({ email: "anna@example.com" });
    await expect(applyOptOutToken(token)).resolves.toEqual({ email: "anna@example.com" });

    setLeadStore(null);
  });

  it("optOut is a required field of what a lead template returns, so a lead mail without one is unrepresentable", () => {
    // The mutation this guards: drop `optOut` from this template's return
    // and the module does not compile — the field is required, not a thing
    // three call sites are asked to remember.
    const mail: { optOut: { href: string; mechanism: string } } = build();
    expect(mail.optOut).toBeDefined();
  });

  it("the mail is stoppable: false and still carries the way to stop what comes next (ADR-041)", async () => {
    const { MAIL_KINDS } = await import("../../../../src/lib/mail/kinds");
    expect(MAIL_KINDS["first-page"].stoppable).toBe(false);
    expect(build().optOut.href).not.toBe("");
  });
});

describe("ADR-040 — a template holds no shell, no formatter and no vendor knowledge", () => {
  it("it imports no shell, no renderer, no vendor client and no model", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/mail/templates/first-page/index.ts", "utf8");
    // A `import type` of the shell's `OptOutControl` is erased before the
    // bundle exists and carries no behaviour; a **value** import from the
    // shell or the vendor client is what ADR-040 point 3 forbids.
    expect(source).not.toMatch(/\bimport\s+(?!type)[^;]*from "\.\.\/\.\.\/(shell|vendor)/);
    expect(source).not.toMatch(/lib\/llm/);
    expect(source).not.toMatch(/renderBlocks|frameHtml|frameText|sendViaVendor|composeMail/);
  });

  it("the directory is named for the MailKind it builds", async () => {
    const { MAIL_KINDS } = await import("../../../../src/lib/mail/kinds");
    expect(Object.keys(MAIL_KINDS)).toContain("first-page");
  });
});
