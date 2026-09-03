// tests/scan/free/domain.test.ts
//
// WO-051 test plan, quoted verbatim from REQ-001 in the work order's own
// `## Test plan` table. Table-driven: one row per written form, one row per
// rejection, plus the idempotence and injectivity properties.
import dns from "node:dns";
import { describe, expect, it, vi } from "vitest";
import { parseDomain } from "../../../src/lib/scan/domain.ts";

describe("domain/parse · one domain, every written form, one key", () => {
  const forms = [
    "example.com",
    "EXAMPLE.COM",
    "www.example.com",
    "http://example.com",
    "https://WWW.Example.com/pricing?a=1#x",
    "example.com.",
    "example.com:8443",
  ];

  it.each(forms)("%s parses ok", (form) => {
    const result = parseDomain(form);
    expect(result.ok).toBe(true);
  });

  it("all seven forms yield the identical CanonicalDomain string", () => {
    const keys = new Set(
      forms.map((form) => {
        const result = parseDomain(form);
        if (!result.ok) throw new Error(`expected ok for ${form}`);
        return result.domain as string;
      })
    );
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("example.com");
  });
});

describe("domain/parse · the three named rejections carry their own handle", () => {
  it.each(["", "   "])("%j -> empty", (input) => {
    const result = parseDomain(input);
    expect(result).toEqual({ ok: false, problem: "empty" });
  });

  it.each(["192.0.2.1", "[2001:db8::1]", "http://192.0.2.1/"])("%s -> ip_literal", (input) => {
    const result = parseDomain(input);
    expect(result).toEqual({ ok: false, problem: "ip_literal" });
  });

  it.each(["localhost", "myserver", "example.invalidtld"])("%s -> no_public_suffix", (input) => {
    const result = parseDomain(input);
    expect(result).toEqual({ ok: false, problem: "no_public_suffix" });
  });
});

describe("domain/parse · a well-formed domain that cannot resolve is accepted", () => {
  it("a domain in a real public suffix that resolves nowhere parses ok, and no DNS or network API is called", () => {
    const dnsLookupSpy = vi.spyOn(dns, "lookup");
    const dnsResolveSpy = vi.spyOn(dns, "resolve");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = parseDomain("this-domain-almost-certainly-does-not-resolve-anywhere.com");

    expect(result).toEqual({ ok: true, domain: "this-domain-almost-certainly-does-not-resolve-anywhere.com" });
    expect(dnsLookupSpy).not.toHaveBeenCalled();
    expect(dnsResolveSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    dnsLookupSpy.mockRestore();
    dnsResolveSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});

describe("domain/parse · never throws", () => {
  const adversarial = [
    "",
    "a".repeat(10000),
    "\x00\x01\x02control",
    "\uD800lone-surrogate",
    "../../etc/passwd",
    "example.com%00",
    "http://user:pass@example.com/path?x=1#y",
  ];

  it.each(adversarial)("returns a DomainParse and does not throw for %j", (input) => {
    let result: ReturnType<typeof parseDomain> | undefined;
    expect(() => {
      result = parseDomain(input);
    }).not.toThrow();
    expect(result).toBeDefined();
    expect(typeof result?.ok).toBe("boolean");
  });
});

describe("domain/parse · distinct domains never collide", () => {
  it("four distinct written domains, plus the unicode form of the fourth, parse to four distinct keys", () => {
    const inputs = [
      "example.com",
      "www2.example.com",
      "example.co.uk",
      "xn--e1afmkfd.xn--p1ai",
      "http://пример.рф", // пример.рф — unicode form of xn--e1afmkfd.xn--p1ai
    ];
    const results = inputs.map((input) => parseDomain(input));
    for (const result of results) {
      expect(result.ok).toBe(true);
    }
    const keys = results.map((r) => (r.ok ? (r.domain as string) : null));
    // The last two (punycode and unicode forms of one IDN) collapse to one key.
    expect(keys[3]).toBe(keys[4]);
    expect(new Set(keys).size).toBe(4);
  });
});

describe("domain/parse · canonical form is a fixed point", () => {
  const inputs = [
    "example.com",
    "www.example.com",
    "http://example.com",
    "https://WWW.Example.com/pricing?a=1#x",
    "example.com.",
    "example.com:8443",
    "www2.example.com",
    "example.co.uk",
    "xn--e1afmkfd.xn--p1ai",
  ];

  it.each(inputs)("parseDomain(parseDomain(%s).domain) === parseDomain(%s).domain", (input) => {
    const first = parseDomain(input);
    if (!first.ok) throw new Error(`expected ok for ${input}`);
    const second = parseDomain(first.domain);
    expect(second).toEqual({ ok: true, domain: first.domain });
  });
});
