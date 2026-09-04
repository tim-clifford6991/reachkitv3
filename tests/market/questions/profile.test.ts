// tests/market/questions/profile.test.ts — WO-071 `## Test plan`, criteria
// quoted verbatim from REQ-006, plus `## Steps` step 6's own "watch each
// fail before the implementation exists" and the "Additional tests"
// section WO-071 names for the interface contract BP-025 fixes.
//
// Risk: high — seams: money, and data leaving the system. Mutation-tested
// (doctrine 0.13.2, rule 2b): `deriveProfile/single-call-site` and
// `deriveProfile/unmeasured-profile-yields-no-value` are each written so
// that deleting the `site: 'profile'` argument, or replacing the
// `unmeasured` pass-through with a default `Profile`, fails a named test
// below (WO-071's own "Discrimination" note). No network: `@/lib/llm` is
// stubbed entirely — this suite never reaches the vendor.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ZodType } from "zod";
import type { CostContext } from "../../../src/lib/costs/index.ts";
import type { Measured } from "../../../src/lib/measure/measured.ts";
import type { Profile } from "../../../src/lib/market/questions/profile.ts";

interface RecordedLlmCall {
  site: string;
  input: unknown;
  schema: ZodType<unknown>;
  tier: string;
}

const { llmMock } = vi.hoisted(() => ({ llmMock: vi.fn() }));

vi.mock("@/lib/llm", () => ({ llm: llmMock }));

let deriveProfile: typeof import("../../../src/lib/market/questions/profile.ts").deriveProfile;

beforeEach(async () => {
  llmMock.mockReset();
  ({ deriveProfile } = await import("../../../src/lib/market/questions/profile.ts"));
});

/** `recordFetch` throws: `deriveProfile` must reach the vendor only through
 *  `llm()` (the spend seam, mutation probe 1) — a call that bypassed
 *  `llm()` and called `CostContext.recordFetch` directly would be caught
 *  here, not merely unexercised. */
function fakeCostContext(): CostContext {
  return {
    async recordFetch() {
      throw new Error("deriveProfile must call llm(), not CostContext.recordFetch directly");
    },
    capHit: () => false,
    spentCents: () => 0,
    degraded: () => false,
  };
}

const AT = new Date("2026-09-04T00:00:00.000Z");

function measuredProfile(overrides: Partial<Profile> = {}): Measured<Profile> {
  return {
    kind: "measured",
    at: AT,
    value: {
      category: "project management software",
      job: "coordinate a team's work",
      offeringType: "saas",
      audienceTerms: ["small teams", "agencies"],
      namedRivals: ["rival.com"],
      vocabulary: ["kanban", "sprint"],
      brandTokens: ["acme"],
      ...overrides,
    },
  };
}

describe("deriveProfile — the single 'profile' nano call site", () => {
  it("deriveProfile/single-call-site — exactly one llm() call is made, its site is 'profile' and its tier is 'nano'; no keyword or search term is passed in the input", async () => {
    llmMock.mockResolvedValueOnce(measuredProfile());
    const c = fakeCostContext();

    await deriveProfile(c, { home: "<html>home</html>", pricing: "<html>pricing</html>" });

    expect(llmMock).toHaveBeenCalledTimes(1);
    const call = llmMock.mock.calls[0]![1] as RecordedLlmCall;
    expect(call.site).toBe("profile");
    expect(call.tier).toBe("nano");
    expect(call.input).toEqual({ home: "<html>home</html>", pricing: "<html>pricing</html>" });
    const inputJson = JSON.stringify(call.input);
    expect(inputJson).not.toContain("keyword");
    expect(inputJson).not.toContain("searchTerm");
  });

  it("passes the CostContext straight through, unaltered", async () => {
    llmMock.mockResolvedValueOnce(measuredProfile());
    const c = fakeCostContext();

    await deriveProfile(c, { home: "home text" });

    expect(llmMock.mock.calls[0]![0]).toBe(c);
  });

  it("carries exactly { home, pricing } as handed in — no field added, no field dropped", async () => {
    llmMock.mockResolvedValueOnce(measuredProfile());
    const c = fakeCostContext();

    await deriveProfile(c, { home: "home text only" });

    const call = llmMock.mock.calls[0]![1] as RecordedLlmCall;
    expect(call.input).toEqual({ home: "home text only", pricing: undefined });
  });
});

