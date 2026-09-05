// tests/egress/safe-fetch.test.ts
//
// WO-018 test plan rows for `safeFetch()` itself: DNS pinning (the module's
// whole reason to exist), "never throws", the size cap, the timeout bound
// and clamp, and the observability log record's exact field set. Policy
// refusal and the lint rule live in `tests/egress/policy.test.ts` per the
// WO's own row assignment.
//
// No test here makes a real network call — `tests/setup.ts` already fails
// any test that does. `node:dns` and `node:http`/`node:https` are mocked
// directly (the same technique `tests/scan/free/domain.test.ts` uses for
// `dns.lookup`), so every case below is deterministic and fast.
import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Scenario =
  | { type: "response"; statusCode: number; headers?: Record<string, string>; bodyChunks?: Buffer[] }
  | { type: "error"; error: NodeJS.ErrnoException }
  | { type: "hang" };

/** A fake `http.request`/`https.request` implementation. Each call to
 *  `transport.request(...)` consumes the next queued scenario (FIFO), so a
 *  multi-hop redirect can be scripted one entry per hop. Every call's
 *  `options` is recorded so tests can assert exactly what address, host
 *  header and SNI servername the module tried to connect to. */
function installTransport(scenarios: Scenario[]) {
  const calls: Array<http.RequestOptions & { servername?: string }> = [];
  let i = 0;

  const impl = (options: http.RequestOptions, cb: (res: http.IncomingMessage) => void) => {
    calls.push(options);
    const scenario = scenarios[i++];
    const req = new EventEmitter() as unknown as http.ClientRequest;
    (req as unknown as { end: () => void }).end = () => {};
    (req as unknown as { destroy: (err?: Error) => void }).destroy = vi.fn();

    if (!scenario) return req;

    if (scenario.type === "error") {
      queueMicrotask(() => req.emit("error", scenario.error));
    } else if (scenario.type === "response") {
      queueMicrotask(() => {
        const res = new EventEmitter() as unknown as http.IncomingMessage;
        (res as unknown as { statusCode: number }).statusCode = scenario.statusCode;
        (res as unknown as { headers: Record<string, string> }).headers = scenario.headers ?? {};
        (res as unknown as { destroy: () => void }).destroy = vi.fn();
        cb(res);
        queueMicrotask(() => {
          for (const chunk of scenario.bodyChunks ?? []) res.emit("data", chunk);
          res.emit("end");
        });
      });
    }
    // "hang": never calls back and never errors — the module's own deadline
    // timer must be what settles the promise.
    return req;
  };

  const httpSpy = vi.spyOn(http, "request").mockImplementation(impl as typeof http.request);
  const httpsSpy = vi.spyOn(https, "request").mockImplementation(impl as typeof https.request);
  return { calls, httpSpy, httpsSpy };
}

function okResponse(body = "hi"): Scenario {
  return { type: "response", statusCode: 200, bodyChunks: [Buffer.from(body)] };
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("safeFetch · DNS pinning (BP-006: resolve, check, connect to that resolved address)", () => {
  it("connects to the first-resolved address even when a second lookup would return a private one — a rebind after the check does not reach the connection", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    const PUBLIC_IP = "93.184.216.34";
    const PRIVATE_IP = "10.1.2.3";

    const lookupSpy = vi
      .spyOn(dns.promises, "lookup")
      .mockResolvedValueOnce({ address: PUBLIC_IP, family: 4 })
      .mockResolvedValueOnce({ address: PRIVATE_IP, family: 4 })
      .mockImplementation(async () => {
        throw new Error("unexpected extra DNS lookup — the pin should resolve exactly once");
      });

    const { calls } = installTransport([okResponse()]);

    const outcome = await safeFetch("https://example.com/page");

    expect(outcome.ok).toBe(true);
    // The discriminator: exactly one resolution happened, and the address
    // actually connected to is the first one — not a value re-resolved at
    // connect time. A pin-free implementation (fetching by hostname and
    // letting the transport re-resolve) would either call lookup a second
    // time or hand the transport the hostname instead of an address; both
    // are excluded by these two assertions together.
    expect(lookupSpy).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.host).toBe(PUBLIC_IP);
    // Host header and SNI still carry the original name, so vhosting/TLS
    // are unaffected by connecting to the raw address.
    expect((calls[0]?.headers as Record<string, string>)?.Host).toBe("example.com");
    expect((calls[0] as { servername?: string })?.servername).toBe("example.com");
  });

  it("refuses before connecting when the resolved address is private, and opens no socket", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "10.0.0.5", family: 4 });
    const { calls } = installTransport([]);

    const outcome = await safeFetch("https://internal.example.com/");

    expect(outcome).toMatchObject({ ok: false, reason: "blocked_by_policy" });
    expect(calls).toHaveLength(0);
  });
});

