// tests/app/scan-address/landing.test.tsx
//
// WO-070 `## Test plan` (criteria quoted verbatim from `requirements/
// REQ-001.md` and `requirements/REQ-093.md`) — the one-control, no-gate,
// error-in-place and no-JavaScript suites for `src/app/(public)/page.tsx`.
//
// **Rendering convention**: `tests/app/**` runs under Vitest's "node"
// project (`vitest.config.ts` — jsdom is `tests/ui/**`'s only), so this
// file renders with `react-dom/server`'s `renderToStaticMarkup`, exactly
// as `tests/app/layout.test.ts` renders `RootLayout` — no simulated
// browser event, no `fireEvent`. The page's own client behaviour
// (`fetch`, `window.location.assign`, the `onSubmit` handler) is asserted
// by source, the same convention `tests/app/scan-address/api-scan.test.ts`
// uses for `route.ts`'s own wiring it cannot execute end to end either.
//
// **`copy()` is mocked to `(key) => key`** for every rendering test below,
// regardless: mocking lets these suites see the rendered *tree* — control
// count, value survival, which key a line resolves from — without
// depending on the owner's own wording either way.
//
// Of this WO's eight copy keys (`src/lib/presentation/copy/keys/report.ts`,
// WO-070's Modify row), three — `landing.headline`, `landing.field.label`,
// `landing.submit.label` — were filled 2026-09-03 by the owner's ruling
// (WO-070 `## Log`) and no longer throw against the real registry. The
// five `landing.problem.*` lines remain owner-owed and empty (constitution
// §1), so the *real* `copy()` still throws on every one of them (WO-041's
// representation, applied here the same way WO-249 applied it to
// `renderMeasured`). Both the throw, over the five still-empty keys, and
// the pass-through, over the three the owner has supplied, are proved
// once, directly against `copy.ts`, in the describe block below (mirroring
// WO-249's "asserts the key reached, never the sentence").
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

vi.mock("@/lib/presentation/copy", () => ({ copy: (key: string) => key }));

import { POST } from "@/app/api/scan/route";

vi.mock("@/lib/scan/admission", () => ({
  networkKeyOf: vi.fn(),
  claimFreeScanSlot: vi.fn(),
}));
import { networkKeyOf, claimFreeScanSlot } from "@/lib/scan/admission";
import type { NetworkKey } from "@/lib/scan/admission";

const PAGE_PATH = path.resolve(import.meta.dirname, "../../../src/app/(public)/page.tsx");
const PAGE_SOURCE = readFileSync(PAGE_PATH, "utf8");

const NETWORK = "network-key-fixture" as NetworkKey;

beforeEach(() => {
  vi.mocked(networkKeyOf).mockReturnValue(NETWORK);
  vi.mocked(claimFreeScanSlot).mockResolvedValue({ claimed: true, scanId: "claimed-scan-id" });
});

afterEach(() => {
  vi.mocked(networkKeyOf).mockReset();
  vi.mocked(claimFreeScanSlot).mockReset();
});

// The five DomainProblem handles this page must carry a line for
// (`src/lib/scan/domain.ts`, WO-051) — transcribed here as plain string
// literals (a TS type carries nothing at runtime), on the same terms
// `api-scan.test.ts` already transcribes them.
const DOMAIN_PROBLEMS = ["empty", "not_a_hostname", "ip_literal", "no_public_suffix", "too_long"] as const;

function postForm(fields: Record<string, string>): Request {
  const form = new URLSearchParams(fields);
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

function postJson(value: string): Request {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value }),
  });
}

async function renderPage(searchParams: { problem?: string; value?: string } = {}): Promise<string> {
  vi.resetModules();
  const { default: LandingPage } = (await import("@/app/(public)/page.tsx")) as {
    default: (p: { searchParams: { problem?: string; value?: string } }) => React.JSX.Element;
  };
  // `React.createElement`, not a bare function call: `LandingPage` uses
  // hooks (`useState`, `use`), which only run under React's own dispatcher
  // — set up by `renderToStaticMarkup` walking a real element, not by
  // invoking the component as a plain function (the convention
  // `tests/app/layout.test.ts` uses for `RootLayout`, which owns no hook).
  return renderToStaticMarkup(React.createElement(LandingPage, { searchParams }));
}

