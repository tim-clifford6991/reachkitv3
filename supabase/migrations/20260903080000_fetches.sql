-- supabase/migrations/20260903080000_fetches.sql
--
-- WO-276 (consolidates WO-021, WO-022 under rule 2.6) — BP-007
-- `## Data model delta`, verbatim:
--   "`fetches` — `id, scan_id, source, cache_key, policy_version,
--   cost_cents, reserved_cents, payload jsonb, created_at`. `cost_cents` is
--   what was **ledgered** — the settled figure where a call settled, the
--   reservation otherwise — and `reserved_cents` is what the cap was
--   checked against ... A column, not a second table: the two figures
--   belong to the same call. `reserved_cents` is added by this node's own
--   migration glob (`supabase/migrations/*_fetches*.sql`) and no row
--   exists yet to backfill. **Insert-only; no unique constraint on
--   `(source, cache_key, policy_version)`** (corrected 2026-09-03,
--   decision 3). Indexed `(source, cache_key, policy_version, created_at
--   desc)` for the cache read and on `scan_id` for the ledger read. No
--   second table: the ledger, the cache and the raw store are one row,
--   and every vendor call actually made writes one — a cache hit writes
--   none, because nothing was spent to ledger."
--
-- `reserved_cents` ships in this create-table statement, not as a later
-- additive migration (planner ruling, 2026-09-03, under constitution rule
-- 1.1 — recorded on this WO's own front-matter, not re-derived here).
--
-- **No unique constraint, by design (BP-007 decision 3).** The data model
-- as first approved made `(source, cache_key, policy_version)` unique to
-- serve the cache read, which collides with this table's own re-buy
-- promise: a SERP re-bought after its window ages out, and an empty
-- payload "retried on the next scan … billed once per scan and never
-- remembered as an answer", both need a second row at the same key to
-- insert, not upsert over the first (which would be the exact loss "money
-- already spent is always ledgered" forbids). The plain index below is
-- what serves the cache read instead — newest row on the key, inside
-- `freshnessDays`, skipping any row whose payload is the vendor's own
-- zero-result shape. That exclusion is a *read* predicate
-- (`src/lib/costs/cache.ts`) and adds no column and no constraint here
-- (WO-276 `## Out of scope`).
--
-- **RLS: enabled, no policy, and no `anon`/`authenticated` grant needed
-- beyond the standard four privileges** (BP-002 `## Error & edge
-- behavior`, "a table with no policy is unreadable by anyone holding an
-- anon or authenticated key" — default-deny from the moment the table
-- exists). `fetches` carries cost figures and raw vendor payloads and is
-- reachable only through `dbAdmin()` (`service_role`, `BYPASSRLS` granted
-- at the substrate level, same as the baseline's own eight tables) — no
-- request-scoped read policy is added, ever, by this file or any other
-- (BP-007 NFR budget: "No cost figure is ever rendered to a customer").
-- The grant below still needs stating for this table specifically: it is
-- a new table `00000000000001_baseline.sql`'s own grant statement does
-- not cover.
--
-- ADR-051 point 2: no foreign key in this schema carries `ON DELETE
-- CASCADE` from `users` or `sites`; `scan_id` below references `scans`,
-- not `users`/`sites`, so that point does not apply here, and the default
-- `NO ACTION` is used regardless, for consistency.
--
-- `structure.md` rule 3: this file carries the `fetches` topic token
-- (`src/lib/db/topics.ts` already lists it, owner BP-007) — `topicOf()`
-- resolves this filename to `{ token: "fetches", owner: "BP-007" }`.

create table fetches (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans (id),
  source text not null,
  cache_key text not null,
  policy_version integer not null,
  cost_cents integer not null,
  reserved_cents integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table fetches enable row level security;

-- The cache read: newest row on `(source, cache_key, policy_version)`
-- inside `freshnessDays` — `created_at desc` makes "newest" a `limit`
-- against this one index, no separate sort.
create index idx_fetches_cache_read
  on fetches (source, cache_key, policy_version, created_at desc);

-- The ledger read: every row a scan ledgered, for its own roll-up.
create index idx_fetches_scan_id on fetches (scan_id);

-- `service_role` bypasses RLS (`BYPASSRLS`, granted at the substrate
-- level) but still needs the underlying object privilege, exactly as
-- `00000000000001_baseline.sql`'s own grant states for its eight tables.
-- This is `dbAdmin()`'s only access path to `fetches` — no policy below
-- grants any role a request-scoped read.
grant select, insert, update, delete on fetches to anon, authenticated, service_role;
