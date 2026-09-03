// tests/app/layout-runner.test.ts
//
// WO-269 `## Test plan`, quoting BP-018 `## Module / boundary`: "Its
// *runner* (a real browser driver as a dev dependency and a script) is
// BP-001's root toolchain, not this module's." This file lives in BP-001's
// glob (`tests/app/**`, `structure.md` row for the root configuration) and
// checks exactly the runner half: the devDependency, the two scripts, and
// `vitest.config.ts`'s routing — never the suite's own assertions, which
// are `tests/ui/layout/**`'s.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function readJson(relPath: string): unknown {
  return JSON.parse(readFileSync(path.join(ROOT, relPath), "utf8"));
}

describe("BP-018 `## Module / boundary` — the runner is BP-001's root toolchain", () => {
  it("package.json pins playwright exactly, in devDependencies", () => {
    const pkg = readJson("package.json") as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.playwright).toBeUndefined();
    const version = pkg.devDependencies?.playwright;
    expect(version, "playwright must be a devDependency").toBeDefined();
    // WO-001 step 1's no-`^` rule: an exact pin has no range operator.
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("package.json declares a test:layout script running the layout project", () => {
    const pkg = readJson("package.json") as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["test:layout"]).toBe("vitest run --project layout");
  });

  it("package.json's test script runs the node and ui projects, and not layout", () => {
    const pkg = readJson("package.json") as { scripts?: Record<string, string> };
    const testScript = pkg.scripts?.test ?? "";
    expect(testScript).toContain("--project node");
    expect(testScript).toContain("--project ui");
    expect(testScript).not.toContain("--project layout");
  });

  it("vitest.config.ts excludes tests/ui/layout/** from the jsdom ui project", async () => {
    const { default: config } = (await import("../../vitest.config.ts")) as {
      default: { test?: { projects?: Array<{ test?: Record<string, unknown> }> } };
    };
    const projects = config.test?.projects ?? [];
    const ui = projects.find((p) => p.test?.name === "ui");
    expect(ui, "vitest.config.ts must declare a `ui` project").toBeDefined();
    const exclude = (ui!.test?.exclude ?? []) as string[];
    expect(exclude).toContain("tests/ui/layout/**");
  });

  it("vitest.config.ts routes tests/ui/layout/** to a node-environment `layout` project", async () => {
    const { default: config } = (await import("../../vitest.config.ts")) as {
      default: { test?: { projects?: Array<{ test?: Record<string, unknown> }> } };
    };
    const projects = config.test?.projects ?? [];
    const layout = projects.find((p) => p.test?.name === "layout");
    expect(layout, "vitest.config.ts must declare a `layout` project").toBeDefined();
    expect(layout!.test?.environment).toBe("node");
    const include = (layout!.test?.include ?? []) as string[];
    expect(include.some((g) => g.startsWith("tests/ui/layout/"))).toBe(true);
    const globalSetup = layout!.test?.globalSetup;
    const globalSetupList = Array.isArray(globalSetup) ? globalSetup : [globalSetup];
    expect(globalSetupList.some((g) => typeof g === "string" && g.includes("tests/ui/layout/browser"))).toBe(
      true
    );
  });
});
