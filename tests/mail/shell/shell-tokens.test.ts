// BUILD §2.1 · §2.3 · §12 — the mail frame names tokens; it never mints values.
//
// A mail client cannot resolve `var(--accent)`, so the seam has to carry
// resolved values inline. `src/lib/mail/shell/tokens.ts` is the one place
// they are written down, and this suite holds both halves of that claim:
// every value there is the one `src/ui/theme.css` and `src/ui/type.css`
// declare, and no other file under `src/lib/mail/**` contains a colour or
// a font stack at all.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAIL_TOKENS, token } from "../../../src/lib/mail/shell/tokens";

const ROOT = path.resolve(__dirname, "../../..");
const MAIL_DIR = path.join(ROOT, "src/lib/mail");
const TOKENS_FILE = path.join(MAIL_DIR, "shell/tokens.ts");

/** The `:root` block of `theme.css` plus the `.rk-fonts` block of
 *  `type.css` — the two places BP-018 binds the names this seam uses. */
function declaredTokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [file, selector] of [
    ["src/ui/theme.css", ":root {"],
    ["src/ui/type.css", ".rk-fonts {"],
  ] as const) {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const start = source.indexOf(selector);
    expect(start, `${file} has no ${selector} block`).toBeGreaterThan(-1);
    const end = source.indexOf("\n}", start);
    const block = source.slice(start, end);
    for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const [, name, value] = match;
      if (name !== undefined && value !== undefined && !(name in out)) out[name] = value.trim();
    }
  }
  return out;
}

/** Comments are prose about the rule, not the rule being broken — this
 *  suite reads what a mail actually emits, so `//` and block comments are
 *  removed before the source is scanned. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

function mailSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith(".ts")) out.push(full);
    }
  };
  walk(MAIL_DIR);
  return out;
}

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const COLOUR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|oklch|color-mix)\(/;
const FONT_STACK = /(?:JetBrains|Jakarta|ui-sans-serif|ui-monospace|SFMono|sans-serif|monospace)/;

describe("BUILD §2.1 — every mail value is a BP-018 token", () => {
  it("every token this seam carries is the value theme.css / type.css declares", () => {
    const declared = declaredTokens();
    expect(Object.keys(MAIL_TOKENS).length).toBeGreaterThan(0);
    for (const name of Object.keys(MAIL_TOKENS) as (keyof typeof MAIL_TOKENS)[]) {
      expect(declared[name], `${name} is not declared in theme.css or type.css`).toBeDefined();
      expect(token(name), `${name} drifted from its declaration`).toBe(declared[name]);
    }
  });

  it("no file under src/lib/mail/** but tokens.ts contains a colour or a font stack", () => {
    const offenders: string[] = [];
    for (const file of mailSources()) {
      if (file === TOKENS_FILE) continue;
      const source = withoutComments(readFileSync(file, "utf8"));
      for (const [rule, re] of [
        ["hex", HEX],
        ["colour-function", COLOUR_FUNCTION],
        ["font-stack", FONT_STACK],
      ] as const) {
        if (re.test(source)) offenders.push(`${path.relative(ROOT, file)} (${rule})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the sweep walks a non-empty tree — an empty walk would pass vacuously", () => {
    expect(mailSources().length).toBeGreaterThan(5);
  });
});
