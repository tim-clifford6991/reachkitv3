// tests/market/questions/import-graph.ts — BUILD §6.7, issue #26
//
// The purity assertions BP-025 decision 1 asks for are about what a module
// can *reach*, not about what it happens to call in one test, so they are
// asserted over the module's resolved import closure.
//
// **Runtime imports only.** `import type` is erased before anything runs: a
// type-only edge cannot spend money, open a socket or call a model, and
// `select.ts` legitimately imports `SuggestionRow`'s *type* from
// `market-set.ts`, which does buy. Counting that erased edge would make the
// test assert the opposite of what BP-025 means — so the walker skips
// `import type` / `export type` and follows everything else.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const SRC_ROOT = path.resolve(__dirname, "../../../src");

/** `import …  from "x"` / `export … from "x"`, minus the `type` forms. */
const FROM_CLAUSE = /(?:^|\n)\s*(?:import|export)\s+(type\s)?[^;]*?from\s+["']([^"']+)["']/g;
/** `import "x"` — a side-effect import, always a runtime edge. */
const SIDE_EFFECT = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;

function resolveSpecifier(fromFile: string, specifier: string): string | undefined {
  const base = specifier.startsWith("@/")
    ? path.join(SRC_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(fromFile), specifier)
      : undefined; // a package, not a file in this tree
  if (base === undefined) return undefined;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** Every file reachable from `entry` by a runtime import, `entry` included,
 *  as paths relative to the repository's `src/`. */
export function runtimeImportClosure(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [path.resolve(entry)];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(FROM_CLAUSE)) {
      if (match[1] !== undefined) continue; // `import type` — erased
      const resolved = resolveSpecifier(file, match[2]!);
      if (resolved !== undefined) queue.push(resolved);
    }
    for (const match of source.matchAll(SIDE_EFFECT)) {
      const resolved = resolveSpecifier(file, match[1]!);
      if (resolved !== undefined) queue.push(resolved);
    }
  }

  return [...seen].map((file) => path.relative(SRC_ROOT, file)).sort();
}

export const QUESTIONS_DIR = path.resolve(__dirname, "../../../src/lib/market/questions");
