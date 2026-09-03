-- supabase/migrations/00000000000003_users_notify_column.sql
--
-- BP-017 `## Data model delta`: "`users` — as `BUILD.md` §10, plus `notify
-- jsonb`, …". This migration ships exactly that column; every other column
-- named in the same sentence is a leaf order's under its own sub-token
-- (WO-116, WO-129, WO-135, WO-140 — see WO-272's `## Out of scope`).
--
-- BP-059 `## Data model delta`: "`users.notify jsonb` … this node holds its
-- shape and its meaning. The value is a sparse object over `NotifyKind`,
-- default `{}`." — the `check` below enforces "object", never a specific
-- key set: BP-059 alone reads and writes the keys (`NotifyKind`).
--
-- `structure.md` rule 3a: a column added to `users` after the baseline is a
-- migration under the `users` topic token or one of its sub-tokens — never
-- "part of the baseline". This file carries the `users` topic token and no
-- sub-token, because no registered leaf sub-token
-- (`users_provisioning`/`users_subscription`/`users_identity`/
-- `users_erasure`) claims this column; `topicOf()` resolves it to BP-017,
-- the topic's owner (WO-272 `rests-on` row 1).
--
-- ADR-051 point 2: "No foreign key in this schema carries `ON DELETE
-- CASCADE` from `users` or `sites`." This migration adds no foreign key.
alter table users
  add column notify jsonb not null default '{}'::jsonb;

alter table users
  add constraint users_notify_is_object
  check (jsonb_typeof(notify) = 'object');