describe("safeFetch · never throws", () => {
  const cases: Array<[string, () => void]> = [
    [
      "a DNS resolution failure",
      () => {
        vi.spyOn(dns.promises, "lookup").mockRejectedValue(Object.assign(new Error("nope"), { code: "ENOTFOUND" }));
      },
    ],
    [
      "a connection refusal",
      () => {
        vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
        installTransport([{ type: "error", error: Object.assign(new Error("refused"), { code: "ECONNREFUSED" }) }]);
      },
    ],
    [
      "a policy refusal",
      () => {
        vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "127.0.0.1", family: 4 });
      },
    ],
  ];

  it.each(cases)("resolves rather than rejecting for: %s", async (_label, arrange) => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    arrange();
    await expect(safeFetch("https://example.com/")).resolves.toMatchObject({ ok: false });
  });

  it("resolves rather than rejecting for a malformed URL", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    await expect(safeFetch("not a url at all")).resolves.toMatchObject({ ok: false });
  });
});

describe("safeFetch · size cap (BP-006 NFR: 2 MB, `too_large` not a truncated parse)", () => {
  it("returns too_large for a response over the cap and carries no html", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    const oversized = Buffer.alloc(3_000_000, "a");
    // Split into chunks so streaming accumulation, not a single read, is
    // what the cap is enforced against.
    const chunks = [oversized.subarray(0, 1_000_000), oversized.subarray(1_000_000, 2_500_000), oversized.subarray(2_500_000)];
    installTransport([{ type: "response", statusCode: 200, bodyChunks: chunks }]);

    const outcome = await safeFetch("https://example.com/big");

    expect(outcome).toMatchObject({ ok: false, reason: "too_large" });
    expect(outcome).not.toHaveProperty("html");
  });

  it("respects a caller-supplied maxBytes below the default", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([{ type: "response", statusCode: 200, bodyChunks: [Buffer.alloc(100, "x")] }]);

    const outcome = await safeFetch("https://example.com/small", { maxBytes: 50 });

    expect(outcome).toMatchObject({ ok: false, reason: "too_large" });
  });
});

describe("safeFetch · timeout (BP-006 NFR: default 8000 ms, hard max 15000 ms)", () => {
  // The two bound-and-clamp cases below read the numeric argument of every
  // `setTimeout` the fetcher schedules. The module never hands a timer the
  // clamped `timeoutMs` itself: each one receives `deadline - Date.now()`,
  // the *remaining* budget, so a single clock tick between the start stamp
  // and the timer read 14999 for a 15000 clamp (issue #63 — seen locally
  // and in CI). Freezing the clock with fake timers makes the remaining
  // budget equal the clamp exactly, so the assertion reads the clamped
  // value and nothing about wall-clock resolution. Nothing in either case
  // needs a timer to *fire*: the mocked lookup and transport settle through
  // microtasks, which fake timers leave real, and every deadline timer is
  // cleared on the way out.
  function timerArgumentsUsed(setTimeoutSpy: { mock: { calls: unknown[][] } }): number[] {
    return setTimeoutSpy.mock.calls.map((c) => c[1]).filter((ms): ms is number => typeof ms === "number");
  }

  it("yields timeout when the server hangs past the configured bound", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([{ type: "hang" }]);

    const outcome = await safeFetch("https://example.com/slow", { timeoutMs: 25 });

    expect(outcome).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("uses the 8000 ms default when timeoutMs is omitted", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([okResponse()]);
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    await safeFetch("https://example.com/");

    const usedMs = timerArgumentsUsed(setTimeoutSpy);
    expect(usedMs.length).toBeGreaterThan(0);
    // Every timer the fetch scheduled carries the full default budget.
    expect(usedMs).toEqual(usedMs.map(() => 8000));
  });

  it("clamps a timeoutMs above 15000 to the hard max", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([okResponse()]);
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");

    await safeFetch("https://example.com/", { timeoutMs: 999_999 });

    const usedMs = timerArgumentsUsed(setTimeoutSpy);
    expect(usedMs.length).toBeGreaterThan(0);
    // Every timer the fetch scheduled carries exactly the clamped value —
    // never the caller's 999_999, and never one tick short of the clamp.
    expect(usedMs).toEqual(usedMs.map(() => 15000));
  });
});

