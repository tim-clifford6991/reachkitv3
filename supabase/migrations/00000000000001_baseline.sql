-- supabase/migrations/00000000000001_baseline.sql
--
-- BP-002 `## Data model delta`: the baseline is eight of `BUILD.md` §10's
-- nine tables — `fetches` is excluded (WO-267 `rests-on` row 1: `fetches`
-- carries the `fetches` topic token, `structure.md` rule 3 assigns it to
-- BP-007, and BP-007's own migration creates it — WO-021).
--
-- `BUILD.md` §10, quoted (key columns only — every further column lands
-- under its own topic token, written by the node that specified it; BP-002
-- `## Data model delta`'s index names each and its owner):
--   users         | id, email, plan_status(active/past_due/canceled),
--                   stripe_customer_id, created_at
--   sites         | id, user_id, domain, category, competitors jsonb[<=5],
--                   mode(autopilot/copilot), veto_hours, publish_time,
--                   voice_text, do_not_claim jsonb, created_at
--   scans         | id, site_id(null for free), domain, tier(free/deep/weekly),
--                   status(running/done/degraded), score, drivers jsonb,
--                   report jsonb(versioned blob), cost_cents, created_at
--   opportunities | id, site_id, scan_id, type, family, target_query, volume,
--                   evidence jsonb, proposed_slug, title, effort, fit_band,
--                   acceptance jsonb, status(open/queued/done/dismissed),
--                   created_at
--   drafts        | id, opportunity_id, site_id, state(BUILD.md §9 enum),
--                   title, body_md, meta jsonb, grounded_fact jsonb,
--                   cost_cents, scheduled_for date, veto_deadline, created_at
--   publications  | id, draft_id, site_id, destination, live_url,
--                   published_at, mode(approved/autopilot),
--                   verify jsonb(reachable/indexable/sitemap/ai_readable/
--                   checked_at), unpublished_at — **no `verdict` column**
--                   (BP-002 `## Data model delta`: a page's standing is a
--                   row per page per week in BP-051's `page_verdicts`)
--   destinations  | id, site_id, kind(hosted/wordpress),
--                   config jsonb(encrypted creds), health(ok/expired/error),
--                   created_at
--   leads         | id, scan_id, email(lowercased), consented_at,
--                   converted_at, draft_sent_at
--
-- ADR-051 point 2: "No foreign key in this schema carries `ON DELETE
-- CASCADE` from `users` or `sites`" — every foreign key below whose
-- referenced table is `users` or `sites` uses the default `NO ACTION`.
--
-- RLS is enabled on every table here with **no policy**: BP-002 `## Error &
-- edge behavior`, "a table with no policy is unreadable by anyone holding
-- an anon or authenticated key" — default-deny from the moment each table
-- exists, before `00000000000002_rls.sql` adds any access at all. Table
-- privileges are granted to `anon`, `authenticated` and `service_role` here
-- (RLS, not the grant, is the gate real Supabase projects rely on — a
-- table with a grant and no policy is still unreadable, which this
-- migration's own baseline test asserts; `service_role`'s `BYPASSRLS`
-- attribute needs the grant too, since it only skips policies, not
-- privileges).

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  plan_status text not null check (plan_status in ('active', 'past_due', 'canceled')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);
alter table users enable row level security;

create table sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  domain text not null,
  category text,
  competitors jsonb not null default '[]'::jsonb,
  mode text not null default 'autopilot' check (mode in ('autopilot', 'copilot')),
  veto_hours integer not null default 24,
  publish_time time not null default '09:00',
  voice_text text,
  do_not_claim jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint sites_competitors_max_5 check (jsonb_array_length(competitors) <= 5)
);
alter table sites enable row level security;
create index idx_sites_user_id on sites (user_id);

create table scans (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references sites (id),
  domain text not null,
  tier text not null check (tier in ('free', 'deep', 'weekly')),
  status text not null check (status in ('running', 'done', 'degraded')),
  score integer,
  drivers jsonb,
  report jsonb,
  cost_cents integer not null default 0,
  created_at timestamptz not null default now()
);
alter table scans enable row level security;
create index idx_scans_site_id on scans (site_id);
-- Supports the report read `/scan/{domain}` (BP-002 `## NFR budget`: "the
-- report read is one primary-key or one partial-index lookup" — the
-- partial-unique index that picks the *current* scan for a domain is
-- `scans.is_current` (REQ-001 c17, BP-012's own migration); this baseline
-- index is the lookup path that index will narrow, not a duplicate of it.
create index idx_scans_domain on scans (domain);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id),
  scan_id uuid not null references scans (id),
  type text not null,
  family text not null,
  target_query text not null,
  volume integer,
  evidence jsonb,
  proposed_slug text not null,
  title text not null,
  effort text,
  fit_band text,
  acceptance jsonb,
  status text not null default 'open' check (status in ('open', 'queued', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table opportunities enable row level security;
create index idx_opportunities_site_id on opportunities (site_id);
create index idx_opportunities_scan_id on opportunities (scan_id);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id),
  site_id uuid not null references sites (id),
  state text not null,
  title text not null,
  body_md text,
  meta jsonb,
  grounded_fact jsonb,
  cost_cents integer not null default 0,
  scheduled_for date,
  veto_deadline timestamptz,
  created_at timestamptz not null default now()
);
alter table drafts enable row level security;
create index idx_drafts_opportunity_id on drafts (opportunity_id);
create index idx_drafts_site_id on drafts (site_id);

-- No `verdict` column — BP-002 `## Data model delta` (quoted above).
create table publications (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts (id),
  site_id uuid not null references sites (id),
  destination text not null,
  live_url text,
  published_at timestamptz,
  mode text not null check (mode in ('approved', 'autopilot')),
  verify jsonb,
  unpublished_at timestamptz
);
alter table publications enable row level security;
create index idx_publications_draft_id on publications (draft_id);
create index idx_publications_site_id on publications (site_id);

create table destinations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id),
  kind text not null check (kind in ('hosted', 'wordpress')),
  config jsonb,
  health text not null default 'ok' check (health in ('ok', 'expired', 'error')),
  created_at timestamptz not null default now()
);
alter table destinations enable row level security;
create index idx_destinations_site_id on destinations (site_id);

create table leads (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans (id),
  email text not null,
  consented_at timestamptz,
  converted_at timestamptz,
  draft_sent_at timestamptz
);
alter table leads enable row level security;
create index idx_leads_scan_id on leads (scan_id);

-- `service_role` bypasses RLS (`BYPASSRLS`, granted at the substrate level)
-- but still needs the underlying object privilege — `BYPASSRLS` skips row
-- policies, not table grants. This is `dbAdmin()`'s only access path
-- (BP-002 `## Error & edge behavior`: "`dbAdmin()` bypasses RLS by design
-- and is the narrow, named exception BP-063's deletion mail and the purge
-- reach through").
grant select, insert, update, delete on
  users, sites, scans, opportunities, drafts, publications, destinations, leads
  to anon, authenticated, service_role;
