// tests/scan/free/stages.test.ts
//
// WO-281 `## Test plan` (criteria quoted verbatim from `requirements/
// REQ-003.md`, carried from WO-060) — the ordering, heartbeat, cut-off and
// single-ending suites for `progress`, `STAGES` and `StageName`.
//
// `progress()` reads `scans` through `@/lib/db`'s `dbAdmin()` only to
// decide whether a `scanId` is known at all (`src/lib/scan/stages.ts`'s
// own header explains why); that module is mocked here wholesale, exactly
// as `tests/scan/free/admission-check.test.ts` mocks it one layer over.
// No live-DB suite is added by this file.
//
// Every other event this suite observes is driven directly through this
// module's own producer functions (`enterStage`, `exitStage`,
// `emitEnding`) — the stand-in for BP-012's not-yet-built `runScan`
// (`stages.ts`'s own header, rule 4.2).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ dbAdmin: vi.fn() }));

import { dbAdmin } from "@/lib/db";
import { STAGES, enterStage, exitStage, emitEnding, progress, type StageEvent, type StageName } from "@/lib/scan/stages";
import type { Ending } from "@/lib/scan/ceilings";

let scanCounter = 0;
function freshScanId(): string {
  scanCounter += 1;
  return `stages-scan-${scanCounter}`;
}

function installKnownScan(): void {
  vi.mocked(dbAdmin).mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({ data: [{ id: "x" }], error: null }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof dbAdmin>);
}

function installUnknownScan(): void {
  vi.mocked(dbAdmin).mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof dbAdmin>);
}

beforeEach(() => {
  installKnownScan();
});

afterEach(() => {
  vi.mocked(dbAdmin).mockReset();
  vi.useRealTimers();
});

async function collectUntilEnding(iterable: AsyncIterable<StageEvent>, max = 200): Promise<StageEvent[]> {
  const collected: StageEvent[] = [];
  for await (const event of iterable) {
    collected.push(event);
    if ("ending" in event) break;
    if (collected.length >= max) break;
  }
  return collected;
}

// ── REQ-003 c1 — six named stages, in order ────────────────────────────

describe(
  'REQ-003 c1 — "Given a scan is running … when the visitor watches the page, then it shows named stages that advance as work completes, never an unlabelled spinner or an indeterminate bar alone."',
  () => {
    it("stages/order · STAGES is exactly the six dataset-boundary handles, in order", () => {
      expect(STAGES).toEqual([
        "reading_your_site",
        "reading_access_rules",
        "reading_your_market",
        "checking_your_presence",
        "asking_the_twelve",
        "scoring",
      ]);
    });

    it("stages/order · a scan driven through the pipeline emits entry then exit for each stage, in order, none repeated or skipped", async () => {
      const scanId = freshScanId();
      const collected = collectUntilEnding(progress(scanId));

      for (const stage of STAGES) {
        enterStage(scanId, stage);
        exitStage(scanId, stage);
      }
      const ending: Ending = { kind: "report", complete: true, stoppedReason: "complete" };
      emitEnding(scanId, ending);

      const events = await collected;
      const withoutEnding = events.filter((e): e is { stage: StageName; done: boolean } => "stage" in e);
      expect(withoutEnding.map((e) => `${e.stage}:${e.done}`)).toEqual(
        STAGES.flatMap((stage) => [`${stage}:false`, `${stage}:true`])
      );
      expect(events.at(-1)).toEqual({ ending });
    });

    it("stages/advance · a stage advances on completed work, not on a clock", async () => {
      vi.useFakeTimers();
      const scanId = freshScanId();
      const iterator = progress(scanId)[Symbol.asyncIterator]();

      // Advance the clock arbitrarily with no work completing.
      const nextPromise = iterator.next();
      await vi.advanceTimersByTimeAsync(20_000);
      // Only a heartbeat may have fired by now (well inside 30 s) — no
      // `done: true` for any stage, because none was reported.
      enterStage(scanId, "reading_your_site");
      exitStage(scanId, "reading_your_site");
      const first = await nextPromise;
      expect(first.value).toEqual({ stage: "reading_your_site", done: false });
    });
  }
);

// ── REQ-003 c1 — heartbeat ──────────────────────────────────────────────

describe('REQ-003 c1, "never an unlabelled spinner or an indeterminate bar alone"', () => {
  it("stages/heartbeat · a slow third party never reads as stuck, and never as progress", async () => {
    vi.useFakeTimers();
    const scanId = freshScanId();
    const iterator = progress(scanId)[Symbol.asyncIterator]();

    const heartbeats: StageEvent[] = [];
    const pump = (async () => {
      for (let i = 0; i < 3; i++) {
        const { value } = await iterator.next();
        heartbeats.push(value);
      }
    })();

    await vi.advanceTimersByTimeAsync(95_000); // stalled 95 s, no stage reported

    await pump;
    expect(heartbeats).toHaveLength(3);
    for (const event of heartbeats) {
      expect(event).toEqual({ heartbeat: true });
      expect(event).not.toHaveProperty("stage");
    }
  });
});

