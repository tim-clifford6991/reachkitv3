// tests/ui/layout-tokens.test.ts
//
// ADR-093 (DECISIONS 2026-09-02), BP-018 `## Error & edge behavior`: "a
// token missing from `:root` fails a test." Issue #62: `:root` declared no
// `--t-floor`, so check 4 of the conformance suite could not run on any
// route. `src/ui/layout/layout.css` is now the one home of the three
// layout tokens; this file pins its declarations against `BAND_MIN`
// (`src/ui/layout/bands.ts`) in-process — the `tests/pins.test.ts` shape —
// so the transcription and the CSS cannot silently diverge without a
// browser run, and asserts the root layout imports the sheet, so every
// route's document carries them (the browser-side twin is
// `tests/ui/layout/layout.test.ts`'s `:root` assertion).
//
// Runs under the jsdom `ui` project — nothing here needs a layout engine;
// it parses CSS with postcss and reads one source file.
import { readFileSync } from "node:fs";
import path from "node:path";
import postcss, { type Root, type Rule } from "postcss";
import { describe, expect, it } from "vitest";
import { BAND_MIN } from "@/ui/layout/bands";

const LAYOUT_CSS = path.resolve(import.meta.dirname, "../../src/ui/layout/layout.css");
const ROOT_LAYOUT_TSX = path.resolve(import.meta.dirname, "../../src/app/layout.tsx");

/** `design/tokens.md` §2b (frozen in the archived corpus): "`--t-floor`
 *  `11px` — the smallest text in the product, at any viewport." The bottom
 *  of `BUILD.md` §2.3's 10.5–11px eyebrow range; `src/ui/type.css`'s
 *  `.eyebrow` draws the same 11px. */
const T_FLOOR_PX = 11;

function rootDecls(source: string): Map<string, string> {
  const root: Root = postcss.parse(source);
  const rule = root.nodes.find((n): n is Rule => n.type === "rule" && n.selector === ":root");
  if (!rule) throw new Error('src/ui/layout/layout.css: missing bare ":root" rule');
  const out = new Map<string, string>();
  for (const node of rule.nodes) {
    if (node.type === "decl" && node.prop.startsWith("--")) out.set(node.prop, node.value.trim());
  }
  return out;
}

describe("ADR-093 — src/ui/layout/layout.css declares the three layout tokens on :root", () => {
  const decls = rootDecls(readFileSync(LAYOUT_CSS, "utf8"));

  it("--breakpoint-lg equals BAND_MIN.medium, in px", () => {
    expect(decls.get("--breakpoint-lg")).toBe(`${BAND_MIN.medium}px`);
  });

  it("--breakpoint-xl equals BAND_MIN.wide, in px", () => {
    expect(decls.get("--breakpoint-xl")).toBe(`${BAND_MIN.wide}px`);
  });

  it("--t-floor is 11px — the bottom of BUILD.md §2.3's eyebrow range, never lower", () => {
    expect(decls.get("--t-floor")).toBe(`${T_FLOOR_PX}px`);
  });

  it("declares exactly those three and nothing else — a fourth token is a decision, not a line", () => {
    expect([...decls.keys()].sort()).toEqual(["--breakpoint-lg", "--breakpoint-xl", "--t-floor"]);
  });

  it("mutation: a drifted breakpoint is caught", () => {
    const mutated = readFileSync(LAYOUT_CSS, "utf8").replace("--breakpoint-lg: 1024px;", "--breakpoint-lg: 1000px;");
    expect(rootDecls(mutated).get("--breakpoint-lg")).not.toBe(`${BAND_MIN.medium}px`);
  });
});

describe("src/app/layout.tsx imports src/ui/layout/layout.css, so every route's :root carries the tokens", () => {
  it("imports @/ui/layout/layout.css", () => {
    expect(readFileSync(ROOT_LAYOUT_TSX, "utf8")).toMatch(/import\s+["']@\/ui\/layout\/layout\.css["']/);
  });
});
