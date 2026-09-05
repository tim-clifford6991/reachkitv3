// tests/egress/dns.test.ts — BUILD §6.4
//
// `resolvesInDns` (BP-006 decision 2, issue #22): the one meaning of
// "reachable". No test here makes a real network call — `tests/setup.ts`
// already throws on any `http.request`/`https.request`, which is exactly
// the mutation the "resolves but refuses our fetcher" cases exist to catch:
// an implementation that probed the site over HTTP would throw here.
import dns from "node:dns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dnsModule from "../../src/lib/egress/dns";
import { DNS_TIMEOUT_MS } from "../../src/lib/config/constants";

const PUBLIC_IP = "93.184.216.34";

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("resolvesInDns · answers exactly one question (BP-006 error behaviour)", () => {
  it("the module's exported value set is exactly `resolvesInDns`", () => {
    expect(Object.keys(dnsModule).sort()).toEqual(["resolvesInDns"]);
  });

  it("a name that resolves to a public address → true, with no connection attempted", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: PUBLIC_IP, family: 4 });
    await expect(dnsModule.resolvesInDns("example.com")).resolves.toBe(true);
  });

  it("a name that does not resolve → false, never a thrown error", async () => {
    vi.spyOn(dns.promises, "lookup").mockRejectedValue(Object.assign(new Error("nope"), { code: "ENOTFOUND" }));
    await expect(dnsModule.resolvesInDns("no-such-host.invalid")).resolves.toBe(false);
  });

  it("an empty host → false, without asking the resolver", async () => {
    const lookup = vi.spyOn(dns.promises, "lookup");
    await expect(dnsModule.resolvesInDns("   ")).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("resolvesInDns · a site that is new, thin, unbuilt or blocking our fetcher resolves and is accepted", () => {
  // Each of BP-006's four cases resolves in DNS; what the site would answer
  // over HTTP (403, empty body, 404, connection reset) is irrelevant and is
  // never asked. `tests/setup.ts` throws on any transport call, so an
  // implementation widened to "the site responded" fails all four.
  it.each([
    ["blocking our fetcher (would answer 403)"],
    ["thin (would answer an empty body)"],
    ["unbuilt (would answer 404)"],
    ["new (would reset the connection)"],
  ])("%s → true", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: PUBLIC_IP, family: 4 });
    await expect(dnsModule.resolvesInDns("example.com")).resolves.toBe(true);
  });
});

describe("resolvesInDns · same SSRF policy as safeFetch (BUILD §6.4: one guarded fetcher, one meaning of reachable)", () => {
  it.each([
    ["private", "10.0.0.5"],
    ["loopback", "127.0.0.1"],
    ["link-local", "169.254.169.254"],
    ["reserved", "0.0.0.0"],
  ])("a name resolving only to %s space (%s) → false: safeFetch could never connect to it", async (_cls, ip) => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: ip, family: 4 });
    await expect(dnsModule.resolvesInDns("internal.example.com")).resolves.toBe(false);
  });

  it("a public IP literal → true without a lookup; a loopback literal → false", async () => {
    const lookup = vi.spyOn(dns.promises, "lookup");
    await expect(dnsModule.resolvesInDns(PUBLIC_IP)).resolves.toBe(true);
    await expect(dnsModule.resolvesInDns("127.0.0.1")).resolves.toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("resolvesInDns · bounded (DNS_TIMEOUT_MS)", () => {
  it("a resolver that never answers → false once the pinned bound elapses", async () => {
    vi.useFakeTimers();
    vi.spyOn(dns.promises, "lookup").mockImplementation(() => new Promise(() => undefined));

    const pending = dnsModule.resolvesInDns("hangs.example.com");
    await vi.advanceTimersByTimeAsync(DNS_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBe(false);
  });

  it("arms exactly the pinned bound, not a number of its own", async () => {
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: PUBLIC_IP, family: 4 });
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    await dnsModule.resolvesInDns("example.com");
    const usedMs = setTimeoutSpy.mock.calls.map((c) => c[1]).filter((ms) => typeof ms === "number");
    expect(usedMs).toContain(DNS_TIMEOUT_MS);
  });
});
