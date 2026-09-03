-- supabase/migrations/00000000000002_rls.sql
--
-- ADR-051 point 3: "Unreachability is enforced in BP-002's RLS policies, not
-- in application code: every request-scoped policy that already restricts a
-- row to its owning user gains the condition that the owning user's
-- `deleted_at` is null." BP-002 `## Error & edge behavior`: "A policy that
-- lacks the `deleted_at is null` condition is a CI failure ... the
-- guarantee has one point of failure and the test fails when the condition
-- is removed from any policy."
--
-- `users.deleted_at` is added here, as this migration's own precondition
-- (WO-267 `rests-on` row 3, disposition left `open` for the validator):
-- the baseline gains no column, and BP-063's `*_users_erasure_*.sql` owns
-- every rule about *setting* it (ADR-051 point 1) — this migration only
-- adds the column and the policies that read it.
alter table users add column deleted_at timestamptz;

-- One policy set per table the baseline created. No policy anywhere in this
-- file names the `anon` role for `scans` — BP-002 `## Error & edge
-- behavior`: "The public report is served by `dbAdmin()` from the server,
-- never by an anon read of `scans`."

-- users: the owner reads and edits their own row. Provisioning (BP-032,
-- insert) and erasure (BP-063 — a stamp, never a `DELETE`, ADR-051 point 1)
-- are `dbAdmin()`-only system operations; no insert or delete policy here.
create policy users_select_own on users for select to authenticated
  using (id = auth.uid() and deleted_at is null);

create policy users_update_own on users for update to authenticated
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid() and deleted_at is null);

-- sites: the owner reads and edits their own site's settings (mode,
-- competitors, veto window, ... — `BUILD.md` §4.7). Creation
-- (provisioning) and removal (tombstone, never a row `DELETE`) are
-- `dbAdmin()`-only.
create policy sites_select_own on sites for select to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from users u where u.id = sites.user_id and u.deleted_at is null)
  );

create policy sites_update_own on sites for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from users u where u.id = sites.user_id and u.deleted_at is null)
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from users u where u.id = sites.user_id and u.deleted_at is null)
  );

-- scans: read-only for the owning site's user. A free scan (`site_id is
-- null`) has no owning user and is unreadable through `db()` either way.
-- No `anon` policy at all (see above); scans are written by the job runner
-- through `dbAdmin()`.
create policy scans_select_own on scans for select to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

-- opportunities: read-only for the owning site's user; derived and written
-- by the opportunity engine through `dbAdmin()`.
create policy opportunities_select_own on opportunities for select to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

-- drafts: the owner reads and edits their own drafts — approve, edit, veto
-- (`BUILD.md` §4.6). Creation and removal are system operations.
create policy drafts_select_own on drafts for select to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

create policy drafts_update_own on drafts for update to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  )
  with check (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

-- publications: read-only for the owning site's user (view live pages);
-- written by the publishing state machine through `dbAdmin()`.
create policy publications_select_own on publications for select to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

-- destinations: the owner manages their own destinations end to end
-- (Settings — add, reconnect, remove — `BUILD.md` §4.7).
create policy destinations_select_own on destinations for select to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

create policy destinations_insert_own on destinations for insert to authenticated
  with check (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

create policy destinations_update_own on destinations for update to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  )
  with check (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

create policy destinations_delete_own on destinations for delete to authenticated
  using (
    site_id in (
      select s.id from sites s
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );

-- leads: read-only for the owning site's user, once a free-report lead is
-- attached to a site. A lead on a still-anonymous free scan (`site_id is
-- null` through `scans`) has no owning user and is unreadable through
-- `db()` — captured and read by the nurture job through `dbAdmin()` only.
create policy leads_select_own on leads for select to authenticated
  using (
    scan_id in (
      select sc.id from scans sc
      join sites s on s.id = sc.site_id
      join users u on u.id = s.user_id
      where u.id = auth.uid() and u.deleted_at is null
    )
  );
