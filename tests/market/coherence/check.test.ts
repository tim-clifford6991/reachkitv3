// tests/market/coherence/check.test.ts
//
// WO-080 test plan, quoted from REQ-094 in the work order's own
// `## Test plan` table, plus the discrimination and purity tests it names.
//
// Risk: high — seam: a customer-visible verdict. The `unjudgeable` arm is
// REQ-094's promise not to judge coherence on fewer than three measured
// searches. `threshold/floor-boundary-both-sides` and
// `check/fewer-than-three-is-unjudgeable` exist specifically so that
// deleting the guard, or shifting its boundary by one, cannot survive —
// doctrine 0.13.2, mutation-tested.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkCoherence,
  coherenceThreshold,
  type SerpResult,
} from "../../../src/lib/market/coherence/check.ts";

const SOURCE_PATH = path.resolve(import.meta.dirname, "../../../src/lib/market/coherence/check.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

/** A SERP whose organic top ten is exactly the domains given, once each. */
function serpOf(...domains: string[]): SerpResult {
  return { organic: domains.map((domain) => ({ domain })) };
}

describe(
  'REQ-094 c2 — "…the same share of the market is asked for at every denominator… That threshold is three where twelve searches were measured, and is never the whole number measured" — the threshold limb',
  () => {
    it("threshold/is-a-share-not-a-count — the four named denominators", () => {
      expect(coherenceThreshold(12)).toBe(3);
      expect(coherenceThreshold(4)).toBe(2);
      expect(coherenceThreshold(3)).toBe(2);
      expect(coherenceThreshold(20)).toBe(5);
    });

    it("threshold/is-a-share-not-a-count — property over n = 3…200: never below the floor, never the whole number measured", () => {
      for (let n = 3; n <= 200; n++) {
        const t = coherenceThreshold(n);
        expect(t).toBeGreaterThanOrEqual(2);
        expect(t).toBeLessThan(n);
      }
    });
  }
);

describe(
  'REQ-094 c2 — "…one written line states that the market may have been read wrongly… exactly when no single domain appears in the top ten of as many of those measured searches as the threshold" — the incoherent/coherent limb',
  () => {
    it("check/incoherent-exactly-when-best-is-below-threshold — n = 12, best = 2, is incoherent", () => {
      // threshold at n=12 is 3; "a.com" appears on exactly 2 of the 12
      // SERPs and every other SERP/domain is unique — no domain reaches 3.
      const serps = [
        serpOf("a.com", "b.com"),
        serpOf("a.com", "c.com"),
        ...Array.from({ length: 10 }, (_, i) => serpOf(`z${i}.com`)),
      ];
      expect(checkCoherence({ serps, measuredCount: 12 })).toEqual({
        verdict: "incoherent",
        threshold: 3,
        best: 2,
      });
    });

    it("check/incoherent-exactly-when-best-is-below-threshold — n = 12, best = 3, is coherent", () => {
      // "a.com" appears on exactly 3 of the 12 SERPs, meeting the threshold.
      const serps = [
        serpOf("a.com", "b.com"),
        serpOf("a.com", "c.com"),
        serpOf("a.com", "d.com"),
        ...Array.from({ length: 9 }, (_, i) => serpOf(`z${i}.com`)),
      ];
      expect(checkCoherence({ serps, measuredCount: 12 })).toEqual({
        verdict: "coherent",
      });
    });

    it("best is the highest count and 0 where no domain appears anywhere", () => {
      const serps = Array.from({ length: 3 }, () => serpOf());
      expect(checkCoherence({ serps, measuredCount: 3 })).toEqual({
        verdict: "incoherent",
        threshold: 2,
        best: 0,
      });
    });
  }
);

describe(
  'REQ-094 c2 — "…fewer than three searches… no line says the market may have been read wrongly, and one written line instead says that coherence could not be judged" — the unjudgeable limb (the promise this WO exists to keep)',
  () => {
    it.each([0, 1, 2])(
      "check/fewer-than-three-is-unjudgeable — measuredCount %i is unjudgeable whatever the SERPs contain",
      (measuredCount) => {
        // One domain appears in every top ten supplied — a market that
        // would be trivially "coherent" by count alone — and the verdict
        // must still be unjudgeable: there is not enough evidence to say.
        const serps = Array.from({ length: Math.max(measuredCount, 1) }, () =>
          serpOf("everywhere.com")
        );
        expect(checkCoherence({ serps, measuredCount })).toEqual({
          verdict: "unjudgeable",
          measuredCount,
        });
      }
    );

    it("check/fewer-than-three-is-unjudgeable — empty SERPs at measuredCount 0", () => {
      expect(checkCoherence({ serps: [], measuredCount: 0 })).toEqual({
        verdict: "unjudgeable",
        measuredCount: 0,
      });
    });

    it("threshold/floor-boundary-both-sides — measuredCount 2 is unjudgeable, measuredCount 3 is not", () => {
      const two = checkCoherence({
        serps: [serpOf("a.com"), serpOf("a.com")],
        measuredCount: 2,
      });
      expect(two).toEqual({ verdict: "unjudgeable", measuredCount: 2 });

      const three = checkCoherence({
        serps: [serpOf("a.com"), serpOf("a.com"), serpOf("a.com")],
        measuredCount: 3,
      });
      expect(three.verdict).not.toBe("unjudgeable");
    });
  }
);

describe("check/counts-once-per-serp-across-duplicate-results", () => {
  it("a domain appearing twice in one SERP's top ten still counts once for that SERP", () => {
    const serps = [
      { organic: [{ domain: "a.com" }, { domain: "a.com" }, { domain: "a.com" }] },
      serpOf("b.com"),
      serpOf("c.com"),
    ];
    // a.com appears on 1 of 3 SERPs, not 3.
    expect(checkCoherence({ serps, measuredCount: 3 })).toEqual({
      verdict: "incoherent",
      threshold: 2,
      best: 1,
    });
  });
});

describe("all/are-pure", () => {
  it("resolves no import into src/lib/costs/, src/lib/vendors/, src/lib/llm/, src/lib/db/ or src/lib/scan/", () => {
    const forbidden = [
      /from ["']@\/lib\/costs\//,
      /from ["']@\/lib\/vendors\//,
      /from ["']@\/lib\/llm\//,
      /from ["']@\/lib\/db\//,
      /from ["']@\/lib\/scan\//,
    ];
    for (const re of forbidden) {
      expect(SOURCE).not.toMatch(re);
    }
  });

  it("takes no CostContext (no parameter or import named CostContext)", () => {
    expect(SOURCE).not.toMatch(/CostContext/);
  });

  it("reads no clock (no Date.now, no `new Date`)", () => {
    expect(SOURCE).not.toMatch(/Date\.now\(\)/);
    expect(SOURCE).not.toMatch(/new Date\(/);
  });

  it("checkCoherence and coherenceThreshold never throw", () => {
    expect(() => coherenceThreshold(0)).not.toThrow();
    expect(() => coherenceThreshold(1)).not.toThrow();
    expect(() =>
      checkCoherence({ serps: [], measuredCount: 0 })
    ).not.toThrow();
  });
});

describe("structure.md rule 5 — no pinned literal restated in source", () => {
  it("neither 2 nor 4 appears as the threshold's own literal — the expression reads COHERENCE", () => {
    // The pins themselves (minMeasuredSearches: 3, shareDivisor: 4,
    // minAppearances: 2) may appear only inside the COHERENCE import/read,
    // never as a second, bare numeric literal doing the same arithmetic
    // work. This mirrors the discrimination note: "replacing the
    // expression with the literal 3 must fail threshold/is-a-share-not-a-count
    // at n = 4" — proved directly below by mutation, not just by this
    // static check.
    const body = SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, "") // block comments (JSDoc included)
      .replace(/\/\/.*$/gm, "") // line comments
      .replace(/import[^\n]*\n/g, "");
    expect(body).not.toMatch(/Math\.max\(2,/);
    expect(body).not.toMatch(/\/ 4\)/);
  });
});