describe("safeFetch · observability (BP-006 NFR: host, outcome reason, status, bytes, duration — never a body)", () => {
  it("logs exactly those five fields on a successful fetch", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([okResponse("hello")]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await safeFetch("https://example.com/");

    expect(logSpy).toHaveBeenCalledTimes(1);
    const record = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(Object.keys(record).sort()).toEqual(["bytes", "duration", "host", "reason", "status"].sort());
    expect(record.host).toBe("example.com");
    expect(record.status).toBe(200);
    expect(record.bytes).toBe(5);
    expect(typeof record.duration).toBe("number");
    expect(JSON.stringify(record)).not.toContain("hello");
  });

  it("logs the same five fields, with a null status, on a policy refusal — never a body", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "127.0.0.1", family: 4 });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await safeFetch("https://internal.example.com/");

    const record = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(Object.keys(record).sort()).toEqual(["bytes", "duration", "host", "reason", "status"].sort());
    expect(record.reason).toBe("blocked_by_policy");
    expect(record.status).toBeNull();
  });
});

describe("safeFetch · robots port (BP-006: on by default, delegated to WO-020's reader through a narrow port)", () => {
  it("blocks with robots_disallowed when the wired port reports the origin disallows this agent", async () => {
    const { safeFetch, __setRobotsPortForTesting } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    __setRobotsPortForTesting(async () => ({
      ok: true,
      origin: "https://example.com",
      readAt: new Date(),
      disallowsAll: false,
      disallowedAgents: { "reachkit-measure": true },
      sitemaps: [],
      absent: false,
    }));

    const outcome = await safeFetch("https://example.com/");

    expect(outcome).toMatchObject({ ok: false, reason: "robots_disallowed" });
    __setRobotsPortForTesting(null);
  });

  it("does not consult the port when respectRobots is false", async () => {
    const { safeFetch, __setRobotsPortForTesting } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([okResponse()]);
    const port = vi.fn(async () => ({
      ok: true as const,
      origin: "https://example.com",
      readAt: new Date(),
      disallowsAll: true,
      disallowedAgents: {},
      sitemaps: [],
      absent: false,
    }));
    __setRobotsPortForTesting(port);

    const outcome = await safeFetch("https://example.com/", { respectRobots: false });

    expect(outcome.ok).toBe(true);
    expect(port).not.toHaveBeenCalled();
    __setRobotsPortForTesting(null);
  });

  it("never blocks on the default (unwired) port — 'could not determine' is not a fabricated disallow", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockResolvedValue({ address: "93.184.216.34", family: 4 });
    installTransport([okResponse()]);

    const outcome = await safeFetch("https://example.com/");

    expect(outcome.ok).toBe(true);
  });
});

describe("safeFetch · redirects (BP-006: each hop re-checked)", () => {
  it("follows a redirect to a public host and returns the final response", async () => {
    const { safeFetch } = await import("../../src/lib/egress/safe-fetch");
    vi.spyOn(dns.promises, "lookup").mockImplementation(async (hostname) => {
      if (hostname === "a.example.com") return { address: "93.184.216.34", family: 4 } as never;
      if (hostname === "b.example.com") return { address: "93.184.216.35", family: 4 } as never;
      throw new Error(`unexpected hostname ${String(hostname)}`);
    });
    installTransport([
      { type: "response", statusCode: 301, headers: { location: "https://b.example.com/final" } },
      okResponse("final page"),
    ]);

    const outcome = await safeFetch("https://a.example.com/start");

    expect(outcome).toMatchObject({ ok: true, url: "https://b.example.com/final" });
  });
});
