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

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    sequence: {
      sequencer: PinsFirstSequencer,
    },
    // Node environment by default; jsdom for tests/ui/** only.
    projects: [
      {
        extends: true,
        test: { name: "node", environment: "node", exclude: ["tests/ui/**", "node_modules/**"] },
      },
      {
        extends: true,
        test: { name: "ui", environment: "jsdom", include: ["tests/ui/**/*.test.{ts,tsx}"] },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
