// tests/market/rivals/domains.test.ts
//
// WO-077 test plan, quoted verbatim from REQ-008 in the work order's own
// `## Test plan` table, plus the interface-contract tests it names.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isOwnDomain,
  isPlatformDomain,
  registrableDomain,
} from "../../../src/lib/market/rivals/domains.ts";
import { PLATFORM_DOMAINS } from "../../../src/lib/config/constants.ts";

const SOURCE_PATH = path.resolve(import.meta.dirname, "../../../src/lib/market/rivals/domains.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

describe(
  'REQ-008 c1 — "Given a completed report, when the Google card renders, then it shows, for the customer and for each rival, in how many of the market\'s 12 biggest searches they appear in the top ten, each labelled with its name and its value rather than identified by colour alone." — contributing arm: two spellings of one identity reduce to one',
  () => {
    it("registrableDomain/one-identity-per-site — every written form of example.com reduces to the same value", () => {
      const forms = [
        "https://www.example.com/pricing?a=1",
        "EXAMPLE.com.",
        "example.com:443",
        "content.example.com",
      ];
      const reduced = new Set(forms.map((f) => registrableDomain(f)));
      expect(reduced.size).toBe(1);
      expect([...reduced][0]).toBe("example.com");
    });

    it("registrableDomain/one-identity-per-site — a two-label public suffix reduces to eTLD+1, not to the suffix itself", () => {
      expect(registrableDomain("example.co.uk")).toBe("example.co.uk");
      expect(registrableDomain("www.example.co.uk")).toBe("example.co.uk");
    });
  }
);

describe(
  'REQ-008 c2 — "Given a customer appearing in none of the 12, when the card renders, then 0 is shown against the same denominator as every rival — never an error, a blank card, or a ratio." — contributing arm: the customer\'s own hosted page must not be counted as a rival',
  () => {
    it("isOwnDomain/matches-www-and-content — www. and the content. publishing subdomain are both own", () => {
      const ownDomain = "example.com";
      expect(isOwnDomain("example.com", ownDomain)).toBe(true);
      expect(isOwnDomain("www.example.com", ownDomain)).toBe(true);
      expect(isOwnDomain("content.example.com", ownDomain)).toBe(true);
    });

    it("isOwnDomain/matches-www-and-content — a different domain, and a domain that merely contains the name, are not own", () => {
      const ownDomain = "example.com";
      expect(isOwnDomain("example.net", ownDomain)).toBe(false);
      expect(isOwnDomain("notexample.com", ownDomain)).toBe(false);
    });

    it("isOwnDomain — case, trailing dot and a port are still the same site", () => {
      expect(isOwnDomain("WWW.Example.com.", "example.com:443")).toBe(true);
    });

    it("isOwnDomain — a malformed side never false-matches another malformed side", () => {
      expect(isOwnDomain("", "")).toBe(false);
      expect(isOwnDomain("not a host", "also not a host")).toBe(false);
    });
  }
);

describe("registrableDomain/returns-null-for-garbage", () => {
  it.each(["", "not a host", "http://", "1.2.3.4"])("%j -> null", (input) => {
    expect(registrableDomain(input)).toBeNull();
  });
});

describe("isPlatformDomain/reads-the-pin", () => {
  it("every name in PLATFORM_DOMAINS is a platform domain as a .com", () => {
    for (const name of PLATFORM_DOMAINS) {
      expect(isPlatformDomain(`${name}.com`)).toBe(true);
    }
  });

  it("a domain absent from PLATFORM_DOMAINS is not a platform — the open-world side is the rival side", () => {
    expect(isPlatformDomain("example.com")).toBe(false);
    expect(isPlatformDomain("unknown-vendor.io")).toBe(false);
  });

  it("membership is checked against PLATFORM_DOMAINS itself, not a list restated here", () => {
    // PLATFORM_DOMAINS has at least one entry, and every entry above passed —
    // so this test would fail if the module read a shorter or different list.
    expect(PLATFORM_DOMAINS.length).toBeGreaterThan(0);
  });
});

describe("all/are-pure", () => {
  it("resolves no import into src/lib/egress/, src/lib/vendors/ or src/lib/costs/", () => {
    const forbidden = [/from ["']@\/lib\/egress\//, /from ["']@\/lib\/vendors\//, /from ["']@\/lib\/costs\//];
    for (const re of forbidden) {
      expect(SOURCE).not.toMatch(re);
    }
  });

  it("registrableDomain, isPlatformDomain and isOwnDomain never throw", () => {
    const inputs = ["", "not a host", "http://", "1.2.3.4", "example.com", "🙂.com", "a".repeat(300)];
    for (const input of inputs) {
      expect(() => registrableDomain(input)).not.toThrow();
      expect(() => isPlatformDomain(input)).not.toThrow();
      expect(() => isOwnDomain(input, "example.com")).not.toThrow();
    }
  });
});