// ── REQ-003 c5 / c11 — cut-off stages ────────────────────────────────────

describe(
  'REQ-003 c5 — "… when it reaches 90 seconds, then measuring stops and the visitor is shown the report of everything measured by that point, with the rest reported as unmeasured …"',
  () => {
    it("stages/cutoff · a cut-off stage emits no completion", async () => {
      const scanId = freshScanId();
      const collected = collectUntilEnding(progress(scanId));

      enterStage(scanId, "reading_your_site");
      exitStage(scanId, "reading_your_site");
      enterStage(scanId, "reading_access_rules");
      exitStage(scanId, "reading_access_rules");
      enterStage(scanId, "asking_the_twelve"); // cut off mid-stage — no exitStage
      const ending: Ending = { kind: "report", complete: false, stoppedReason: "time_ceiling" };
      emitEnding(scanId, ending);

      const events = await collected;
      expect(events).toEqual([
        { stage: "reading_your_site", done: false },
        { stage: "reading_your_site", done: true },
        { stage: "reading_access_rules", done: false },
        { stage: "reading_access_rules", done: true },
        { stage: "asking_the_twelve", done: false },
        { ending },
      ]);
      expect(events.filter((e) => "stage" in e && e.stage === "asking_the_twelve" && e.done)).toHaveLength(0);
    });
  }
);

describe(
  'REQ-003 c11 — "… all remaining work is skipped, and the visitor is shown the report of everything measured up to that point …"',
  () => {
    it("stages/cutoff · the spend ceiling ends the stream the same way, and nothing after it is emitted", async () => {
      const scanId = freshScanId();
      const collected = collectUntilEnding(progress(scanId));

      enterStage(scanId, "reading_your_site");
      exitStage(scanId, "reading_your_site");
      enterStage(scanId, "asking_the_twelve");
      const ending: Ending = { kind: "report", complete: false, stoppedReason: "spend_ceiling" };
      emitEnding(scanId, ending);
      // Attempts after the ending are dropped, not delivered (WO-060 step 11).
      exitStage(scanId, "asking_the_twelve");
      enterStage(scanId, "scoring");

      const events = await collected;
      expect(events.at(-1)).toEqual({ ending });
      expect(events.filter((e) => "stage" in e && e.stage === "scoring")).toHaveLength(0);
      expect(events.filter((e) => "stage" in e && e.stage === "asking_the_twelve" && e.done)).toHaveLength(0);
    });
  }
);

// ── REQ-003 c4 — exactly one ending ──────────────────────────────────────

describe(
  'REQ-003 c4 — "Given a scan that cannot complete at all, when it ends, then the visitor is told in one written line that the measurement failed and is offered a manual retry (the retry window is REQ-001\'s)."',
  () => {
    it.each<Ending>([
      { kind: "report", complete: true, stoppedReason: "complete" },
      { kind: "report", complete: false, stoppedReason: "time_ceiling" },
      { kind: "report", complete: false, stoppedReason: "spend_ceiling" },
      { kind: "no_report", stoppedReason: "failed" },
    ])("stages/ending · exactly one ending, then the stream closes — %j", async (ending) => {
      const scanId = freshScanId();
      const iterator = progress(scanId)[Symbol.asyncIterator]();
      const pending = iterator.next();
      emitEnding(scanId, ending);
      const first = await pending;
      expect(first).toEqual({ done: false, value: { ending } });

      const second = await iterator.next();
      expect(second.done).toBe(true);

      // A second ending is never delivered even if the driver mistakenly
      // reports one.
      emitEnding(scanId, { kind: "report", complete: true, stoppedReason: "complete" });
      const lateSubscriber = collectUntilEnding(progress(scanId));
      const events = await lateSubscriber;
      expect(events).toEqual([{ ending }]);
    });

    // TST-036 (WO-281 validation report): every case above publishes its
    // `ending` synchronously, in the same tick as the pull that observes
    // it — the generator is still draining its own *replay* for-loop
    // (`for (const event of stream.events) { yield event; if ("ending" in
    // event) return; }`) at that point, never the live `while (true)`
    // loop's own, independent halt-on-ending. That leaves the live path a
    // subscriber watching a real, still-running scan actually takes —
    // idle, with a listener registered, `await`ing `Promise.race(...)` —
    // unexercised: `stages.ts`'s live-listener `if ("ending" in event)
    // return;` survives deletion against all of this file's other cases.
    // This case forces the generator genuinely idle first (real
    // macrotask ticks, nothing queued) before publishing, so it is the
    // live halt, not the replay loop's, that must fire.
    it("stages/ending · a live-published ending reaches a genuinely idle subscriber, and closes the stream (TST-036)", async () => {
      const scanId = freshScanId();
      const iterator = progress(scanId)[Symbol.asyncIterator]();

      let settled = false;
      const pending = iterator.next().then((result) => {
        settled = true;
        return result;
      });

      // Real macrotask ticks with nothing published: lets `progress()` run
      // past `scanExists`, drain the empty replay for-loop, register its
      // live listener, and reach its own idle `await Promise.race(...)` —
      // the branch this case exists to reach, as opposed to a synchronous
      // `emitEnding` call right after `iterator.next()`, which never gives
      // the generator a chance to get that far before the ending is
      // already sitting in `stream.events` for the replay loop to find.
      for (let i = 0; i < 5; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      expect(settled).toBe(false); // still idle — nothing published yet

      const ending: Ending = { kind: "report", complete: true, stoppedReason: "complete" };
      emitEnding(scanId, ending);

      // Guarded with a timeout, not an unbounded await: if the live halt
      // regresses, the generator falls through to `continue` instead of
      // returning and this pull never settles — a hang is the legitimate
      // failure signal here, but an unbounded one in CI is its own defect.
      const first = await Promise.race([
        pending,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("timed out: the live-listener halt-on-ending did not fire (TST-036)")),
            2000
          )
        ),
      ]);
      expect(first).toEqual({ done: false, value: { ending } });

      const second = await Promise.race([
        iterator.next(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("timed out: the stream did not close after the live ending (TST-036)")),
            3000
          )
        ),
      ]);
      expect(second.done).toBe(true);
    });
  }
);

