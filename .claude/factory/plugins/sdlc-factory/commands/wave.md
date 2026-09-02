---
description: Owner · Propose, show, or close the current wave
---
I name one action below — `propose`, `show`, or `close` — plus whatever
that action needs.

## propose

Dispatch the planner subagent to propose the next wave: every work order
`status: approved` carrying no `wave:` (absent means unassigned — never a
placeholder value; a `draft`/`in-review` WO is never a candidate, it
waits for its own approval first), ordered by `depends-on` (a WO never
precedes what it depends on) and capped at 8 (`skills/wave-planning/
SKILL.md`), one goal sentence describing what the wave delivers, and a
MoSCoW priority word after each id (`WO-003 (Must)`). A WO is in at most
one open wave, so a WO already carrying a `wave:` from a still-open row is
never picked — and a `status: superseded` WO is never a candidate either
way, `approved` being the only status this selects from. The planner
returns the proposed row text — it never writes `registry/waves.md`
itself; `registry/` is the librarian's (constitution §4's agent table),
the same reason `/wave show` and `/wave close` below dispatch the
librarian rather than the planner.

Before selecting, the planner applies rule 2.6's merge test to the
candidates the goal draws on and consolidates any group that fails it
(`agents/planner.md`, "Consolidating a set") — per slice, never the
whole backlog (rule 7.4), and as a merge, never a discard: criteria and
file plans carried verbatim, the replaced orders kept as `superseded`.
Its return carries the consolidation mapping beside the row; the row
names the replacement ids, never the superseded ones. Nothing is
consolidated outside the wave's own slice.

Dispatch the librarian subagent with the planner's proposal to write it: a
new `open` row in `registry/waves.md` — the next unused `W<n>`, the goal,
the ordered WO list, `open` — and `wave: W<n>` set in front-matter on
each WO it names, the same declared-field posture as `implements:`.

This lands uncommitted, same as `/expand-requirement`: I accept it by committing, or
edit the row and the WOs it names before I do either.

## show

Dispatch the librarian subagent to report the current wave — the last
`open` row in `registry/waves.md`, or say plainly there is none: its
goal, every WO it names grouped by status, and what's blocked and why,
read from each blocked WO's `blocked-by` edge and the last `failed —`
line in its own `## Log`.

## close

Dispatch the librarian subagent to close the current wave. Every WO the
row names must clear one of three paths — never a silent partial close:

- **`status: done`** — counts on its own; nothing else required.
- **Carried** — named by me, in this invocation, as carried to the next
  wave. Its `wave:` field is cleared back to absent (unassigned — the
  same posture a freshly-cut WO starts in) so the next `propose` can pick
  it up again, reordered or reprioritized as the work now warrants.
- **`status: superseded`** — never done, never carried: it's retired.
  The librarian treats it as accounted for on its own (I don't name it
  either way) and lists it as **retired** in the close summary; its
  `wave:` is left untouched, same as a `done` WO's, and `/wave propose`
  never re-selects it (superseded is never a candidate status).

A `done` WO keeps its `wave:` untouched too — the historical record of
which wave shipped it. Only once every named WO clears one of the three
does the row's own Status become `closed` — nothing else in the corpus
changes.

The librarian's close return also lists every `open` `rests-on` row on
the blueprints, decisions and requirements the wave's work orders
implement. Dispatch the architect subagent over that list: it
dispositions each row on its own read (constitution 2.3b, rule 1.1 —
`confirmed`, `refuted`, or `undischargeable` with the reason, written on
the owning artifact) and returns only the rows whose disposition changes
what is promised. Those, and nothing else from this step, reach me as
one line each in the checkpoint (rule 9.1).

Action: $ARGUMENTS
