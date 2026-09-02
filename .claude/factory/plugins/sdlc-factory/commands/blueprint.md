---
description: System · Expand approved requirements into blueprints
---
> Folds into `/expand-requirement` at 0.12.0 (constitution §4's routing
> map): its step 2 is this same dispatch, and `--approved` is "all approved
> REQs without coverage". Surgical use only until then.

Invoke the architect subagent on the approved requirements ($ARGUMENTS, or
all approved REQs without blueprint coverage if empty). Return blueprint
nodes, ADRs, orphan report, and open questions.
