// BUILD §4.2 — the 24-hour window, and what is retried inside it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyEnvFixture } from "../env-fixture";
import {
  FIRST_PAGE_RETRY_MINUTES,
  FIRST_PAGE_RETRY_WINDOW_H,
} from "../../../src/lib/config/constants";
import { blankLead, memoryStore, newMemoryState, type MemoryState } from "./memory-store";
import { sendCalls, sendMock, sendOutcome } from "./send-mock";

applyEnvFixture();

vi.mock("@/lib/mail/send", () => sendMock());

const { deliverFirstPage, dueFirstPageDeliveries, nextAttemptAt } = await import(
  "../../../src/lib/mail/leads/giveaway"
);
const { registerDraftWriter, registerOfferReader } = await import(
  "../../../src/lib/mail/leads/ports"
);
const { setLeadStore } = await import("../../../src/lib/mail/leads/store");

let state: MemoryState;
let draftCalls: number;

const START = new Date("2026-09-05T00:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function at(offsetMs: number): Date {
  return new Date(START.getTime() + offsetMs);
}

/** A vendor failure the caller may retry: it names a window. */
const RETRIABLE = { sent: false, reason: "vendor", retryUntil: new Date(START.getTime() + HOUR) };
/** A permanent rejection: no window, so there is nothing to wait for. */
const PERMANENT = { sent: false, reason: "vendor" };

function pendingLead(over: Record<string, unknown> = {}) {
  return blankLead({
    id: "lead-1",
    email: "anna@example.com",
    domain: "acme.com",
    scan_id: "scan-1",
    ...over,
  });
}

beforeEach(() => {
  state = newMemoryState();
  setLeadStore(memoryStore(state));
  sendCalls.length = 0;
  sendOutcome.next = { sent: true, id: "vendor-1" };
  draftCalls = 0;
  registerOfferReader(async () => ({
    read: true,
    page: {
      title: "How Acme compares to Rival",
      pagesFound: 6,
      targetQuery: "acme vs rival",
      volume: { kind: "measured", value: 1900, at: START },
      rival: { kind: "measured", value: "rival.com", at: START },
      format: "comparison_page",
    },
  }));
  registerDraftWriter(async () => {
    draftCalls += 1;
    return { written: true, title: "The page", markdown: "# The page\n" };
  });
});

afterEach(() => {
  setLeadStore(null);
  registerOfferReader(null);
  registerDraftWriter(null);
});

describe('REQ-010 c8 — "what is retried is whichever of the two things they are owed exists"', () => {
  it("a written page is retried, never rewritten — one generateDraft call across every attempt", async () => {
    state.leads = [pendingLead()];
    sendOutcome.next = RETRIABLE;

    for (let attempt = 0; attempt < FIRST_PAGE_RETRY_MINUTES.length + 1; attempt++) {
      await deliverFirstPage("lead-1", at(attempt * MINUTE));
    }

    expect(draftCalls).toBe(1);
    expect(sendCalls.length).toBeGreaterThan(1);
    expect(sendCalls.every((call) => call.kind === "first-page")).toBe(true);
    expect(state.leads[0]?.first_page_state).toBe("written");
  });

  it("an unwritten page retries the unavailable notice instead", async () => {
    registerDraftWriter(async () => ({ written: false, refused: false }));
    state.leads = [pendingLead()];
    sendOutcome.next = RETRIABLE;

    await deliverFirstPage("lead-1", at(0));
    await deliverFirstPage("lead-1", at(5 * MINUTE));

    expect(sendCalls.map((call) => call.kind)).toEqual([
      "first-page-unavailable",
      "first-page-unavailable",
    ]);
    expect(state.leads[0]?.first_page_state).toBe("pending");
  });
});

