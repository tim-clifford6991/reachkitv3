// tests/scan/report/schema.test.ts
//
// WO-280 `## Test plan` (carried verbatim from WO-254) — the column,
// constraint and index assertions BP-012 `## Data model delta` and
// decision 1 name, asserted against a live, migrated scratch database.
//
// **Substrate note (owner ruling, 2026-09-03; Docker unavailable on this
// host, mirroring `tests/scan/free/schema.test.ts` and `tests/measure/
// verdict/constraint.test.ts`'s own mechanism):** resets and re-applies
// the baseline plus this WO's own `*_scans_current.sql` against native
// PostgreSQL 18 at `127.0.0.1:5432`, database `reachkit_scratch`, via
// `psql` spawned from `child_process`. RLS is not under test here (this
// migration adds none), so `00000000000002_rls.sql` is not applied.
//
// **Run this file with `--no-file-parallelism`** alongside the rest of
// `vitest.config.ts`'s `db` project — all reset and rebuild the same
// physical `public` schema on the one scratch database `supabase db
// reset` would otherwise give each an isolated instance of.
// `vitest.config.ts` is outside this work order's file plan (rule 2); this
// file is folded into that project's `LIVE_SCHEMA_TESTS` list, the one
// declared place both the `db` project's `include` and the `node`
// project's `exclude` read from (WO-283).
import { execFileSync } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DB_HOST = "127.0.0.1";
const DB_PORT = "5432";
const DB_USER = "reachkit";
const DB_PASSWORD = "reachkit";
const DB_NAME = "reachkit_scratch";
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const BASELINE_MIGRATION = path.join(REPO_ROOT, "supabase/migrations/00000000000001_baseline.sql");
const CURRENT_MIGRATION = path.join(
  REPO_ROOT,
  "supabase/migrations/20260904110000_scans_current.sql"
);

function psql(args: string[]): string {
  return execFileSync("psql", ["-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER, "-d", DB_NAME, "-q", ...args], {
    env: { ...process.env, PGPASSWORD: DB_PASSWORD },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

/** One tuple-only row per line, `|`-separated columns — easy to split. */
function psqlRows(sql: string): string[][] {
  const out = psql(["-v", "ON_ERROR_STOP=1", "-Atc", sql]);
  return out
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => line.split("|"));
}

/** Runs `sql` and returns whether it raised (never throws itself). */
function raises(sql: string): boolean {
  try {
    psql(["-v", "ON_ERROR_STOP=1", "-c", sql]);
    return false;
  } catch {
    return true;
  }
}

function resetSchema(): void {
  psql([
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;",
  ]);
}

beforeAll(() => {
  resetSchema();
  psql(["-v", "ON_ERROR_STOP=1", "-f", BASELINE_MIGRATION]);
  psql(["-v", "ON_ERROR_STOP=1", "-f", CURRENT_MIGRATION]);
});

afterAll(() => {
  resetSchema();
});

function insertScan(opts: { domain: string; isCurrent?: boolean; status?: string }): string {
  const { domain, isCurrent, status = "done" } = opts;
  const columns = ["domain", "tier", "status"];
  const values = [`'${domain}'`, "'free'", `'${status}'`];
  if (isCurrent !== undefined) {
    columns.push("is_current");
    values.push(String(isCurrent));
  }
  const rows = psqlRows(
    `insert into scans (${columns.join(", ")}) values (${values.join(", ")}) returning id;`
  );
  const [row] = rows;
  const [id] = row ?? [];
  if (!id) throw new Error("insert into scans returned no id");
  return id;
}

describe(
  'BP-012 `## Data model delta` — "scans — as BUILD.md §10, plus is_current … supersedes_scan_id, correction_state, and stopped_reason"',
  () => {
    it("`is_current` is boolean, not null, default false", () => {
      const rows = psqlRows(
        `select data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'scans' and column_name = 'is_current';`
      );
      expect(rows).toEqual([["boolean", "NO", "false"]]);
    });

    it("`supersedes_scan_id` is a nullable uuid referencing scans(id)", () => {
      const rows = psqlRows(
        `select data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'scans' and column_name = 'supersedes_scan_id';`
      );
      expect(rows).toEqual([["uuid", "YES"]]);
      expect(
        raises(
          `insert into scans (domain, tier, status, supersedes_scan_id) values ('bad-fk.example.com', 'free', 'done', '00000000-0000-0000-0000-000000000000');`
        )
      ).toBe(true);
      const parentId = insertScan({ domain: "supersedes-parent.example.com" });
      expect(
        raises(
          `insert into scans (domain, tier, status, supersedes_scan_id) values ('supersedes-child.example.com', 'free', 'done', '${parentId}');`
        )
      ).toBe(false);
    });

    it("`correction_state` is text, not null, default 'none'", () => {
      const rows = psqlRows(
        `select data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'scans' and column_name = 'correction_state';`
      );
      expect(rows).toEqual([["text", "NO", "'none'::text"]]);
      const id = insertScan({ domain: "no-writer-knowledge-correction.example.com" });
      const value = psqlRows(`select correction_state from scans where id = '${id}';`);
      expect(value).toEqual([["none"]]);
    });

    it("`stopped_reason` is text, not null, default 'complete', constrained to the four named values", () => {
      const rows = psqlRows(
        `select data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'scans' and column_name = 'stopped_reason';`
      );
      expect(rows).toEqual([["text", "NO", "'complete'::text"]]);

      for (const reason of ["complete", "time_ceiling", "spend_ceiling", "failed"]) {
        expect(
          raises(
            `insert into scans (domain, tier, status, stopped_reason) values ('reason-${reason}.example.com', 'free', 'done', '${reason}');`
          )
        ).toBe(false);
      }
      expect(
        raises(
          `insert into scans (domain, tier, status, stopped_reason) values ('reason-bogus.example.com', 'free', 'done', 'bogus');`
        )
      ).toBe(true);
    });
  }
);

describe(
  'BP-012 decision 1 — "unique (domain) where is_current plus a single transaction that inserts the new scan and flips the pointer" — the index half',
  () => {
    it("two current reports for one domain are unrepresentable", () => {
      insertScan({ domain: "one-current.example.com", isCurrent: true });
      expect(
        raises(
          `insert into scans (domain, tier, status, is_current) values ('one-current.example.com', 'free', 'done', true);`
        )
      ).toBe(true);
    });

    it("a second row with `is_current = false` for the same domain inserts freely — the index constrains only what it should", () => {
      insertScan({ domain: "one-current-plus-history.example.com", isCurrent: true });
      expect(
        raises(
          `insert into scans (domain, tier, status, is_current) values ('one-current-plus-history.example.com', 'free', 'done', false);`
        )
      ).toBe(false);
      const rowCount = psqlRows(
        `select count(*) from scans where domain = 'one-current-plus-history.example.com';`
      );
      expect(rowCount[0]?.[0]).toBe("2");
    });

    it("the index is a partial index on `(domain) where is_current`, not a bare unique on `domain`", () => {
      const rows = psqlRows(
        `select indexdef from pg_indexes where schemaname = 'public' and indexname = 'idx_scans_one_current_per_domain';`
      );
      expect(rows).toHaveLength(1);
      const [indexdef] = rows[0] ?? [];
      expect(indexdef).toMatch(/UNIQUE INDEX idx_scans_one_current_per_domain ON public\.scans USING btree \(domain\) WHERE is_current/);
    });
  }
);
