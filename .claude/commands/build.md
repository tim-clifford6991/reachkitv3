---
description: Build one GitHub issue end to end — branch, code + tests, checks, PR — then stop for the owner's review
argument-hint: <issue number>
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

Build issue #$ARGUMENTS. Follow this exactly; do not skip a step or add scope.

1. `gh issue view $ARGUMENTS` — read the whole issue. If it has no `## Done when` checklist or no milestone, stop and say so; the issue is not ready.
2. Read the `BUILD.md` section(s) the issue cites, `DECISIONS.md` in full, and the `ARCHITECTURE.md` rows for the paths you will touch. If the issue's `## Design` says a UI mockup is required and none is linked, stop and ask for it.
3. `git checkout main && git pull && git checkout -b feat/$ARGUMENTS-<short-slug>`.
4. Implement the issue and its tests. Add `// BUILD §x.y` at the top of each new module naming the section it implements — `scripts/drift-audit.mjs` reads these. New UI strings go into the copy registry as `TODO(copy)`; never write customer-facing prose yourself.
5. `npm run typecheck && npm run lint && npm test`. Fix until green. Run `node scripts/drift-audit.mjs` and read its report.
6. Tick every `Done when` box you have satisfied: `gh issue edit $ARGUMENTS --body` with the boxes changed to `[x]`. A box you could not satisfy stays unticked, and you say why in the PR.
7. Commit in small conventional commits. Push. `gh pr create --fill` with body: `Closes #$ARGUMENTS`, what changed, how you verified it, and any `TODO(copy)` keys the owner owes.
8. `gh pr checks --watch`. If a check fails, fix and push. Stop when green and report the PR URL. Do not merge.
