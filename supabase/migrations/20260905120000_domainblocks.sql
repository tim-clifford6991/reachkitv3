-- supabase/migrations/20260905120000_domainblocks.sql
--
-- BUILD §4.1 · REQ-002 · ADR-002 · BP-002 `## Data model delta` and
-- decision 1: the eleventh table, and the one this project deliberately
-- gives no writer.
--
-- Why a table and not a column (BP-002 decision 1, verbatim): "REQ-002
-- criterion 3 removes a report for a **domain**, permanently and across
-- every future scan; a scan-scoped column cannot bind a scan that does not
-- exist yet." The rejected alternative was `scans.removed_at` — rejected
-- because a removal must refuse a scan for a domain that has no `scans`
-- row at all. `tests/db/domainblocks.test.ts` asserts `scans` still carries
-- no `removed_at`, so that alternative cannot creep back in unnoticed.
--
-- **No writer anywhere in the product** (REQ-002 c4: "a report is taken
-- down only by a removal request received at the address criterion 1
-- names, never at ReachKit's own initiative"). That promise is kept
-- structurally, in three places, none of which is a permission check in
-- application code:
--
--   1. RLS is enabled with **no policy at all** — the baseline's own
--      convention (`00000000000001_baseline.sql`: "a table with no policy
--      is unreadable by anyone holding an anon or authenticated key").
--      Nothing reached through `db()` can read or write a row.
--   2. `anon` and `authenticated` are granted **select only**, so the
--      absence of a writer holds at the grant level too, one layer below
--      the policies. Every other table in this schema grants all four
--      verbs to all three roles; this one deliberately does not, and
--      that asymmetry is the point rather than an oversight.
--   3. No file under `src/` writes the table — asserted repository-wide by
--      `tests/db/domainblocks.test.ts`, which is the only assertion that
--      can discharge "no writer *anywhere in the product*".
--
-- A row is written by hand, by a person, through the service role, after a
-- person has judged a written removal request — the manual operation
-- ADR-002 records ("v1 report removal is a written request, not an
-- authenticated control") and whose five-working-day window
-- (`RETENTION_D.removalSlaWorkingDays`) no code in this repository
-- enforces, because no code can.
--
-- **Timestamp provenance** (the convention `20260904110000_scans_
-- current.sql` set for the identical class of collision): WO-012's file
-- plan names this file `00000000000003_domainblocks.sql`, a slot taken by
-- `00000000000003_users_notify_column.sql` since that plan was written.
-- `20260905120000` sorts after every migration on disk at implementation
-- time, so this file always applies last regardless of merge order. It has
-- no functional dependency on any of them: it creates one table and
-- touches nothing that exists.
--
-- **One topic token** (`ARCHITECTURE.md` rule 6; `src/lib/db/topics.ts`):
-- `domainblocks` is BP-002's own, alongside `baseline` and `rls`. The RLS
-- statements live in this file rather than a `*_domainblocks_rls*.sql`
-- companion on purpose — a name carrying both `domainblocks` and `rls`
-- resolves to two topics and `topicOf()` refuses it.

create table domain_blocks (
  id uuid primary key default gen_random_uuid(),
  -- One canonical domain key, ADR-020: `parseDomain` → `CanonicalDomain` is
  -- already lowercase, and the check keeps a hand-written row honest — the
  -- reader (`isRemoved`, `src/lib/scan/admission.ts`) matches on equality,
  -- so a row typed in mixed case would silently block nothing.
  domain text not null unique check (domain = lower(domain)),
  blocked_at timestamptz not null default now(),
  -- The written request this block was granted against, recorded by the
  -- person who granted it (WO-012 `## File plan`: "the operator note field
  -- the written request is recorded against"). Not null: a block with no
  -- record of the request behind it is exactly what REQ-002 c4 forbids.
  note text not null
);

alter table domain_blocks enable row level security;

-- Read-only, and only to a role RLS then denies outright. `service_role`
-- bypasses RLS (`BYPASSRLS`) but still needs the object privilege — the
-- baseline's own note — so it is the one role that can insert the row a
-- person writes by hand, and `dbAdmin()` is the only path in the product
-- that reads it.
grant select on domain_blocks to anon, authenticated;
grant select, insert, update, delete on domain_blocks to service_role;
