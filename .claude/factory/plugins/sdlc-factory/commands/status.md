---
description: System · Pipeline status report
---
> Folds into `/factory`'s checkpoint at 0.12.0 (constitution §4's routing
> map): its content is `factory-console next` plus the coverage line the
> checkpoint already prints. Surgical use only until then.

First run `factory-console next` from the project root (same binary
resolution as `commands/console.md`) and open the report with its headline
verbatim — the mechanically derived next action, with the counts behind it.
Then invoke the librarian subagent for the full status report: artifact counts by
stage and status, open questions awaiting my answer, open `blocked-by`
edges and open/undischargeable `rests-on` assumptions (read from
`registry/generated/blocked.md` and `registry/generated/assumptions.md`,
each with its own coverage statement per rule 5.5), and blocked items with
reasons. End with the single most valuable next action.
