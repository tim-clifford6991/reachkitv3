// tests/app/scan-address/canonical.test.ts
//
// WO-280 `## Test plan` (carried verbatim from WO-061) — REQ-001 c2: "no two
// [written forms] produce different addresses or different stored reports."
// `canonicalRedirect` is the redirect policy only; the parse itself is
// WO-051's `parseDomain`, exercised end to end here rather than mocked.
import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "../../../src/app/(public)/scan/[domain]/_address/canonical.ts";

describe("address/canonical · every non-canonical form redirects to the one address", () => {
  const nonCanonical = ["EXAMPLE.COM", "www.example.com", "example.com.", "example.com:8443"];

  it.each(nonCanonical)("%s redirects to /scan/example.com", (segment) => {
    expect(canonicalRedirect(segment)).toEqual({ redirectTo: "/scan/example.com" });
  });

  it("the canonical form itself redirects nowhere", () => {
    expect(canonicalRedirect("example.com")).toBeNull();
  });

  it("a malformed segment redirects nowhere — row 1 of the resolution table handles it, not a redirect", () => {
    expect(canonicalRedirect("")).toBeNull();
    expect(canonicalRedirect("192.0.2.1")).toBeNull();
    expect(canonicalRedirect("localhost")).toBeNull();
  });
});

describe("address/canonical · the redirect target is itself canonical", () => {
  const forms = ["EXAMPLE.COM", "www.example.com", "example.com.", "example.com:8443", "example.com"];

  it.each(forms)("feeding %s's redirect target (or itself, if already canonical) back yields null", (segment) => {
    const first = canonicalRedirect(segment);
    const nextSegment = first ? first.redirectTo.replace(/^\/scan\//, "") : segment;
    expect(canonicalRedirect(nextSegment)).toBeNull();
  });
});
