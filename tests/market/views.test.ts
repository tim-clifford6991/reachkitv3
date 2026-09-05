// tests/market/views.test.ts — BUILD §6.6
//
// The market leaves read SERPs through narrow structural views rather than
// through the vendor client's own type, so that "this module buys nothing"
// stays provable by the absence of the import. That trick is only sound
// while the vendor's real value still satisfies the views — which is what
// this file asserts, from the test side, where importing the vendor type
// costs nothing.
import { describe, expect, it } from "vitest";
import type { SerpResult } from "../../src/lib/vendors/dataforseo/types.ts";
import type {
  MarketSerp,
  MarketSerpOrganic,
  QuestionView,
  SelectedSearchView,
} from "../../src/lib/market/views.ts";
import { checkCoherence } from "../../src/lib/market/coherence/check.ts";
import { deriveRivals } from "../../src/lib/market/rivals/derive.ts";

const VENDOR_SERP: SerpResult = {
  organic: [{ position: 1, domain: "rival.com", url: "https://rival.com/x", title: "Rival" }],
  aiOverview: { present: true, asynchronousAiOverview: true, referenceDomains: ["rival.com"] },
};

describe("A vendor SerpResult satisfies every view the market leaves read", () => {
  it("assigns to MarketSerp, MarketSerpOrganic and the two card readers, with no conversion", () => {
    const asMarketSerp: MarketSerp = VENDOR_SERP;
    const asOrganicOnly: MarketSerpOrganic = VENDOR_SERP;
    expect(asMarketSerp.aiOverview.referenceDomains).toEqual(["rival.com"]);
    expect(asOrganicOnly.organic).toHaveLength(1);

    // The real values reach the real functions untouched.
    expect(checkCoherence({ serps: [VENDOR_SERP], measuredCount: 0 })).toEqual({
      verdict: "unjudgeable",
      measuredCount: 0,
    });
    expect(deriveRivals({ serps: [VENDOR_SERP], ownDomain: "customer.com" }).rivals[0]).toMatchObject({
      domain: "rival.com",
      top10Appearances: 1,
      aiCitations: 1,
    });
  });

  it("the vendor's zero-result SERP is a MarketSerp too — it needs no special arm", () => {
    // The shape `serpOrganic` returns for a SERP with no organic rows and no
    // AI Overview. Declared here rather than imported: the vendor module
    // reaches the environment at load, and only its *type* is under test.
    const vendorEmpty: SerpResult = {
      organic: [],
      aiOverview: { present: false, asynchronousAiOverview: false, referenceDomains: [] },
    };
    const empty: MarketSerp = vendorEmpty;
    expect(empty.organic).toEqual([]);
    expect(empty.aiOverview.present).toBe(false);
  });
});

describe("The two shapes the questions leaf will own", () => {
  it("a selected search and a question, as the cards read them", () => {
    const search: SelectedSearchView = { keyword: "best onboarding software", volume: 1900 };
    const question: QuestionView = {
      id: "q1",
      text: "What's the best onboarding software?",
      phrasing: "template",
      // A fuller value — the shape the questions leaf declares — still
      // satisfies the view it is read through.
      search: { ...search, intent: "decision", score: 9.9, rank: 1 } as SelectedSearchView,
    };
    expect(question.search.keyword).toBe("best onboarding software");
  });
});