describe('REQ-010 c8 — "Delivery to that address is retried for 24 hours from the first attempt"', () => {
  it("attempts land at FIRST_PAGE_RETRY_MINUTES from first_page_first_attempt_at, from the pin and not a literal", () => {
    const lead = pendingLead({
      first_page_first_attempt_at: START.toISOString(),
      first_page_attempts: 1,
    });
    expect(nextAttemptAt(lead)).toEqual(at(FIRST_PAGE_RETRY_MINUTES[0] * MINUTE));

    const later = { ...lead, first_page_attempts: 3 };
    expect(nextAttemptAt(later)).toEqual(at((FIRST_PAGE_RETRY_MINUTES[2] as number) * MINUTE));

    // Six retries after the first attempt, the last landing on the window's
    // edge — and past the end of the list there is nothing further due.
    expect(FIRST_PAGE_RETRY_MINUTES).toEqual([5, 30, 120, 360, 720, 1440]);
    expect(FIRST_PAGE_RETRY_MINUTES[FIRST_PAGE_RETRY_MINUTES.length - 1]).toBe(
      FIRST_PAGE_RETRY_WINDOW_H * 60
    );
    expect(nextAttemptAt({ ...lead, first_page_attempts: 7 })).toBeNull();
  });

  it("a never-attempted lead is due now, and a lead waiting out its spacing is not", async () => {
    state.leads = [
      pendingLead({ id: "fresh" }),
      pendingLead({
        id: "waiting",
        first_page_first_attempt_at: START.toISOString(),
        first_page_attempts: 1,
      }),
    ];

    await expect(dueFirstPageDeliveries(START)).resolves.toEqual(["fresh"]);
    await expect(
      dueFirstPageDeliveries(at(FIRST_PAGE_RETRY_MINUTES[0] * MINUTE))
    ).resolves.toEqual(["fresh", "waiting"]);
  });

  it("at 24 hours first_page_state becomes abandoned and no further attempt is made", async () => {
    state.leads = [
      pendingLead({
        first_page_state: "written",
        first_page_title: "The page",
        first_page_markdown: "# The page\n",
        first_page_first_attempt_at: START.toISOString(),
        first_page_attempts: 6,
        first_page_failure: "delivery-failed",
      }),
    ];

    await expect(deliverFirstPage("lead-1", at(FIRST_PAGE_RETRY_WINDOW_H * HOUR))).resolves.toEqual(
      { delivered: "none", cause: "delivery-failed" }
    );

    expect(sendCalls).toEqual([]);
    expect(state.leads[0]?.first_page_state).toBe("abandoned");

    // No further attempt: a later call does not reopen the window.
    await deliverFirstPage("lead-1", at(FIRST_PAGE_RETRY_WINDOW_H * HOUR + HOUR));
    expect(sendCalls).toEqual([]);
  });

  it("an abandoned lead is recorded and read back as not delivered anywhere", async () => {
    state.leads = [
      pendingLead({
        first_page_state: "abandoned",
        first_page_failure: "delivery-failed",
      }),
    ];

    await expect(deliverFirstPage("lead-1", at(0))).resolves.toEqual({
      delivered: "none",
      cause: "delivery-failed",
    });
    expect(state.leads[0]?.page_delivered_at).toBeNull();
    expect(state.leads[0]?.sequence_state).toBeNull();
    await expect(dueFirstPageDeliveries(at(HOUR))).resolves.toEqual([]);
  });

  it("the window is measured from the first attempt, not from each one", async () => {
    state.leads = [pendingLead()];
    sendOutcome.next = RETRIABLE;

    await deliverFirstPage("lead-1", START);
    expect(state.leads[0]?.first_page_first_attempt_at).toBe(START.toISOString());

    // A second attempt an hour later does not move the anchor, so the
    // window still closes 24 hours after the first.
    await deliverFirstPage("lead-1", at(HOUR));
    expect(state.leads[0]?.first_page_first_attempt_at).toBe(START.toISOString());
    expect(state.leads[0]?.first_page_attempts).toBe(2);
  });
});

describe("the rests-on row, discharged: a permanent rejection ends the window early", () => {
  it("a non-retriable vendor rejection abandons immediately rather than spending six attempts", async () => {
    state.leads = [pendingLead()];
    sendOutcome.next = PERMANENT;

    await expect(deliverFirstPage("lead-1", START)).resolves.toEqual({
      delivered: "none",
      cause: "delivery-failed",
    });

    expect(sendCalls).toHaveLength(1);
    expect(state.leads[0]?.first_page_state).toBe("abandoned");
    // And nothing is shown or recorded as delivered.
    expect(state.leads[0]?.page_delivered_at).toBeNull();
  });

  it("a retriable failure leaves the lead due for its next attempt instead", async () => {
    state.leads = [pendingLead()];
    sendOutcome.next = RETRIABLE;

    await deliverFirstPage("lead-1", START);
    expect(state.leads[0]?.first_page_state).toBe("written");
    await expect(
      dueFirstPageDeliveries(at(FIRST_PAGE_RETRY_MINUTES[0] * MINUTE))
    ).resolves.toEqual(["lead-1"]);
  });

  it("a permanent rejection of the notice abandons it too — the same rule for both things owed", async () => {
    registerDraftWriter(async () => ({ written: false, refused: true }));
    state.leads = [pendingLead()];
    sendOutcome.next = PERMANENT;

    await expect(deliverFirstPage("lead-1", START)).resolves.toEqual({
      delivered: "none",
      cause: "writing-refused",
    });
    expect(state.leads[0]).toMatchObject({
      first_page_state: "abandoned",
      first_page_failure: "writing-refused",
    });
  });
});
