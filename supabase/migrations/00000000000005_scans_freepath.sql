-- supabase/migrations/00000000000005_scans_freepath.sql
--
-- BP-023 `## Data model delta` (verbatim, WO-056's own `## Interfaces`
-- table): three columns on `scans` and nothing else.
--   network_hash text null      -- the counter REQ-003 criteria 6 and 7 are
--                                -- evaluated over; null for paid tiers.
--                                -- Indexed (network_hash, created_at desc)
--   finished_at  timestamptz null -- REQ-003 criterion 2's p95 is a claim
--                                -- about elapsed time; without an end stamp
--                                -- it cannot be checked from data
--   from_incomplete_rescan boolean not null default false -- REQ-001
--                                -- criterion 14's "made once and does not
--                                -- chain", set at claim time, read by BP-022
--
-- Plus one status value: `scans.status` widens from
-- `running/done/degraded` (the baseline, `00000000000001_baseline.sql`) to
-- add `failed`, so a scan that stops without producing a report has a
-- status of its own rather than being force-fit into `degraded` (which
-- means "produced a report, missing some sections") or left `running`
-- forever.
--
-- No rate-limit table, no counter table: BP-023 decision 1 counts the free
-- path's four bounds from these three columns plus `created_at` alone, and
-- WO-056's own `## Steps` step 5 is "confirm no `rate_limits` table, no
-- counter table and no new topic token appear anywhere in the diff" — this
-- file creates no table.
--
-- `structure.md` rule 3a: this file carries the `scans_freepath` sub-token
-- (BP-023's leaf), not the bare `scans` parent topic (BP-012's) — `topicOf()`
-- resolves `*_scans_freepath*.sql` to `{ token: "scans_freepath", owner:
-- "BP-023" }` by rule 2, "the narrower glob owns the file".
--
-- ADR-051 point 2: no foreign key in this schema carries `ON DELETE
-- CASCADE` from `users` or `sites`; this migration adds no foreign key.
--
-- Out of scope (WO-056 `## Out of scope`, restated only to say what this
-- file does *not* touch): `stopped_reason`, `is_current` and
-- `supersedes_scan_id` (BP-012's own migration, `## Rollback`), and
-- `domain_blocks` (BP-002's table). This migration touches none of them.

alter table scans
  add column network_hash text null,
  add column finished_at timestamptz null,
  add column from_incomplete_rescan boolean not null default false;

-- BP-023's NFR budget costs its two aggregates (REQ-003 criteria 6 and 7,
-- both a count of a network's recent scans) against one composite index,
-- not two single-column ones.
create index idx_scans_network_hash_created_at on scans (network_hash, created_at desc);

alter table scans drop constraint scans_status_check;
alter table scans add constraint scans_status_check
  check (status in ('running', 'done', 'degraded', 'failed'));
