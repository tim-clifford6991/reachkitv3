// tests/presentation/copy/registry.test.ts
//
// WO-041 test plan. REQ-093 criteria 1 and 5, quoted verbatim in the work
// order's own `## Test plan` table, plus the additional tests WO-041 owns
// (partition closure/totality, COPY_META totality, owner-owed agreement,
// the thirteen band words).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COPY, copy, type CopyKey, type CopyPartition } from "../../../src/lib/presentation/copy/index.ts";
// OWNER_OWED is WO-041's own addition to the interface, not the blueprint's
// (WO-041 `## Interfaces` "Exposes additionally") — it is declared in
// registry.ts, not re-exported through the public barrel, so it is
// imported from its declaring file here.
import { OWNER_OWED } from "../../../src/lib/presentation/copy/registry.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COPY_DIR = path.resolve(HERE, "../../../src/lib/presentation/copy");
const KEYS_DIR = path.join(COPY_DIR, "keys");

const KEY_FILES = fs.readdirSync(KEYS_DIR).filter((f) => f.endsWith(".ts")).sort();
const KEY_SOURCES = new Map(KEY_FILES.map((f) => [f, fs.readFileSync(path.join(KEYS_DIR, f), "utf8")]));
const REGISTRY_SOURCE = fs.readFileSync(path.join(COPY_DIR, "registry.ts"), "utf8");

// A partition's exported const, keyed by its own file name, read directly
// off disk rather than through `COPY` — needed for the "traces to exactly
// one partition" and "no cross-partition import" checks below, which must
// see each partition in isolation before it is merged.
async function loadPartitions(): Promise<Map<string, CopyPartition>> {
  const out = new Map<string, CopyPartition>();
  for (const file of KEY_FILES) {
    const mod: Record<string, CopyPartition> = await import(
      /* @vite-ignore */ `../../../src/lib/presentation/copy/keys/${file}`
    );
    const [exported] = Object.values(mod);
    if (!exported) throw new Error(`${file} exports nothing`);
    out.set(file, exported);
  }
  return out;
}

describe("REQ-093 c1 — COPY is the only source of a product sentence", () => {
  it("COPY is frozen: writing an existing key throws, adding a new key throws", () => {
    expect(() => {
      (COPY as Record<string, string>)["band.score.dominant"] = "changed";
    }).toThrow(TypeError);
    expect(() => {
      (COPY as Record<string, string>)["a-key-nobody-declared"] = "new";
    }).toThrow(TypeError);
    // The attempted write never took: frozen means frozen, not "throws but
    // still mutates" in a non-strict host.
    expect(COPY["band.score.dominant"]).toBe("Dominant");
  });

  it("every value in COPY traces to a string literal present in one partition source read from disk", () => {
    for (const [key, value] of Object.entries(COPY)) {
      const literal = JSON.stringify(value);
      const foundIn = [...KEY_SOURCES.entries()].filter(([, src]) => src.includes(literal));
      expect(foundIn.length, `COPY["${key}"] = ${literal} was not found verbatim in any keys/*.ts source`).toBeGreaterThan(0);
    }
  });

  it("the module's transitive import graph contains no path under src/lib/llm/", () => {
    const entry = path.join(COPY_DIR, "index.ts");
    const visited = new Set<string>();
    const externalSpecifiers: string[] = [];
    const queue = [entry];

    while (queue.length > 0) {
      const file = queue.shift();
      if (!file || visited.has(file)) continue;
      visited.add(file);
      const src = fs.readFileSync(file, "utf8");
      const re = /\bfrom\s+["']([^"']+)["']/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(src))) {
        const specifier = match[1];
        if (!specifier) continue;
        if (specifier.startsWith(".")) {
          const resolved = path.resolve(path.dirname(file), specifier);
          queue.push(resolved);
        } else {
          externalSpecifiers.push(specifier);
        }
      }
    }

    expect(visited.size).toBeGreaterThan(0);
    for (const specifier of externalSpecifiers) {
      expect(specifier).not.toMatch(/lib\/llm/);
    }
    // Today this module has no external (non-relative) import at all —
    // the strongest form of "reaches for nothing" — but the assertion
    // above is the one that discriminates if that ever changes.
  });
});

describe("REQ-093 c5 — the registry renders with every model unavailable", () => {
  // TST-018 defect 2: this test previously mocked `@/lib/llm` and asserted
  // against the mock. `src/lib/llm/` does not exist in this repo yet and
  // nothing in this module's import graph reaches for it (the c1
  // zero-import-graph test above establishes that structurally), so the
  // mock never fired — deleting the whole mock block left the test's
  // outcome unchanged, i.e. it was dead code. What actually discriminates
  // c5 is that every non-owner-owed key renders its stored literal through
  // `copy()` with no lazy fetch, catalogue load or model call on the read
  // path — the same property the c1 import-graph test proves has nothing
  // to reach for. That assertion, plus the count (rule 5.5), is kept below
  // without the vacuous mocking apparatus.
  it("every non-owner-owed key returns its literal through copy(), with zero import path to a language model", () => {
    const nonOwnerOwed = (Object.keys(COPY) as CopyKey[]).filter((key) => !OWNER_OWED.includes(key));

    // Count assertion (rule 5.5): the thirteen band/severity/score words,
    // plus WO-070's eight now-ruled landing keys (headline, field label,
    // submit label — ruled 2026-09-03; the five `landing.problem.*` lines
    // — ruled 2026-09-04; both dates WO-070 `## Log`): 13 + 8 = 21.
    expect(nonOwnerOwed.length).toBe(21);

    for (const key of nonOwnerOwed) {
      expect(copy(key)).toBe(COPY[key]);
    }
  });
});

