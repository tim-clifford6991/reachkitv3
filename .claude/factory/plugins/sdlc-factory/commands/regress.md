---
description: System · Run the regression gate a work order needs before done
---
You ask me nothing here — this derives, runs, and records. Invoked by
`/implement`'s close, or directly on a WO whose own validation already
passed.

Refuse unless $ARGUMENTS' latest `## TST-###` section (by id, the same
"-R"/"-R2" sort the blockers panel uses) already carries a passing verdict
(`agents/validator.md`) — regression re-checks what already passed, not
code that hasn't cleared its own criteria yet. Name the missing verdict
and stop; nothing below runs.

Dispatch the validator subagent's regression pass (`agents/validator.md`)
on the WO:

1. Run the full test suite.
2. Run `factory-console impact WO-###` (Task 1's read-only query) — the
   files this WO's commits touched, the blueprints those anchor, their
   direct importers, and the requirements those blueprints `satisfies`.
3. Re-check the acceptance criteria of every requirement the impact set
   names — actually re-verify each one, not just relist it.
4. Append one `Regression:` line to that same latest `## TST-###`
   section — never a new heading — in the grammar
   `skills/work-order-writing/SKILL.md` states: `Regression: <n> files ·
   <REQ-… list | none> re-checked — pass` or `Regression: <n> files ·
   <REQ-… list | none> re-checked — findings: <one line>`.
5. Log it on the WO's own `## Log`: a clean sweep gets
   `- <date> finished — validator — <one line>`; a finding gets
   `- <date> failed — validator — <why> — next: <the step to resume at>`
   instead — `failed` here records the sweep's own outcome in the Log
   vocabulary (finished/failed), not a status transition; `status` stays
   whatever it already was, same as any other validator run.

A `findings:` line does not reopen the verdict this WO already earned.
The librarian's gate (constitution §3) checks that this sweep ran and is
recorded, not that it came back clean — a `findings:` regression is still
a recorded regression. A finding worth acting on becomes its own open
question on the WO, or a `/feedback` item if it's a defect in the built
thing, never a silent edit made here.

Return the impact summary line and the `Regression:` line exactly as
written. This never sets `status: done` — that stays the librarian's
call, made on its own audit after merge (`agents/librarian.md`), and
finding a missing regression record there is exactly what sends a WO back
here.

Work order: $ARGUMENTS
