---
name: work-order-writing
description: How to write execution-ready work orders (WO) with file-level plans. Use when creating or editing anything in sdlc-factory/docs/work-orders/.
---

# Work Order Writing

A WO is a contract an implementer can execute with no further questions.

## Front-matter

```yaml
---
id: WO-XXX
type: work-order
title: "<title>"
status: draft
implements: []
depends-on: []
blocked-by: []
rests-on: []
supersedes: []
---
```

`implements` carries the BP/REQ IDs this WO was cut from — enumerate every
one; never restate them as a body bullet, that's rule 2.4's "one claim, one
home" (the front-matter is the edge, the body is the plan). `depends-on`
and `blocked-by` name other WOs; `blocked-by` with reasoning in this body
is how drift or a scope contradiction halts this WO specifically.

`wave` is not front-matter this skeleton writes: **absent means
unassigned.** A newly cut WO carries no `wave:` key at all — the planner
never sets it (`/expand-requirement` leaves it absent on purpose) — until `/wave
propose` picks it up and adds it, at which point the key appears bearing
the wave id it was proposed into (`wave: W1`), and the same id gains a row
in `registry/waves.md` naming this WO. The two are one fact stated twice;
`wave-off-record` is the check that they still agree. Never hand-write a
`wave:` value that doesn't have a matching row in `registry/waves.md` —
propose the wave instead, or add the WO to an existing open row and set
this field to match it yourself.

## The floor — one slice, never one file

A work order is a slice: one journey step end to end, or one capability
from its interface to its test (constitution rule 2.6). Cutting along a
file, a layer or a directory produces orders that each restate the
blueprint to explain their own edge of it. The merge test: two orders
that cannot state their goal and stop condition without citing each
other are one. Merge them. The ceiling stays — an order is ≤1 day — and
a slice that cannot fit under it is a blueprint that has not finished
deciding, which is the architect's problem, not a reason to shard.

**A merge, never a discard.** Every acceptance criterion the replaced
orders' test plans carried is carried verbatim into the replacement's
test plan (a criterion that maps to no test is a refusal); every file
the replaced orders' file plans named is carried into the replacement's
file plan — one line per file, the union, deduplicated, each line
naming which superseded order it came from; the replaced orders stay
on disk with `status: superseded` and one line naming their replacement
— never deleted; and the replacement's file plan is what the
implementer builds the repository skeleton from, in the order the plan
states. The return carries: old ids → new id, criterion count before
and after (equal), file-plan rows before and after (after ≤ before,
never fewer files), line count before and after. A `rests-on` row
carried from a replaced order keeps claim and disposition verbatim; a row
the merged order mints is the planner's parameter (rule 1.1) and is
written dispositioned — `confirmed`, `refuted`, or `undischargeable` —
never `open` (`minted-open-assumption` reports one that is).

## Body

Must contain — and only contain what rule 2.5 leaves to a work order:
goal (one sentence), file plan (each file to create/modify with what
changes and why — the *what*, one line per file, never the file's
contents), interfaces consumed and exposed (copied
exactly from the blueprint), step order, test plan mapping each acceptance
criterion to a named test, out-of-scope list, rollback note, estimate
(must be ≤1 day — otherwise split), a `## Log` (below), and the meta
fields below.

Rules:
- File paths must exist or be explicitly marked NEW — verify with Glob
  before writing the plan.
- Inherit acceptance criteria verbatim from the REQ; never paraphrase.
- Parallelizable WOs must not share files in their plans.
- Status flow: `draft → in-review → approved → superseded`, plus the
  terminal `done` (constitution §2.2b), set only by the librarian after
  merge.

## Enumerate every ID — ranges are forbidden

    WRONG   implements: [BP-001, "…", BP-096]
    RIGHT   implements: [BP-001, BP-002, BP-004]

An ellipsis (`…` or `...`) anywhere in an edge field is refused by the
registry check and reported as an `ellipsis-range` finding — it is never
expanded. Expanding the example above would fabricate edges nobody
declared, and a fabricated edge is worse than a missing one: the whole
value of the graph is that every link in it was written down on purpose.

If enumerating the IDs produces an unreadably long list, the work order is
too big — split it.

## Log

