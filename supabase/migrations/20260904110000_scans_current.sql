-- supabase/migrations/20260904110000_scans_current.sql
--
-- BP-012 `## Data model delta` (verbatim, WO-280's own file plan): the four
-- columns this node's blueprint names on `scans`, and nothing else —
-- `is_current`, `supersedes_scan_id`, `correction_state`, `stopped_reason`
-- — plus the one index the promise ("two current reports for one domain
-- are unrepresentable") lives in: `unique (domain) where is_current`.
--
-- BP-012 decision 1: "a partial unique index, not application logic,
-- enforces one current report" — no trigger, no application-level lock and
-- no `select … for update` appears anywhere in this migration or in
-- `src/lib/scan/report.ts`. The flip from one current row to the next is a
-- single transaction in the writer this WO does not build (WO-255,
-- `## Out of scope`); this migration only makes "two current rows for one
-- domain" a constraint violation, not a race the application must avoid.
--
-- Creates no table and widens no enum: `scans.status` is WO-056's own
-- migration (`00000000000005_scans_freepath.sql`); this file does not
-- touch it.
--
-- `structure.md` rule 3a: this file carries the `scans_current` sub-token
-- under BP-012's own `scans` topic — the bare parent topic, since `is_current`
-- and the current-report pointer are this node's leaf (BP-012 is `scans`'
-- own owner, not a leaf beneath it, per that node's `code:` glob
-- `supabase/migrations/*_scans*.sql`).
--
-- ADR-051 point 2: no foreign key in this schema carries `ON DELETE
-- CASCADE` from `users` or `sites`. `supersedes_scan_id` references `scans`
-- itself, not either of those two tables, and uses the default `NO ACTION`.
--
-- **Timestamp provenance (rule 1.1, mirroring `20260904100000_scans_
-- verdict.sql`'s own precedent for the identical class of collision):**
-- WO-280's file plan names this file `<timestamp>_scans_current.sql` with
-- the timestamp unfilled. `20260904110000` was chosen to sort after every
-- migration on disk at implementation time — the six `0000000000000n_*`
-- baseline-and-leaf files, `20260903080000_fetches.sql` (WO-276) and
-- `20260904100000_scans_verdict.sql` (WO-277) — so this file always applies
-- last regardless of merge order. No functional dependency on either: this
-- migration touches only `scans` columns neither of those files added.

alter table scans
  add column is_current boolean not null default false,
  add column supersedes_scan_id uuid null references scans (id),
  add column correction_state text not null default 'none',
  add column stopped_reason text not null default 'complete'
    check (stopped_reason in ('complete', 'time_ceiling', 'spend_ceiling', 'failed'));

-- The promise this migration exists for: at most one `is_current` row per
-- domain, enforced by Postgres, not by a read-side "latest scan wins"
-- query (BP-012 decision 1's own `## Alternatives considered` rejects
-- exactly that — "a failed re-scan then becomes the report").
create unique index idx_scans_one_current_per_domain
  on scans (domain)
  where is_current;
