// BUILD §4.2 — the opt-out token: unexpiring, idempotent, one capability.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyEnvFixture } from "../env-fixture";
import { blankLead, memoryStore, newMemoryState, type MemoryState } from "./memory-store";
import { codeOf } from "./source";

applyEnvFixture();

const { applyOptOutToken, optOutTokenFor, readOptOutToken } = await import(
  "../../../src/lib/mail/leads/optout"
);
const { unsubscribeTokenFor } = await import(
  "../../../src/lib/mail/notifications/unsubscribe"
);
const { setLeadStore } = await import("../../../src/lib/mail/leads/store");

let state: MemoryState;

beforeEach(() => {
  state = newMemoryState();
  setLeadStore(memoryStore(state));
});

afterEach(() => setLeadStore(null));

describe("the token round-trips the address it was signed for, and nothing else", () => {
  it("reading a token returns its address", () => {
    const token = optOutTokenFor("anna@example.com");
    expect(readOptOutToken(token)).toEqual({ email: "anna@example.com" });
  });

  it("it is signed on the normalised address, so one person has one token", () => {
    expect(optOutTokenFor("Anna@Example.COM")).toBe(optOutTokenFor("anna@example.com"));
  });

  it("a tampered payload, a tampered signature and a malformed token are all invalid", () => {
    const token = optOutTokenFor("anna@example.com");
    const [payload, mac] = token.split(".") as [string, string];
    const otherPayload = Buffer.from("bob@example.com").toString("base64url");

    expect(readOptOutToken(`${otherPayload}.${mac}`)).toEqual({ error: "invalid" });
    expect(readOptOutToken(`${payload}.${"A".repeat(mac.length)}`)).toEqual({ error: "invalid" });
    expect(readOptOutToken(payload)).toEqual({ error: "invalid" });
    expect(readOptOutToken("")).toEqual({ error: "invalid" });
    expect(readOptOutToken("a.b.c")).toEqual({ error: "invalid" });
  });

  it("no expiry is encoded, so none can be checked: a link found a year later still reads", () => {
    const token = optOutTokenFor("anna@example.com");
    // The token is payload + MAC and carries no third part; there is
    // nothing in it a clock could be compared against.
    expect(token.split(".")).toHaveLength(2);
    expect(Buffer.from(token.split(".")[0] as string, "base64url").toString("utf8")).toBe(
      "anna@example.com"
    );
    const code = codeOf("src/lib/mail/leads/optout.ts");
    expect(code).not.toMatch(/expir|Date\.now|new Date/);
  });
});

describe("ADR-042 — two token formats, over two subjects, permanently", () => {
  it("an unsubscribe token is not readable as an opt-out token", () => {
    const other = unsubscribeTokenFor({
      userId: "1b1f5c2e-0000-4000-8000-000000000001",
      kind: "weekly",
    });
    // Different subjects and different signing keys (a distinct HKDF
    // label): neither token can ever be presented as the other.
    expect(readOptOutToken(other)).toEqual({ error: "invalid" });
  });

  it("optout.ts writes no notification preference", () => {
    const code = codeOf("src/lib/mail/leads/optout.ts");
    expect(code).not.toMatch(/notifications|users\.notify|setNotifyPref/);
  });
});

describe("applying the token is the whole of the capability", () => {
  it("it stops the running sequence and every other domain's, for the address it names", async () => {
    state.leads = [
      blankLead({
        id: "running",
        email: "anna@example.com",
        domain: "acme.com",
        sequence_state: "running",
      }),
      blankLead({
        id: "waiting",
        email: "anna@example.com",
        domain: "beta.com",
        sequence_state: "waiting",
      }),
    ];

    await expect(applyOptOutToken(optOutTokenFor("anna@example.com"))).resolves.toEqual({
      email: "anna@example.com",
    });
    expect(state.leads.map((lead) => lead.sequence_state)).toEqual(["stopped", "stopped"]);
    expect(state.suppressions.get("anna@example.com")).toBe("opt_out");
  });

  it("applying it twice succeeds both times", async () => {
    const token = optOutTokenFor("anna@example.com");
    await expect(applyOptOutToken(token)).resolves.toEqual({ email: "anna@example.com" });
    await expect(applyOptOutToken(token)).resolves.toEqual({ email: "anna@example.com" });
  });

  it("an unverifiable token writes nothing", async () => {
    await expect(applyOptOutToken("not-a-token")).resolves.toEqual({ error: "invalid" });
    expect(state.suppressions.size).toBe(0);
  });

  it("a store that will not take the write says so, rather than calling the reader's link invalid", async () => {
    state.failSuppressionWrite = true;
    await expect(applyOptOutToken(optOutTokenFor("anna@example.com"))).resolves.toEqual({
      error: "unavailable",
    });
  });

  it("the token can do exactly one thing: it names an address and carries no other instruction", () => {
    const code = codeOf("src/lib/mail/leads/optout.ts");
    // No kind, no user, no scope, no verb in the payload — the payload is
    // the address, and `applyOptOutToken` reaches one function with it.
    expect(code).not.toMatch(/kind|userId|scope|delete|purge/);
  });
});
