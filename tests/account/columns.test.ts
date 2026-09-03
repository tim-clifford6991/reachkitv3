// tests/account/columns.test.ts
//
// WO-272 `## Test plan` — acceptance quoted from BP-017, BP-002, BP-059,
// REQ-073 and `structure.md` (this node carries no requirement of its own
// and cites, never inherits — BP-017 `satisfies: []`).
//
// **Substrate note (owner ruling, 2026-09-03; Docker unavailable on this
// host, carried from `tests/db/baseline.test.ts`):** `supabase db reset`
// cannot run. In its place this file resets and re-applies
// `00000000000001_baseline.sql`, `00000000000003_users_notify_column.sql`
// and `00000000000004_sites_timezone_column.sql` against native PostgreSQL
// 18 at `127.0.0.1:5432`, database `reachkit_scratch`, via `psql` spawned
// from `child_process` — the same mechanism, same database,
// `tests/db/baseline.test.ts` and `tests/db/rls.test.ts` use. RLS is not
// under test here (BP-017's delta, not BP-002's policies), so
// `00000000000002_rls.sql` is not applied.
//
// **Run this file with `--no-file-parallelism`** alongside `tests/db/*`
// (see `tests/db/baseline.test.ts`'s header for why): all reset and
// rebuild the same physical `public` schema on the one scratch database.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { topicOf } from "../../src/lib/db/topics";

const DB_HOST = "127.0.0.1";
const DB_PORT = "5432";
const DB_USER = "reachkit";
const DB_PASSWORD = "reachkit";
const DB_NAME = "reachkit_scratch";
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINE_MIGRATION = path.join(
  REPO_ROOT,
  "supabase/migrations/00000000000001_baseline.sql"
);
const USERS_NOTIFY_MIGRATION = path.join(
  REPO_ROOT,
  "supabase/migrations/00000000000003_users_notify_column.sql"
);
const SITES_TIMEZONE_MIGRATION = path.join(
  REPO_ROOT,
  "supabase/migrations/00000000000004_sites_timezone_column.sql"
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

beforeAll(() => {
  psql([
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;",
  ]);
  psql(["-v", "ON_ERROR_STOP=1", "-f", BASELINE_MIGRATION]);
  psql(["-v", "ON_ERROR_STOP=1", "-f", USERS_NOTIFY_MIGRATION]);
  psql(["-v", "ON_ERROR_STOP=1", "-f", SITES_TIMEZONE_MIGRATION]);
});

afterAll(() => {
  psql([
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "drop schema public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;",
  ]);
});

function freshUserId(): string {
  const rows = psqlRows(
    `insert into users (email, plan_status) values ('acct-${Math.random().toString(36).slice(2)}@example.com', 'active') returning id;`
  );
  const [row] = rows;
  const [id] = row ?? [];
  if (!id) throw new Error("insert into users returned no id");
  return id;
}

function freshSiteId(userId: string): string {
  const rows = psqlRows(
    `insert into sites (user_id, domain) values ('${userId}', 'example.com') returning id;`
  );
  const [row] = rows;
  const [id] = row ?? [];
  if (!id) throw new Error("insert into sites returned no id");
  return id;
}

describe(
  'BP-017 `## Data model delta`: "`users` — as `BUILD.md` §10, plus `notify jsonb`, …"',
  () => {
    it("users.notify exists as jsonb, not null, default {}", () => {
      const rows = psqlRows(
        `select data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'notify';`
      );
      expect(rows).toEqual([["jsonb", "NO", "'{}'::jsonb"]]);
    });

    it("an insert omitting the column reads {}", () => {
      const userId = freshUserId();
      const rows = psqlRows(`select notify from users where id = '${userId}';`);
      expect(rows).toEqual([["{}"]]);
    });
  }
);

describe(
  'BP-017 `## Data model delta`: "`sites` — as §10, plus `timezone`, `publishing_enabled`."',
  () => {
    it("sites.timezone exists as text and is nullable with no default", () => {
      const rows = psqlRows(
        `select data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'sites' and column_name = 'timezone';`
      );
      expect(rows).toEqual([["text", "YES", ""]]);
    });

    it("an insert omitting it succeeds and reads null", () => {
      const userId = freshUserId();
      const siteId = freshSiteId(userId);
      const rows = psqlRows(`select coalesce(timezone, '<null>') from sites where id = '${siteId}';`);
      expect(rows).toEqual([["<null>"]]);
    });
  }
);

describe(
  'BP-059 `## Data model delta`: "The value is a sparse object over `NotifyKind`, default `{}`."',
  () => {
    it("a non-object notify value is refused", () => {
      const userId = freshUserId();
      expect(raises(`update users set notify = '[]'::jsonb where id = '${userId}';`)).toBe(true);
      expect(raises(`update users set notify = '"x"'::jsonb where id = '${userId}';`)).toBe(true);
      expect(raises(`update users set notify = 'null'::jsonb where id = '${userId}';`)).toBe(true);
    });

    it("{} and a populated object are accepted", () => {
      const userId = freshUserId();
      expect(raises(`update users set notify = '{}'::jsonb where id = '${userId}';`)).toBe(false);
      expect(
        raises(`update users set notify = '{"weekly": false}'::jsonb where id = '${userId}';`)
      ).toBe(false);
      const rows = psqlRows(`select notify from users where id = '${userId}';`);
      expect(rows).toEqual([['{"weekly": false}']]);
    });
  }
);

describe(
  'BP-002 `## Data model delta`: "`users.notify jsonb` … `users` · BP-017 (leaf: BP-059)" and "`sites.timezone` … `sites` · BP-017 (leaf: BP-057)"',
  () => {
    it("both migration names resolve to BP-017 and to no other node", () => {
      expect(topicOf("00000000000003_users_notify_column.sql")).toEqual({
        token: "users",
        owner: "BP-017",
      });
      expect(topicOf("00000000000004_sites_timezone_column.sql")).toEqual({
        token: "sites",
        owner: "BP-017",
      });
    });
  }
);

describe(
  '`structure.md` rule 3a: "A column added to `users`, `sites` or any other baseline table after the baseline is a migration under that table\'s token or a sub-token of it — never \'part of the baseline\'"',
  () => {
    it("the baseline file is unmodified", () => {
      const baselineText = readFileSync(BASELINE_MIGRATION, "utf8");
      expect(baselineText).not.toMatch(/\bnotify\b/);
      expect(baselineText).not.toMatch(/\btimezone\b/);
    });

    it("the two columns arrive in the two migrations above and nowhere else", () => {
      const usersNotifyText = readFileSync(USERS_NOTIFY_MIGRATION, "utf8");
      const sitesTimezoneText = readFileSync(SITES_TIMEZONE_MIGRATION, "utf8");
      expect(usersNotifyText).toMatch(/add column notify/);
      expect(sitesTimezoneText).toMatch(/add column timezone/);
    });
  }
);

describe(
  'REQ-073 criterion 1: "where they have set nothing, … the time zone is the one their browser reported at first sign-in"',
  () => {
    it("no fallback zone is written by the schema", () => {
      const userId = freshUserId();
      const siteId = freshSiteId(userId);
      const rows = psqlRows(`select coalesce(timezone, '<null>') from sites where id = '${siteId}';`);
      expect(rows).toEqual([["<null>"]]);
      expect(rows[0]?.[0]).not.toBe("UTC");
    });
  }
);