// ── REQ-003's non-goals — shape ──────────────────────────────────────────

describe('REQ-003\'s non-goal — "No queue position, percentage estimate, or countdown timer."', () => {
  it("stages/shape · the stream carries no estimate, and the type has exactly three arms", async () => {
    function classify(event: StageEvent): "stage" | "heartbeat" | "ending" {
      if ("stage" in event) return "stage";
      if ("heartbeat" in event) return "heartbeat";
      if ("ending" in event) return "ending";
      // Exhaustiveness — a fourth arm added to `StageEvent` without a
      // branch here fails `npm run typecheck`, not just at runtime.
      return ((x: never) => {
        throw new Error(`unreachable: ${JSON.stringify(x)}`);
      })(event);
    }

    const scanId = freshScanId();
    const collected = collectUntilEnding(progress(scanId));
    enterStage(scanId, "reading_your_site");
    exitStage(scanId, "reading_your_site");
    const ending: Ending = { kind: "report", complete: true, stoppedReason: "complete" };
    emitEnding(scanId, ending);
    const events = await collected;

    for (const event of events) {
      expect(["stage", "heartbeat", "ending"]).toContain(classify(event));
      const keys = Object.keys(event).join(",");
      expect(keys.toLowerCase()).not.toMatch(/percent|eta|remaining|position|queue|countdown/);
    }
  });
});

describe('REQ-003\'s non-goal — "No spend, cost or cap figure shown to a visitor."', () => {
  it("stages/shape · no cost figure on the stream, including the ending arm", async () => {
    const scanId = freshScanId();
    const collected = collectUntilEnding(progress(scanId));
    enterStage(scanId, "scoring");
    exitStage(scanId, "scoring");
    emitEnding(scanId, { kind: "report", complete: false, stoppedReason: "spend_ceiling" });
    const events = await collected;

    // A key check, not a substring check on the whole payload: `Ending`
    // legitimately carries the *label* `stoppedReason: 'spend_ceiling'`
    // (REQ-003's own vocabulary, not a figure) — what must never appear is
    // a *field* naming a cost, a cap or a cent amount.
    function keysOf(event: StageEvent): string[] {
      if ("ending" in event) return Object.keys(event.ending);
      return Object.keys(event);
    }
    for (const event of events) {
      for (const key of keysOf(event)) {
        expect(key.toLowerCase()).not.toMatch(/cent|cost|cap|spend/);
      }
    }
  });
});

// ── Unknown scanId ────────────────────────────────────────────────────

describe("stages/unknown · a scanId with no scans row yields an immediately exhausted iterable", () => {
  it("produces no event at all", async () => {
    installUnknownScan();
    const events: StageEvent[] = [];
    for await (const event of progress("no-such-scan")) {
      events.push(event);
    }
    expect(events).toEqual([]);
  });

  it("a dbAdmin read error is treated the same as unknown, not as 'stream forever'", async () => {
    vi.mocked(dbAdmin).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof dbAdmin>);
    const events: StageEvent[] = [];
    for await (const event of progress("errored-scan")) {
      events.push(event);
    }
    expect(events).toEqual([]);
  });
});

// ── Module-load assertion (WO-281 `## Steps` step 8) ─────────────────────

describe("WO-281 `## Steps` step 8 — STAGES is exactly six, none duplicated", () => {
  it("STAGES.length === 6 and every entry is unique", () => {
    expect(STAGES.length).toBe(6);
    expect(new Set(STAGES).size).toBe(6);
  });
});
