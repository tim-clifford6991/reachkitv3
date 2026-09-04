---
description: Merge an approved PR into main and clean up — the owner's one-click close of the loop
argument-hint: <pr number>
allowed-tools: Bash
---

Ship PR #$ARGUMENTS.

1. `gh pr view $ARGUMENTS --json state,reviewDecision,mergeable,statusCheckRollup,body` — the PR must be open, mergeable, every check green, and the body must contain `Closes #N`. If any is false, stop and report which.
2. `gh pr merge $ARGUMENTS --squash --delete-branch`.
3. `gh issue view <N> --json milestone` on the closed issue; if its milestone now has zero open issues, say so — the owner closes milestones.
4. Report: PR merged, issue closed, branch deleted, and the deploy URL from the `Vercel` check if present.