/** Every native form-control tag in a static-markup string, by kind. */
function controlsOf(markup: string): {
  inputs: string[];
  buttons: string[];
  selects: string[];
  textareas: string[];
} {
  return {
    inputs: [...markup.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]),
    buttons: [...markup.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]),
    selects: [...markup.matchAll(/<select\b[^>]*>/g)].map((m) => m[0]),
    textareas: [...markup.matchAll(/<textarea\b[^>]*>/g)].map((m) => m[0]),
  };
}

// ── REQ-001 c1 ─────────────────────────────────────────────────────────

describe(
  'REQ-001 c1 — "Given a visitor on the landing page, when the page renders, then it presents exactly one text input and one submit control and no other input control of any kind — no market, competitor, keyword or country field, selector or toggle, optional or required — and no sign-in or payment is required before submitting."',
  () => {
    it("landing/controls · exactly one input and one submit, and nothing else", async () => {
      const markup = await renderPage();
      const { inputs, buttons, selects, textareas } = controlsOf(markup);

      expect(inputs).toHaveLength(1);
      expect(inputs[0]).toMatch(/type="text"/);
      expect(inputs[0]).not.toMatch(/type="(checkbox|radio|email|password|number|hidden)"/);

      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toMatch(/type="submit"/);

      expect(selects).toHaveLength(0);
      expect(textareas).toHaveLength(0);
    });

    it("landing/controls · no gate before submitting", async () => {
      const markup = await renderPage();

      expect(markup).not.toMatch(/sign[- ]?in/i);
      expect(markup).not.toMatch(/<a\b[^>]*href/i);
      expect(markup).not.toMatch(/type="email"/);
      expect(markup).not.toMatch(/payment|card|checkout/i);

      // Source assertion: page.tsx imports no session, auth or account
      // module (WO-062's own convention for the same property on route.ts),
      // and never touches `document.cookie` — the only way a Client
      // Component could set one itself.
      expect(PAGE_SOURCE).not.toMatch(/from\s+["'][^"']*\b(session|auth|account)\b[^"']*["']/i);
      expect(PAGE_SOURCE).not.toMatch(/document\.cookie/);
    });
  }
);

// ── REQ-001 c3 ─────────────────────────────────────────────────────────

describe(
  'REQ-001 c3 — "Given a visitor who submits a value that is not a well-formed public domain name — an empty value, an IP literal, or a hostname with no public suffix — when they submit, then one written line names what is wrong with the value and the visitor stays on the landing page with their input intact. A well-formed domain is accepted here whether or not it resolves; a domain that cannot be reached is a failed scan (REQ-003), not a rejected input."',
  () => {
    it.each([
      ["empty", ""],
      ["ip_literal", "203.0.113.5"],
      ["no_public_suffix", "localhost"],
    ] as const)("landing/error · the line names the problem and the value survives — %s", async (problem, value) => {
      const markup = await renderPage({ problem, value });
      const { inputs, buttons } = controlsOf(markup);

      // Still exactly one input and one submit — the error state adds no
      // control (REQ-001 c1 continues to hold on the error render).
      expect(inputs).toHaveLength(1);
      expect(buttons).toHaveLength(1);

      // The value survives, verbatim, in the input's value attribute.
      expect(markup).toContain(`value="${value}"`);

      // One written line, resolved from that DomainProblem's own key.
      const key = `landing.problem.${problem.replace(/_/g, "-")}`;
      expect(markup).toContain(key);
    });

    it("landing/error · the three lines are distinct", async () => {
      const lines = await Promise.all(
        (["empty", "ip_literal", "no_public_suffix"] as const).map(async (problem) => {
          const markup = await renderPage({ problem, value: "x" });
          const match = markup.match(/text-error">([^<]*)</);
          return match?.[1];
        })
      );
      expect(new Set(lines).size).toBe(3);
    });

    it("landing/error · a well-formed unresolvable domain is not rejected here", async () => {
      const res = await POST(postJson("this-domain-does-not-resolve-anywhere.example.com"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: true; location: string };
      expect(body.ok).toBe(true);
      expect(body.location).toBe("/scan/this-domain-does-not-resolve-anywhere.example.com");
    });
  }
);

// ── REQ-001 c2 ─────────────────────────────────────────────────────────

describe(
  'REQ-001 c2 — "Given a visitor who enters a domain in any of its written forms … when they submit, then they arrive at the single public report address for that domain; no two of those forms produce different addresses or different stored reports."',
  () => {
    it.each([
      "example.com",
      "http://example.com",
      "https://example.com",
      "www.example.com",
      "https://www.EXAMPLE.com/some/path",
      "EXAMPLE.COM.",
    ])("landing/submit · every written form lands on the one address — %s", async (form) => {
      const res = await POST(postJson(form));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: true; location: string };
      expect(body.location).toBe("/scan/example.com");
    });
  }
);

// ── REQ-001 c3, the no-JavaScript half ────────────────────────────────

describe(
  'REQ-001 c3, the no-JavaScript half — "… the visitor stays on the landing page with their input intact."',
  () => {
    it("landing/no-js · the promise holds without a client runtime", async () => {
      // A valid submission follows WO-062's 303 to the canonical address —
      // asserted directly against the handler this page's plain <form>
      // posts to, with no rendering involved (there is nothing to render:
      // the visitor has already left the landing page).
      const validRes = await POST(postForm({ value: "example.com" }));
      expect(validRes.status).toBe(303);
      const validLocation = new URL(validRes.headers.get("location") ?? "", "http://localhost");
      expect(validLocation.pathname).toBe("/scan/example.com");

      // An invalid submission returns to "/" carrying `problem` and
      // `value` (WO-062's own query-param convention) — this page's own
      // SSR markup, from those exact params, carries the line and the
      // value intact.
      const invalidRes = await POST(postForm({ value: "203.0.113.5" }));
      expect(invalidRes.status).toBe(303);
      const invalidLocation = new URL(invalidRes.headers.get("location") ?? "", "http://localhost");
      expect(invalidLocation.pathname).toBe("/");
      const problem = invalidLocation.searchParams.get("problem") ?? undefined;
      const value = invalidLocation.searchParams.get("value") ?? undefined;
      expect(problem).toBe("ip_literal");
      expect(value).toBe("203.0.113.5");

      const markup = await renderPage({ problem, value });
      expect(markup).toContain('value="203.0.113.5"');
      expect(markup).toContain("landing.problem.ip-literal");
    });

    it("landing/no-js · the <form> itself is a plain post to /api/scan, with no JavaScript required to reach it", () => {
      expect(PAGE_SOURCE).toMatch(/<form\s+action="\/api\/scan"\s+method="post"/);
      // The one field carries the native `name` a plain HTML submission
      // needs (`src/ui/components/Input.tsx`'s WO-070 addition).
      expect(PAGE_SOURCE).toMatch(/name="value"/);
      // preventDefault() is what turns the native submission into the
      // JavaScript path — its presence does not remove the native
      // action/method above, which is what a client with no runtime
      // falls back to.
      expect(PAGE_SOURCE).toMatch(/preventDefault\(\)/);
    });
  }
);

// ── REQ-001 c10 ────────────────────────────────────────────────────────

describe(
  'REQ-001 c10 — "… nothing is asked of them at any point between the domain they gave and the report they read — no account, sign-in, email address, or payment, and no further field. …"',
  () => {
    it("landing/no-ask · nothing is asked on the way in", async () => {
      const markup = await renderPage();
      const { inputs, buttons, selects, textareas } = controlsOf(markup);
      expect(inputs).toHaveLength(1);
      expect(buttons).toHaveLength(1);
      expect(selects).toHaveLength(0);
      expect(textareas).toHaveLength(0);

      // The navigation that follows a valid submission: on `ok: true` the
      // JS path assigns `window.location` to the returned address and
      // returns immediately — no state is set and nothing else renders in
      // between (source assertion: the `ok` branch's only statements are
      // the navigation and the return).
      const okBranch = PAGE_SOURCE.match(/if \(body\.ok\) \{([\s\S]*?)\}/);
      expect(okBranch, "no `if (body.ok)` branch found").toBeTruthy();
      expect(okBranch![1]).toMatch(/window\.location\.assign\(body\.location\)/);
      expect(okBranch![1]).toMatch(/return;/);
      expect(okBranch![1]).not.toMatch(/setProblem|setValue/);
    });
  }
);

// ── REQ-093 c1 ─────────────────────────────────────────────────────────

describe('REQ-093 c1 (BP-022: "This node contains no string literal a person reads")', () => {
  it("landing/copy · every sentence is a key", () => {
    // Every prop that renders visible text is a copy() call, never a
    // string literal.
    expect(PAGE_SOURCE).not.toMatch(/\blabel=["'][^{]/);
    expect(PAGE_SOURCE).not.toMatch(/\bplaceholder=["'][^{]/);
    expect(PAGE_SOURCE).not.toMatch(/\binvalidMessage=["'][^{]/);
    expect(PAGE_SOURCE).toMatch(/<h1>\{copy\(["']landing\.headline["']\)\}<\/h1>/);

    // No bare JSX text node outside a `{…}` expression, scoped to the
    // component's own returned JSX (the slice from `return (` to the
    // matching `);`) rather than the whole file — the whole-file scan
    // would also match TypeScript generics like `Promise<T>`, which are
    // `>`…`<` pairs with nothing to do with rendered text.
    const returnBlock = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("return (\n    <main>"));
    expect(returnBlock.length, "the JSX return block was not found").toBeGreaterThan(0);
    const jsxTextNodes = [...returnBlock.matchAll(/>([^<{}\n]+)</g)].map((m) => (m[1] ?? "").trim()).filter(Boolean);
    expect(jsxTextNodes).toEqual([]);

    // Every visible string resolves through copy(): the three non-problem
    // keys are called directly by name; the five DomainProblem lines are
    // called through `PROBLEM_COPY_KEY[problem]` — a lookup, not a
    // literal — so each of those five is checked as a value in that map
    // instead, and the lookup call site is checked once.
    for (const key of ["landing.headline", "landing.field.label", "landing.submit.label"]) {
      expect(PAGE_SOURCE, `copy() never reaches "${key}"`).toMatch(
        new RegExp(`copy\\(["']${key.replace(/[.-]/g, "\\$&")}["']`)
      );
    }
    expect(PAGE_SOURCE).toMatch(/copy\(PROBLEM_COPY_KEY\[problem\]\)/);
    for (const key of [
      "landing.problem.empty",
      "landing.problem.not-a-hostname",
      "landing.problem.ip-literal",
      "landing.problem.no-public-suffix",
      "landing.problem.too-long",
    ]) {
      expect(PAGE_SOURCE, `"${key}" is not a value in PROBLEM_COPY_KEY`).toContain(`"${key}"`);
    }
  });
});

describe("WO-070 `## rests-on` — five landing keys remain owner-owed; three the owner has now written", () => {
  it("landing/copy · the five still-empty problem keys throw, naming themselves, against the real (unmocked) registry", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/presentation/copy");
    const { copy: realCopy } = await import("@/lib/presentation/copy/copy.ts");

    const keys = DOMAIN_PROBLEMS.map((p) => `landing.problem.${p.replace(/_/g, "-")}`);
    expect(keys).toHaveLength(5);
    for (const key of keys) {
      expect(() => realCopy(key as never)).toThrow(new RegExp(key.replace(/[.-]/g, "\\$&")));
    }
  });

  it("landing/copy · the three owner-supplied keys no longer throw and return the owner's exact strings", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/presentation/copy");
    const { copy: realCopy } = await import("@/lib/presentation/copy/copy.ts");

    expect(realCopy("landing.headline" as never)).toBe(
      "See what AI tells buyers about your market — and write your way in."
    );
    expect(realCopy("landing.field.label" as never)).toBe("Your website");
    expect(realCopy("landing.submit.label" as never)).toBe("Scan my site");
  });
});