describe("the partition list is closed and total (BP-020 decision 5)", () => {
  it("keys/ holds exactly twelve partition files", () => {
    expect(KEY_FILES).toEqual([
      "bands.ts",
      "calendar.ts",
      "danger.ts",
      "draft.ts",
      "laws.ts",
      "mail.ts",
      "offer.ts",
      "overview.ts",
      "publish.ts",
      "report.ts",
      "settings.ts",
      "setup.ts",
    ]);
  });

  it("registry.ts imports every file under keys/, and no thirteenth", () => {
    const importedKeyFiles = [...REGISTRY_SOURCE.matchAll(/from\s+["']\.\/keys\/([^"']+)["']/g)]
      .map((m) => m[1])
      .filter((f): f is string => f !== undefined);
    expect(new Set(importedKeyFiles)).toEqual(new Set(KEY_FILES));
    expect(importedKeyFiles).toHaveLength(12);
  });

  it("every key in COPY traces to exactly one partition", async () => {
    const partitions = await loadPartitions();
    const seen = new Map<string, string>();
    for (const [file, partition] of partitions) {
      for (const key of Object.keys(partition)) {
        const owner = seen.get(key);
        expect(owner, `"${key}" is declared in both ${owner} and ${file}`).toBeUndefined();
        seen.set(key, file);
      }
    }
    expect(new Set(seen.keys())).toEqual(new Set(Object.keys(COPY)));
  });

  it("no partition file imports another partition or any surface", () => {
    for (const [file, src] of KEY_SOURCES) {
      const specifiers = [...src.matchAll(/\bfrom\s+["']([^"']+)["']/g)]
        .map((m) => m[1])
        .filter((s): s is string => s !== undefined);
      for (const specifier of specifiers) {
        expect(specifier.startsWith("./"), `${file} imports a sibling partition or surface: "${specifier}"`).toBe(
          false
        );
        expect(specifier).toBe("../registry.ts");
      }
    }
  });
});

describe("COPY_META is total over CopyKey", () => {
  it("a partition entry without CopyMeta is a compile error", () => {
    // @ts-expect-error — a CopyPartition entry must be a [string, CopyMeta]
    // pair; a bare string is not assignable, so a key without meta cannot
    // exist. Discharged by `npm run typecheck`, not by Vitest (see
    // tests/ui/surface.test.tsx for the same convention).
    const bad: CopyPartition = { "fixture.bad": "a bare string, not a [string, CopyMeta] pair" };
    expect(bad).toBeTruthy();
  });
});

describe("owner-owed and empty agree both ways", () => {
  it("every OWNER_OWED key has COPY[key] === '', and every '' value is in OWNER_OWED", () => {
    for (const key of OWNER_OWED) {
      expect(COPY[key]).toBe("");
    }
    const emptyKeys = (Object.keys(COPY) as CopyKey[]).filter((key) => COPY[key] === "");
    expect(new Set(emptyKeys)).toEqual(new Set(OWNER_OWED));
  });

  it("counts: 30 owner-owed, 21 filled, 51 total (rule 5.5 — the index states its own coverage)", () => {
    // WO-070 added report.ts's eight landing keys (headline, field label,
    // submit label, five DomainProblem lines), all owner-owed: 30 + 8 = 38.
    // 2026-09-03: the owner ruled on three of them (headline, field label,
    // submit label — WO-070 `## Log`), so 38 - 3 = 35 remained owner-owed
    // and 13 + 3 = 16 were filled. 2026-09-04: the owner ruled on the
    // remaining five (the `landing.problem.*` lines — WO-070 `## Log`),
    // so 35 - 5 = 30 remain owner-owed and 16 + 5 = 21 are filled; the
    // total is unchanged at 51.
    expect(OWNER_OWED.length).toBe(30);
    expect(Object.keys(COPY).length - OWNER_OWED.length).toBe(21);
    expect(Object.keys(COPY).length).toBe(51);
  });
});

describe("the thirteen band words are the ruled words", () => {
  it("winnability — BP-019 decision 6 (owner ruling, 2026-08-31)", () => {
    expect(copy("band.winnability.winnable")).toBe("Winnable");
    expect(copy("band.winnability.reach")).toBe("Reach");
    expect(copy("band.winnability.notYet")).toBe("Not yet");
    // The transcription note BP-019 decision 6 deliberately did not
    // smooth: "Not yet" renders, never "Not-yet" (the internal handle).
    expect(copy("band.winnability.notYet")).not.toBe("Not-yet");
  });

  it("rival size — BP-019 decision 6 (owner ruling, 2026-08-31)", () => {
    expect(copy("band.rivalSize.near")).toBe("Similar size");
    expect(copy("band.rivalSize.middle")).toBe("Larger");
    expect(copy("band.rivalSize.far")).toBe("Much larger");
  });

  it("severity — BP-019 decision 6 (owner ruling, 2026-08-31), REQ-009 c8", () => {
    expect(copy("severity.low")).toBe("Minor");
    expect(copy("severity.mid")).toBe("Worth fixing");
    expect(copy("severity.high")).toBe("Critical");
  });

  it("score bands — REQ-004 criterion 1's own words: \"Invisible, Hard to find, Findable, Dominant\"", () => {
    expect(copy("band.score.invisible")).toBe("Invisible");
    expect(copy("band.score.hard-to-find")).toBe("Hard to find");
    expect(copy("band.score.findable")).toBe("Findable");
    expect(copy("band.score.dominant")).toBe("Dominant");
  });
});