describe("deriveProfile — the unmeasured pass-through (the free path's cost floor)", () => {
  it("deriveProfile/unmeasured-profile-yields-no-value — an llm() stub returning { kind: 'unmeasured', reason: 'undeterminable' } is returned unaltered, with no 'value' field and no substituted category", async () => {
    const unmeasuredResult: Measured<Profile> = { kind: "unmeasured", reason: "undeterminable", at: AT };
    llmMock.mockResolvedValueOnce(unmeasuredResult);
    const c = fakeCostContext();

    const result = await deriveProfile(c, { home: "unreadable" });

    expect(result).toEqual(unmeasuredResult);
    expect("value" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain("category");
  });

  it("returns a 'zero' result unaltered too — not synthesised, not upgraded to measured", async () => {
    const zeroResult: Measured<Profile> = {
      kind: "zero",
      at: AT,
      value: {
        category: "",
        job: "",
        offeringType: "",
        audienceTerms: [],
        namedRivals: [],
        vocabulary: [],
        brandTokens: [],
      },
    };
    llmMock.mockResolvedValueOnce(zeroResult);

    const result = await deriveProfile(fakeCostContext(), { home: "" });

    expect(result).toEqual(zeroResult);
  });

  it("calls llm() exactly once regardless of outcome — deriveProfile itself never retries", async () => {
    llmMock.mockResolvedValueOnce({ kind: "unmeasured", reason: "not_attempted", at: AT });

    await deriveProfile(fakeCostContext(), { home: "x" });

    expect(llmMock).toHaveBeenCalledTimes(1);
  });
});

describe("deriveProfile — the Zod schema declared for the model's output", () => {
  it("deriveProfile/schema-rejects-extra-fields — a model response carrying a keyword or a selected search does not parse", async () => {
    llmMock.mockResolvedValueOnce(measuredProfile());
    await deriveProfile(fakeCostContext(), { home: "x" });
    const schema = (llmMock.mock.calls[0]![1] as RecordedLlmCall).schema;

    const base = {
      category: "c",
      job: "j",
      offeringType: "o",
      audienceTerms: ["a", "b"],
      namedRivals: [],
      vocabulary: [],
      brandTokens: [],
    };

    expect(schema.safeParse({ ...base, keyword: "best project management software" }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...base, selectedSearch: { keyword: "x", volume: 100 } }).success
    ).toBe(false);
    expect(schema.safeParse(base).success).toBe(true);
  });

  it("deriveProfile/audience-terms-bounded — fewer than 2 or more than 4 audienceTerms does not parse", async () => {
    llmMock.mockResolvedValueOnce(measuredProfile());
    await deriveProfile(fakeCostContext(), { home: "x" });
    const schema = (llmMock.mock.calls[0]![1] as RecordedLlmCall).schema;

    const base = { category: "c", job: "j", offeringType: "o", namedRivals: [], vocabulary: [], brandTokens: [] };

    expect(schema.safeParse({ ...base, audienceTerms: [] }).success).toBe(false);
    expect(schema.safeParse({ ...base, audienceTerms: ["one"] }).success).toBe(false);
    expect(schema.safeParse({ ...base, audienceTerms: ["a", "b"] }).success).toBe(true);
    expect(schema.safeParse({ ...base, audienceTerms: ["a", "b", "c", "d"] }).success).toBe(true);
    expect(schema.safeParse({ ...base, audienceTerms: ["a", "b", "c", "d", "e"] }).success).toBe(
      false
    );
  });
});

describe("deriveProfile — observability (BP-025 `## NFR budget`: profile outcome kind)", () => {
  it("logs the profile outcome kind, and never the profile's own field values", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const marker = "PROFILE-CATEGORY-MARKER-a91c";
    llmMock.mockResolvedValueOnce(measuredProfile({ category: marker }));

    await deriveProfile(fakeCostContext(), { home: "x" });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(logged.kind).toBe("measured");
    expect(JSON.stringify(logged)).not.toContain(marker);
    logSpy.mockRestore();
  });

  it("logs the reason on an unmeasured outcome", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    llmMock.mockResolvedValueOnce({ kind: "unmeasured", reason: "undeterminable", at: AT });

    await deriveProfile(fakeCostContext(), { home: "x" });

    const logged = JSON.parse(logSpy.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(logged.kind).toBe("unmeasured");
    expect(logged.reason).toBe("undeterminable");
    logSpy.mockRestore();
  });
});
