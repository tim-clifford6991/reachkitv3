-- supabase/migrations/20260905120100_suppressions_email.sql
--
-- BUILD §4.2 · REQ-010 criterion 11 · BP-029 `## Data model delta` — the
-- address-keyed store of who wants no more follow-up.
--
-- **Read ADR-042 before merging this with `users.notify`.** There are two
-- stores of what a person does not want mailed, they overlap in no row, and
-- unifying them — one concept in one place, the obvious cleanup — takes a
-- paying customer's sign-in link away. This table is keyed by an **email
-- address**, because a lead has no account and this must bind addresses
-- that have not been captured yet; `users.notify` is keyed by a **user**
-- and reaches exactly three recurring mails. Which store a send consults is
-- decided by `MAIL_KINDS[kind].stoppable`, in one place, and nothing in
-- this schema is reachable from the other mechanism's code path.
--
-- A table rather than a column on `leads`, for the reason BP-002 gave it:
-- an opt-out must bind an address that has never been captured, so it
-- cannot hang off a row that may not exist.
--
-- The primary key is the whole of the idempotency (BP-029: "Insert is
-- idempotent on the primary key, so a second opt-out click writes nothing
-- and still confirms"). The address is stored lowercased and the check
-- constraint is what keeps it so — a mixed-case row would be a second,
-- unsuppressed identity for one person.
--
-- RLS default-deny with no policy: `suppressAddress()` and
-- `applyOptOutToken()` are server-side and reach this table through
-- `dbAdmin()`. A stranger holding an opt-out link holds a capability to
-- suppress one address, never a read of who else has.

create table email_suppressions (
  email text primary key check (email = lower(email)),
  cause text not null check (cause in ('opt_out', 'subscribed')),
  at timestamptz not null default now()
);

alter table email_suppressions enable row level security;

-- `service_role` bypasses RLS but still needs the table grant — `BYPASSRLS`
-- skips row policies, not privileges. Matched to the baseline's own grant so
-- this table is reachable exactly as the other nine are, and readable by
-- nobody without one.
grant select, insert, update, delete on email_suppressions
  to anon, authenticated, service_role;
