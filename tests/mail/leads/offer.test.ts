// BUILD §4.2 — what is on offer, and the arm where nothing is.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyEnvFixture } from "../env-fixture";
import { memoryStore, newMemoryState, type MemoryState } from "./memory-store";

applyEnvFixture();

const { firstPageOffer, readFirstPageOffer } = await import("../../../src/lib/mail/leads/offer");
const { setLeadStore } = await import("../../../src/lib/mail/leads/store");
const { registerOfferReader } = await import("../../../src/lib/mail/leads/ports");

let state: MemoryState;

/** One `opportunities` row as the engine writes it (§7's own shape). The
 *  default offer reader projects these six facts and nothing else. */
function opportunity(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "How Acme compares to Rival for onboarding",
    target_query: "acme vs rival",
    volume: 1900,
    type: "comparison_page",
    evidence: { rival: "rival.com" },
    created_at: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  state = newMemoryState();
  setLeadStore(memoryStore(state));
  registerOfferReader(null);
});

afterEach(() => {
  setLeadStore(null);
  registerOfferReader(null);
});

describe('REQ-010 c1 — "it shows the title of the first page ReachKit would write, how many pages in total were found worth writing for that domain, the search that page targets, the rival that page would take ground from, the page\'s format"', () => {
  it("an offered report returns all six facts", async () => {
    state.opportunities.set("scan-1", [opportunity(), opportunity({ title: "Second" })]);

    const offer = await firstPageOffer("scan-1");
    expect(offer).toEqual({
      offered: true,
      title: "How Acme compares to Rival for onboarding",
      pagesFound: 2,
      targetQuery: "acme vs rival",
      volume: { kind: "measured", value: 1900, at: new Date("2026-09-01T00:00:00.000Z") },
      rival: { kind: "measured", value: "rival.com", at: new Date("2026-09-01T00:00:00.000Z") },
      format: "comparison_page",
    });
  });

  it("a page found without a rival returns rival as unmeasured, never a substituted name", async () => {
    state.opportunities.set("scan-1", [opportunity({ evidence: {} })]);

    const offer = await firstPageOffer("scan-1");
    if (!offer.offered) throw new Error("expected an offer");
    expect(offer.rival).toEqual({
      kind: "unmeasured",
      reason: "undeterminable",
      at: new Date("2026-09-01T00:00:00.000Z"),
    });
    // The mutation this guards: coalesce the missing rival to the domain,
    // to "n/a", or to the empty string, and REQ-091 c3's written line never
    // renders because the card is handed something that looks measured.
    expect(JSON.stringify(offer.rival)).not.toContain("value");
  });

  it("an unmeasured volume travels as unmeasured, and a real zero travels as zero — never coalesced together", async () => {
    state.opportunities.set("scan-a", [opportunity({ volume: null })]);
    state.opportunities.set("scan-b", [opportunity({ volume: 0 })]);

    const absent = await firstPageOffer("scan-a");
    const zero = await firstPageOffer("scan-b");
    if (!absent.offered || !zero.offered) throw new Error("expected offers");

    expect(absent.volume.kind).toBe("unmeasured");
    expect(zero.volume).toMatchObject({ kind: "zero", value: 0 });
  });
});

describe('REQ-010 c6 — "then it states in writing that no page is offered for this domain and shows no control to have one emailed; no page is invented to fill the slot"', () => {
  it("a scan with no qualifying opportunity returns { offered: false } and no other field", async () => {
    state.opportunities.set("scan-1", []);

    const offer = await firstPageOffer("scan-1");
    expect(offer).toEqual({ offered: false });
    // A surface cannot render a card from this arm: there is no title on it
    // to render, which is what makes "no card" the only possible rendering.
    expect(Object.keys(offer)).toEqual(["offered"]);
  });

  it("no page is invented: with no opportunities, nothing about the offer is fabricated", async () => {
    const offer = await firstPageOffer("scan-never-seen");
    expect(offer).toEqual({ offered: false });
  });
});

describe("a scan whose offer could not be read is not a scan with no offer", () => {
  it("readFirstPageOffer keeps the two apart, so the giveaway never tells a founder their scan found nothing", async () => {
    state.failOpportunityRead = true;
    await expect(readFirstPageOffer("scan-1")).resolves.toEqual({ read: false });
  });

  it("the card, which has nothing honest to show either way, renders no offer", async () => {
    state.failOpportunityRead = true;
    await expect(firstPageOffer("scan-1")).resolves.toEqual({ offered: false });
  });
});

describe('REQ-010 c5 — "when they use the report, then every other part of it remains fully readable"', () => {
  it("firstPageOffer reads the report and writes nothing, and takes no lead id", async () => {
    state.opportunities.set("scan-1", [opportunity()]);

    await firstPageOffer("scan-1");
    // Nothing about a lead was created, read or required to produce the
    // offer: this module's half of "the rest of the report is never held
    // back to force the trade".
    expect(state.leads).toEqual([]);
    expect(firstPageOffer.length).toBe(1);
  });
});

describe("the ranking is the opportunity engine's, and this module holds none of its own", () => {
  it("a registered reader replaces the default projection wholesale", async () => {
    registerOfferReader(async () => ({
      read: true,
      page: {
        title: "from the engine",
        pagesFound: 9,
        targetQuery: "q",
        volume: { kind: "unmeasured", reason: "not_attempted", at: new Date(0) },
        rival: { kind: "unmeasured", reason: "not_attempted", at: new Date(0) },
        format: "answer_page",
      },
    }));

    const offer = await firstPageOffer("scan-1");
    if (!offer.offered) throw new Error("expected an offer");
    expect(offer.title).toBe("from the engine");
    expect(offer.pagesFound).toBe(9);
  });

  it("the default takes the engine's first row and sorts nothing of its own", async () => {
    state.opportunities.set("scan-1", [
      opportunity({ title: "written first", volume: 10 }),
      opportunity({ title: "higher volume", volume: 50_000 }),
    ]);

    const offer = await firstPageOffer("scan-1");
    if (!offer.offered) throw new Error("expected an offer");
    // Deliberate: a re-sort by volume here would be a second ranking, in
    // the one place BP-029 decision 5 says there must not be one.
    expect(offer.title).toBe("written first");
  });
});
