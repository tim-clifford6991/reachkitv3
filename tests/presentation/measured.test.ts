// tests/presentation/measured.test.ts
//
// WO-249's test plan (folded into WO-278 `## Test plan` under rule 2.6 —
// see WO-278 `## Consolidation`). REQ-004 criteria 2 (dash half), 3, 6, 7,
// 9 and 12, quoted verbatim in the work order's own `## Test plan` table.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderMeasured } from "../../src/lib/presentation/measured.ts";
import { copy } from "../../src/lib/presentation/copy/index.ts";
import { measured, measuredZero, unmeasured, type Measured } from "../../src/lib/measure/measured.ts";

const AT = new Date("2026-09-04T00:00:00.000Z");
const SOURCE_PATH = path.resolve(import.meta.dirname, "../../src/lib/presentation/measured.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

// A filled key with no slots — safe to pass as `unmeasuredLine` in tests
// that do not care about its content, and safe to resolve through copy()
// without throwing.
const FILLED_LINE_KEY = "stopped.work.line" as const;

describe(
  'REQ-004 c2 — "…one written line beside it names the one driver … Where the score could not be computed, criterion 3 governs the line instead." — measured · an unmeasured value renders the dash and nothing else',
  () => {
    it.each(["undeterminable", "not_attempted"] as const)(
      "reason=%s → text is the registry's dash, isDash is true",
      (reason) => {
        const result = renderMeasured(unmeasured<number>(reason, AT), {
          format: (v) => String(v),
          unmeasuredLine: FILLED_LINE_KEY,
        });
        expect(result.text).toBe(copy("unmeasured.dash"));
        expect(result.isDash).toBe(true);
        // REQ-004's own dash character, resolved through the registry
        // rather than as a literal in this test.
        expect(result.text).toBe("—");
      }
    );
  }
);

describe(
  'REQ-004 c3 — "…the first module shows "—" in place of the score, shows no band word at all … carries one written line …" — measured · isDash is the branch, and the caller can suppress a band on it',
  () => {
    const format = (v: unknown) => JSON.stringify(v);
    type Case = { label: string; m: Measured<unknown> };
    const cases: Case[] = [
      { label: "measured(0)", m: measured(0, AT) },
      { label: "measured('')", m: measured("", AT) },
      { label: "measured([])", m: measured([], AT) },
      { label: "measured(false)", m: measured(false, AT) },
      { label: "measured({score:0})", m: measured({ score: 0 }, AT) },
      { label: "zero(0)", m: measuredZero(0, AT) },
      { label: "zero('')", m: measuredZero("", AT) },
      { label: "zero([])", m: measuredZero([], AT) },
      { label: "unmeasured/undeterminable", m: unmeasured("undeterminable", AT) },
      { label: "unmeasured/not_attempted", m: unmeasured("not_attempted", AT) },
    ];

    it.each(cases.map((c) => [c.label, c.m] as const))("%s → isDash === (kind === 'unmeasured')", (_label, m) => {
      const result = renderMeasured(m, { format, unmeasuredLine: FILLED_LINE_KEY });
      expect(result.isDash).toBe(m.kind === "unmeasured");
      expect("line" in result).toBe(m.kind === "unmeasured");
    });
  }
);

describe(
  'REQ-004 c6 — "…every driver depending on it is recorded as "—" … one written line names which driver was missing or … names what could not be measured …" — measured · the line is the caller\'s key, resolved and never invented',
  () => {
    it("with a filled CopyKey, line equals copy(thatKey) exactly", () => {
      const result = renderMeasured(unmeasured<number>("undeterminable", AT), {
        format: (v) => String(v),
        unmeasuredLine: FILLED_LINE_KEY,
      });
      expect(result.line).toBe(copy(FILLED_LINE_KEY));
    });

    it("with the owner-owed unmeasured.undeterminable, renderMeasured throws and the message names the key", () => {
      expect(() =>
        renderMeasured(unmeasured<number>("undeterminable", AT), {
          format: (v) => String(v),
          unmeasuredLine: "unmeasured.undeterminable",
        })
      ).toThrow("unmeasured.undeterminable");
      expect(() =>
        renderMeasured(unmeasured<number>("undeterminable", AT), {
          format: (v) => String(v),
          unmeasuredLine: "unmeasured.undeterminable",
        })
      ).toThrow("owner-owed");
    });
  }
);

describe(
  'REQ-004 c7 — "…the value is recorded as a measured zero and, wherever the report shows that value, shown as 0 with its denominator — never as "—" …" — measured · a measured zero renders through format and is never a dash',
  () => {
    it.each([
      ["number", 0, (v: number) => `${v} of N`],
      ["string", "", (v: string) => `<empty:${v.length}>`],
      ["array", [] as number[], (v: number[]) => `<len:${v.length}>`],
    ] as const)("zero of a %s renders through format and carries no line", (_label, zeroValue, format) => {
      const result = renderMeasured(measuredZero(zeroValue as never, AT), {
        format: format as (v: never) => string,
        unmeasuredLine: FILLED_LINE_KEY,
      });
      expect(result.text).toBe((format as (v: unknown) => string)(zeroValue));
      expect(result.isDash).toBe(false);
      expect("line" in result).toBe(false);
    });

    it("there is no zero branch to break — 'zero' occurs zero times and 'unmeasured' occurs exactly once", () => {
      const zeroMatches = SOURCE.match(/'zero'|"zero"/g) ?? [];
      const unmeasuredMatches = SOURCE.match(/'unmeasured'|"unmeasured"/g) ?? [];
      expect(zeroMatches.length).toBe(0);
      expect(unmeasuredMatches.length).toBe(1);
    });
  }
);

describe(
  'REQ-004 c9 — "…everything depending on it is recorded as "—" … one written line states it was not measured because the scan stopped early, and it is never shown or recorded as 0." — measured · a not_attempted value can never become 0',
  () => {
    it("text is the dash, isDash is true, text is never '0' or ''", () => {
      const result = renderMeasured(unmeasured<number>("not_attempted", AT), {
        format: (v) => String(v),
        unmeasuredLine: FILLED_LINE_KEY,
      });
      expect(result.isDash).toBe(true);
      expect(result.text).not.toBe("0");
      expect(result.text).not.toBe("");
      expect(result.text).toBe(copy("unmeasured.dash"));
    });

    // The @ts-expect-error fixture below is never invoked at runtime; `npm
    // run typecheck` is what discriminates (WO-277's own convention). Mirrors
    // `renderMeasured`'s own guard: narrow to the `unmeasured` arm and try
    // to call `o.format(...)` on it — there is no `T` in scope to give it.
    function _typeLevelNegatives<T>(m: Measured<T>, o: { format: (v: T) => string }): void {
      if (m.kind === "unmeasured") {
        // @ts-expect-error — the narrowed `unmeasured` arm carries no `value` field; `o.format` has nothing to be called with.
        const text = o.format(m.value);
        void text;
      }
    }
    void _typeLevelNegatives;

    it("documents the @ts-expect-error fixture above; format is uncallable on the unmeasured arm", () => {
      expect(typeof _typeLevelNegatives).toBe("function");
    });
  }
);

describe(
  'REQ-004 c12 — "…nothing stands in its place: no estimate, no interpolated value, no default, and no value carried over from an earlier scan of that domain …" — measured · nothing stands in an unmeasured value\'s place',
  () => {
    it("format is called exactly once on measured/zero, with m.value and no second argument; zero times on unmeasured", () => {
      const formatMeasured = vi.fn((v: number) => `${v}`);
      renderMeasured(measured(7, AT), { format: formatMeasured, unmeasuredLine: FILLED_LINE_KEY });
      expect(formatMeasured).toHaveBeenCalledTimes(1);
      expect(formatMeasured).toHaveBeenCalledWith(7);

      const formatZero = vi.fn((v: number) => `${v}`);
      renderMeasured(measuredZero(0, AT), { format: formatZero, unmeasuredLine: FILLED_LINE_KEY });
      expect(formatZero).toHaveBeenCalledTimes(1);
      expect(formatZero).toHaveBeenCalledWith(0);

      const formatUnmeasured = vi.fn((v: number) => `${v}`);
      renderMeasured(unmeasured<number>("undeterminable", AT), { format: formatUnmeasured, unmeasuredLine: FILLED_LINE_KEY });
      renderMeasured(unmeasured<number>("not_attempted", AT), { format: formatUnmeasured, unmeasuredLine: FILLED_LINE_KEY });
      expect(formatUnmeasured).not.toHaveBeenCalled();
    });

    it("renderMeasured called twice with identical arguments returns deep-equal results — no module-level mutable state", () => {
      const args = [measured(7, AT), { format: (v: number) => `${v}`, unmeasuredLine: FILLED_LINE_KEY }] as const;
      const a = renderMeasured(...args);
      const b = renderMeasured(...args);
      expect(a).toEqual(b);
    });

    it("measured.ts contains no numeric literal, no String(), no ??, no ||", () => {
      const codeOnly = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(codeOnly).not.toMatch(/\d/);
      expect(codeOnly).not.toMatch(/String\(/);
      expect(codeOnly).not.toMatch(/\?\?/);
      expect(codeOnly).not.toMatch(/\|\|/);
    });
  }
);

describe("measured · exports exactly renderMeasured, and DASH_KEY is not exported", () => {
  it("the only export is renderMeasured", () => {
    const exportNames = [...SOURCE.matchAll(/^export\s+(?:type|function|const)\s+([A-Za-z_$][\w$]*)/gm)].map(
      (m) => m[1]
    );
    expect(new Set(exportNames)).toEqual(new Set(["renderMeasured"]));
  });

  it("m.at is read nowhere in the file", () => {
    expect(SOURCE).not.toMatch(/\.at\b/);
  });
});
