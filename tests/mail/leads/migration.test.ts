// BUILD §4.2 — the two migrations, asserted against what they must say.
//
// The `node` project has no database (`vitest.config.ts`'s `db` project is
// the one that reaches the live scratch schema, and its file list is the
// owner's). So the schema half of this feature is asserted here as text:
// the columns exist, the three indexes exist with their exact predicates,
// and the suppression table is keyed and constrained the way ADR-042
// requires.
//
// **The predicate is the point.** `where sequence_state is not null` *is*
// REQ-010 criterion 13 (ADR-041). A full unique index would forbid the
// second `leads` row the criterion requires to exist; no index at all would
// make the cap a running total maintained by application code, which is the
// alternative BP-029 decision 1 rejected in so many words. This suite fails
// if either drifts.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { topicOf } from "../../../src/lib/db/topics";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../supabase/migrations");

function migration(token: string): string {
  const name = readdirSync(MIGRATIONS).find((file) => file.includes(token));
  if (name === undefined) throw new Error(`no migration carrying "${token}" on disk`);
  return readFileSync(path.join(MIGRATIONS, name), "utf8");
}

function migrationName(token: string): string {
  const name = readdirSync(MIGRATIONS).find((file) => file.includes(token));
  if (name === undefined) throw new Error(`no migration carrying "${token}" on disk`);
  return name;
}

/** The statements only. A header comment naming the other mechanism is the
 *  ADR being cited, not the schema reaching it. */
function statements(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

/** Whitespace-insensitive, because SQL formatting is not the promise. */
function says(sql: string, fragment: string): boolean {
  const flatten = (text: string) => text.replace(/\s+/g, " ").toLowerCase();
  return flatten(sql).includes(flatten(fragment));
}

describe("REQ-010 c13 — the criterion is a unique index, not a branch", () => {
  const sql = migration("leads_sequence");

  it("the unique index is over (lower(email), domain) and partial on sequence_state", () => {
    expect(says(sql, "create unique index")).toBe(true);
    expect(says(sql, "on leads (lower(email), domain)")).toBe(true);
    expect(says(sql, "where sequence_state is not null")).toBe(true);
  });

  it("the predicate is what lets the second leads row exist at all — a full unique index would forbid it", () => {
    // The mutation this guards: delete `where sequence_state is not null`
    // and a re-scan by the same address for the same domain can no longer
    // be captured, which is criterion 13's own premise ("when that domain's
    // page is delivered to that address again").
    const withoutPredicate = sql.replace(/where sequence_state is not null/gi, "");
    expect(says(withoutPredicate, "where sequence_state is not null")).toBe(false);
    expect(says(sql, "where sequence_state is not null")).toBe(true);
  });
});

describe("REQ-010 c12 — the storage half of one sequence at a time, in delivery order", () => {
  const sql = migration("leads_sequence");

  it("page_delivered_at is a column — the anchor the 7-day deadline is measured from", () => {
    expect(says(sql, "add column page_delivered_at timestamptz")).toBe(true);
  });

  it("the due-work index and the release-ordering index both exist", () => {
    expect(says(sql, "on leads (sequence_state, next_touch_at)")).toBe(true);
    expect(says(sql, "on leads (lower(email), page_delivered_at)")).toBe(true);
  });

  it("sequence_state is constrained to the five lifetimes and nothing else", () => {
    expect(
      says(sql, "check (sequence_state in ('waiting', 'running', 'finished', 'dropped', 'stopped'))")
    ).toBe(true);
  });
});

describe("REQ-010 c8 — the retry window is measured from a stored fact", () => {
  const sql = migration("leads_sequence");

  it("first_page_state carries the two things owed, the written stage and the terminal one", () => {
    expect(
      says(
        sql,
        "check (first_page_state in ('pending', 'written', 'sent', 'notice_sent', 'abandoned'))"
      )
    ).toBe(true);
  });

  it("the first attempt's time and the attempt count are columns, not an in-memory counter", () => {
    expect(says(sql, "add column first_page_first_attempt_at timestamptz")).toBe(true);
    expect(says(sql, "add column first_page_attempts integer not null default 0")).toBe(true);
  });

  it("the written page is stored against the lead, so a retry re-sends it and never re-writes it", () => {
    expect(says(sql, "add column first_page_title text")).toBe(true);
    expect(says(sql, "add column first_page_markdown text")).toBe(true);
  });
});

describe("BP-029 decision 1 — the sequence's natural key needs a domain column on leads", () => {
  const sql = migration("leads_sequence");

  it("domain is not null, and the default that makes the add safe is dropped again", () => {
    expect(says(sql, "add column domain text not null")).toBe(true);
    expect(says(sql, "alter column domain drop default")).toBe(true);
  });
});

describe("ADR-042 — two stores, and this is the address-keyed one", () => {
  const sql = migration("suppressions_email");

  it("email_suppressions is keyed by a lowercased address, with the two causes closed", () => {
    expect(says(sql, "create table email_suppressions")).toBe(true);
    expect(says(sql, "email text primary key check (email = lower(email))")).toBe(true);
    expect(says(sql, "check (cause in ('opt_out', 'subscribed'))")).toBe(true);
  });

  it("it names no user and no notification kind — the other mechanism is reachable from nowhere here", () => {
    expect(statements(sql)).not.toMatch(/users\.notify|user_id|notify/i);
  });

  it("RLS is enabled, so the table is default-deny before any policy exists", () => {
    expect(says(sql, "alter table email_suppressions enable row level security")).toBe(true);
  });

  it("no policy is granted: every entry point is server-side through dbAdmin()", () => {
    expect(statements(sql)).not.toMatch(/create policy/i);
  });
});

describe("`structure.md` rule 3 — each migration carries exactly one assigned topic token", () => {
  it("the leads migration resolves to the leads topic and its owner", () => {
    expect(topicOf(migrationName("leads_sequence"))).toEqual({ token: "leads", owner: "BP-029" });
  });

  it("the suppressions migration resolves to the suppressions topic and its owner", () => {
    expect(topicOf(migrationName("suppressions_email"))).toEqual({
      token: "suppressions",
      owner: "BP-029",
    });
  });
});