The last section before the validation report — the checkpoint any agent
resumes from (constitution rule 6.1: "a run that writes no log line did
not happen"). Body text, not front-matter: it carries no edge the
registry projects, only history read in order. Seven line forms, newest
last:

    - <YYYY-MM-DD> created — <agent>
    - <YYYY-MM-DD> started — <agent>
    - <YYYY-MM-DD> finished — <agent> — <one line>
    - <YYYY-MM-DD> failed — <agent> — <why> — next: <the step to resume at>
    - <YYYY-MM-DD> preview — design-guardian — v<n> — <url>
    - <YYYY-MM-DD> opened — migration <version>
    - <YYYY-MM-DD> guard — <agent> wrote <file> outside §4's <zone>/ row — allowed under SDLC_FACTORY_GUARD=log

The seventh is the guard's alone (0.12.0): in an unattended run the write
gate records an out-of-row subagent write here instead of prompting, and
the librarian audits the line on `/sync`. The sixth is migration-only: a `factory upgrade` backfill writes it when it
adds the section to a work order (or the work-order template) that predates
constitution rule 6.1, rather than fabricating a `created` line for a run
that never happened.

The fifth is the only line in this section a checker reads (0.13.0,
constitution rule 7.3). The design-guardian writes one per publication of
this WO's preview sheet — `v<n>` the artifact's version, `<url>` its
page — so the section is the sheet's revision history and the last such
line is the current page. A `ui: yes` work order that reaches `approved`
or `done` with none of them is the `preview-without-url` finding (warn):
it was built against a preview the owner cannot open. The URL lives here
and nowhere else in the work order (rule 2.4) — the `Preview:` display
bullet names the sheet file, not the page.

The planner opens it with one `created` line when it cuts the WO. The
implementer logs `started` on beginning and `finished`/`failed` on
handing off or stopping; the validator logs `finished`/`failed` on its
verdict; the librarian logs `finished` the one time it sets `status:
done` (`agents/librarian.md`). A failed run leaves `status` exactly as it
was — the vocabulary above has no `blocked` — the log line is the
record, not a status transition. A `blocked-by` edge is added only when
another artifact is the actual blocker, never for a run that simply
didn't finish.

## Validation report

Appended by the validator (`agents/validator.md`), never by this WO's own
author — body text, not front-matter, carrying no edge the registry
projects. TST ids are corpus-global — every heading becomes a node in one
id map, so the validator takes the next unused TST-### across the whole
corpus, never restarting at TST-001 per work order. Once this WO reaches
`status: done`, its LATEST `## TST-###`
section — by id sort, the same "-R"/"-R2" convention the blockers panel
uses (`TST-002-R` sorts after `TST-002`; `TST-021-R2` after `TST-021-R`) —
must also carry a line starting `Regression:`, recording what was
re-checked alongside the new work, not just the new work itself:

    Regression: <n> files · <REQ-… list | none> re-checked — pass
    Regression: <n> files · <REQ-… list | none> re-checked — findings: <one line>

A done WO whose latest validation section carries no such line is the
`tst-without-regression` finding (warn) — the line is added via `/regress`,
rule 3 (structure compliance) extended.

## `ui:` (front-matter) and the display bullets (body)

`ui:` lives in front-matter — the one machine-checked meta field: rule
7.3 (the UX preview gate) is evaluated by matching it, the console's UI
gate reads it, and `field-vocabulary` reports any off-vocabulary
spelling. It takes exactly `yes` or `no` — not `true`, not `n`, not
`touches`. 0.8.0 moved it up from the body bullets (the pre-0.8.0
head-bullet form was never parsed under this grammar); a leftover
`- UI:` bullet is the second copy rule 2.4 forbids.

The rest are display bullets for humans, below the front-matter — the
parser reads none of them:

    - Branch: wo/WO-XXX-<slug>
    - Estimate: ≤1 day
    - Preview: sdlc-factory/docs/design/previews/WO-XXX.html
    - Signed-off: <date> — v<n>

`ui: yes` obliges the preview pair: a `Preview:` path — the sheet file,
which is the record — and a `Signed-off:` date naming the version the
owner's word was given on. Keep both only when `ui: yes`; delete both
otherwise. `Signed-off:` is written by the librarian alone, reading the
owner's word back off the published page (`agents/librarian.md`, rule
7.3); the planner leaves the bullet as the template has it and never
dates it in advance.
