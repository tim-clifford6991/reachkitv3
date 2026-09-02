---
description: System · Execute one approved work order, end to end
---
Enforce the stage gate before dispatching anything: refuse unless the WO
is `status: approved` — the same gate `agents/implementer.md` rule 1
states; the planner self-certified it (rule 3.2), the librarian's audit
comes afterwards or not at all, and this check stands on its own either
way — and carries no open `blocked-by` edge
touching it — §10's own definition of done requires none remain (rule
2.3 is what defines a `blocked-by` edge in the first place).

One more precondition: the WO, and the blueprints it implements, must be
committed on the main branch. An expand or workorder pass lands
uncommitted and the owner accepts by committing — a WO absent from HEAD
is an acceptance that has not happened yet. Refuse and say so, rather
than cutting a worktree that cannot see its own work order. *On the
first live run two worktrees had to carry their WO docs in by hand;
this clause is the cure.*

Pack the context so the run starts with everything it needs and nothing
left to reconstruct mid-flight: the WO itself; the blueprint(s) it
`implements` and the requirement(s) each one `satisfies`; any ADR those
blueprints cite; the blueprints' `code:` anchors (rule 5.6); the journey
step(s), if any, whose `exercises` names one of those requirements; and a
preview of the blast radius — `factory-console impact WO-###` (Task 1's
read-only query) — run once before a line changes, so the file plan can
be checked against a computed answer, not a guess.

Create an isolated worktree — this command's own rule, not
implementer.md's — on the WO's own branch, `wo/WO-###-slug` (the branch
name is `agents/implementer.md` rule 2; `git worktree add` is how this
command isolates it), and invoke the implementer subagent inside it. A
run that stops partway — rule 4 of that agent, or any other reason —
leaves no stray edit on whatever branch happened to be checked out
elsewhere; the worktree is disposable, the branch is not. Every `## Log`
line implementer.md already specifies (`started`/`finished`/`failed`) is
written from inside that worktree, into the WO's own file, same
convention.

On a clean finish, the implementer subagent commits inside the worktree
— the convention `agents/implementer.md` states under Style
(`type(WO-###): what moved and why`, one work order per commit, never a
range) — and this ends. Report the commit(s), the implementer's
per-file summary and test results, and the worktree path. Verification
is not this verb's: `/factory` — this verb's one caller (constitution
§4's routing map) — invokes `/validate` and then `/regress` on the
return, and the librarian's `done` audit after merge. Run surgically,
`/implement` builds and stops; it never verifies its own work.

Work order: $ARGUMENTS
