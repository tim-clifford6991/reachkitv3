// tests/app/route-groups.test.ts
//
// WO-002 `## Test plan` — two rows, both quoted verbatim from BP-001:
//
//   1. Decision "three route groups — `(public)`, `(account)`, `(hosted)`
//      — with the authorisation rule attached to the group rather than to
//      the route." (BP-001's current numbering is decision 3; WO-002's own
//      table cites it as "decision 2" — the quote is unchanged, only the
//      ordinal has drifted since this work order was cut.) — asserts all
//      three directories exist.
//   2. `## Module / boundary`: "It does **not** own `src/app/(hosted)/**`,
//      which is BP-004's." — fails if this work order writes any file
//      under `(hosted)` other than the placeholder that makes the empty
//      directory exist in git (the same mechanism `src/app/.gitkeep` and
//      its siblings already use elsewhere in this repo).
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(import.meta.dirname, "../../src/app");

describe('BP-001 decision — "three route groups ... with the authorisation rule attached to the group rather than to the route"', () => {
  it.each(["(public)", "(account)", "(hosted)"])("the %s route-group directory exists", (group) => {
    const dir = path.join(APP_ROOT, group);
    expect(existsSync(dir), `${dir} must exist`).toBe(true);
  });

  it("(public) and (account) each carry this work order's pass-through layout", () => {
    expect(existsSync(path.join(APP_ROOT, "(public)", "layout.tsx"))).toBe(true);
    expect(existsSync(path.join(APP_ROOT, "(account)", "layout.tsx"))).toBe(true);
  });
});

describe('BP-001 `## Module / boundary` — "It does **not** own `src/app/(hosted)/**`, which is BP-004\'s."', () => {
  it("(hosted) carries no layout.tsx written by this work order", () => {
    const hostedLayout = path.join(APP_ROOT, "(hosted)", "layout.tsx");
    expect(existsSync(hostedLayout), "(hosted)/layout.tsx belongs to BP-047, not WO-002").toBe(false);
  });

  it("(hosted) carries no file besides the placeholder that keeps the empty directory in git", () => {
    const hostedDir = path.join(APP_ROOT, "(hosted)");
    const entries = readdirSync(hostedDir);
    expect(entries).toEqual([".gitkeep"]);
  });
});
