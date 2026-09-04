import path from "node:path";
import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";

/**
 * BP-005 NFR budget: "The pins test runs in under a second and is the
 * first check in CI, so a drifted constant fails before anything expensive
 * runs." Vitest does not order test files by declaration or by directory,
 * so the ordering is enforced with a custom sequencer rather than left to
 * discovery order.
 */
class PinsFirstSequencer extends BaseSequencer {
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const isPins = (f: TestSpecification) => f.moduleId.endsWith("tests/pins.test.ts");
    const pins = files.filter(isPins);
    const rest = files.filter((f) => !isPins(f));
    return [...pins, ...rest];
  }
}

/**
 * WO-283: every test file that resets the one live scratch schema, declared
 * once so the `db` project's `include` and the `node` project's `exclude`
 * cannot diverge again — that divergence (four files hand-copied into both
 * lists while two more were added to neither) is the defect WO-276's
 * implementer found and this order fixes. A listed path that matches no
 * file on disk (`tests/costs/**`, `tests/measure/verdict/constraint.test.ts`
 * before WO-276 and WO-277 respectively merge) is not an error: these are
 * glob patterns evaluated against whatever files exist, not a manifest
 * that must resolve. `constraint.test.ts` belongs here on the same
 * grounds as the rest — WO-277's implementer independently found the same
 * gap the same day (rule 4.2) and folded it into this list rather than
 * re-opening a second hand-maintained copy.
 */
const LIVE_SCHEMA_TESTS = [
  "tests/db/baseline.test.ts",
  "tests/db/rls.test.ts",
  "tests/db/clients.test.ts",
  "tests/scan/free/admission-claim.test.ts",
  "tests/scan/free/schema.test.ts",
  "tests/account/columns.test.ts",
  "tests/costs/fetches-schema.test.ts",
  "tests/costs/context.test.ts",
  "tests/measure/verdict/constraint.test.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    sequence: {
      sequencer: PinsFirstSequencer,
    },
    // Node environment by default; jsdom for tests/ui/** except its layout
    // suite, which needs a real browser (ADR-093 rests-on row 1) and so gets
    // its own node-environment project with `browser.ts` as global setup.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          exclude: ["tests/ui/**", "node_modules/**", ...LIVE_SCHEMA_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/ui/**/*.test.{ts,tsx}"],
          exclude: ["tests/ui/layout/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "layout",
          environment: "node",
          include: ["tests/ui/layout/**/*.test.ts"],
          globalSetup: ["tests/ui/layout/browser.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: LIVE_SCHEMA_TESTS,
          fileParallelism: false,
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
