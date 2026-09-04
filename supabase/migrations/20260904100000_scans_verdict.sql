-- supabase/migrations/20260904100000_scans_verdict.sql
--
-- BP-024 `## Data model delta` (verbatim): the check constraint that ties
-- `scans.score` to `scans.report`'s `verdict.scoreAndBand` kind so the two
-- cannot disagree. Adds no column — `report`, `score` and `drivers` are
-- already `00000000000001_baseline.sql`'s (BP-002); without this
-- constraint the scalar column is a second copy of the verdict (rule 2.4),
-- and a second copy is how a `null` meaning "we could not measure" becomes
-- a `null` meaning "nobody wrote it yet" (BP-024 decision 4).
--
-- `structure.md` rule 3a: this file carries the `scans_verdict` sub-token
-- (BP-024's leaf under BP-012's `scans` topic, already registered in
-- `src/lib/db/topics.ts`'s `MIGRATION_SUBTOKENS`) and nothing else.
--
-- **Timestamp provenance (rule 1.1, mirroring WO-021's own precedent for
-- the identical class of collision):** WO-277's file plan names this file
-- `<timestamp>_scans_verdict.sql` with the timestamp unfilled. WO-276
-- (implemented in parallel, disjoint directories, rule 4.1) writes
-- `20260903080000_fetches.sql`. `20260904100000` was chosen to sort after
-- every migration on disk at implementation time (the six
-- `0000000000000n_*` baseline-and-leaf files) and after WO-276's
-- `20260903080000`, so this file always applies last regardless of merge
-- order between the two branches. No functional dependency on
-- `fetches` — this migration touches only `scans`, already present in the
-- baseline — so merge order between WO-276 and WO-277 does not matter
-- beyond both timestamps sorting after the baseline set.

alter table scans add constraint scans_verdict_score_consistency
  check ((report->'verdict'->'scoreAndBand'->>'kind' = 'unmeasured') = (score is null));
