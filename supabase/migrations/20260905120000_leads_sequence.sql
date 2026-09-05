-- supabase/migrations/20260905120000_leads_sequence.sql
--
-- BUILD §4.2 · REQ-010 · BP-029 `## Data model delta` — the columns and the
-- three indexes that make the follow-up bound a schema fact rather than an
-- application check. The baseline creates `leads` keyed to `scan_id`
-- (`BUILD.md` §10); every column below lands under the `leads` topic token,
-- which `src/lib/db/topics.ts` assigns to BP-029.
--
-- **Read ADR-041 before touching the unique index.**
-- `unique (lower(email), domain) where sequence_state is not null` *is*
-- REQ-010 criterion 13. It is not a performance index and not a
-- belt-and-braces check on top of application logic — it is the
-- enforcement, and the branch it replaces was rejected in so many words:
-- "a check is a race and this is a uniqueness claim, which the database can
-- hold and application code cannot" (BP-029 decision 1). A second `leads`
-- row for a domain an address already has a sequence for carries a **null**
-- `sequence_state` forever. That reads as a lost enqueue and is not one.
-- The `where` clause is load-bearing in the other direction too: a full
-- unique index would forbid the second `leads` row criterion 13 requires to
-- exist.
--
-- **`domain` is added with a default that is then dropped.** `leads` holds
-- no rows — nothing has written it before this feature — but `add column …
-- not null` without a default fails on a table that does have rows, and a
-- migration that only applies to an empty table is a migration that fails
-- in the one environment that matters. The default exists for the length of
-- these two statements and is then removed, so no later insert can omit the
-- domain and get an empty string instead of a rejection.
--
-- **Two columns BP-029's delta does not name, added here with their
-- derivation** (flagged in this PR rather than assumed): `first_page_title`
-- and `first_page_markdown`. BP-029's NFR budget requires "One
-- `generateDraft()` call per lead, ever … a retry re-sends what was
-- written; it never re-writes it", and its `first_page_state` has a
-- `written` value distinct from `sent`. A page that is written but not yet
-- sent has to live somewhere, and it cannot live in `drafts`: that table's
-- `opportunity_id` and `site_id` are both `not null` and a free-report lead
-- has neither. So the written page is stored against the lead it was
-- written for, in the topic BP-029 owns.
--
-- RLS stays default-deny: `leads` gained its one policy in
-- `00000000000002_rls.sql` (select, for the owning site's user) and this
-- migration adds none. Every entry point in `src/lib/mail/leads/**` runs
-- server-side through `dbAdmin()`; a visitor holds no session and reaches
-- `leads` through no policy at all.

alter table leads
  add column domain text not null default '',
  add column sequence_state text
    check (sequence_state in ('waiting', 'running', 'finished', 'dropped', 'stopped')),
  add column sequence_started_at timestamptz,
  add column next_touch_at timestamptz,
  add column touch_count integer not null default 0,
  add column dropped_at timestamptz,
  add column page_delivered_at timestamptz,
  add column first_page_state text not null default 'pending'
    check (first_page_state in ('pending', 'written', 'sent', 'notice_sent', 'abandoned')),
  add column first_page_first_attempt_at timestamptz,
  add column first_page_attempts integer not null default 0,
  add column first_page_failure text,
  add column first_page_title text,
  add column first_page_markdown text;

alter table leads alter column domain drop default;

-- REQ-010 criterion 13, and nothing else. See the header before changing it.
create unique index idx_leads_one_sequence_per_address_domain
  on leads (lower(email), domain)
  where sequence_state is not null;

-- The nurture job's due-work query: every `running` row whose next touch has
-- come round (`advanceSequences` step 3).
create index idx_leads_due_touches on leads (sequence_state, next_touch_at);

-- Release ordering (REQ-010 criterion 12, "sequences to one address run in
-- the order their pages were delivered"). The order is a query over this
-- index, never a sort held in the job's memory.
create index idx_leads_release_order on leads (lower(email), page_delivered_at);
