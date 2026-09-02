---
description: System · Validate a completed work order against its requirements
---
If the WO's own `ui: yes` field is set (`skills/work-order-writing/SKILL.md`),
dispatch the design-guardian subagent first, for its UI-fit pass
(`agents/design-guardian.md`): placement against the journey map,
navigation, related settings, and adjacent features, left as
`- [ ] REVIEW(placement): …` lines under the WO's own `## Open questions`
— never a design-file edit. A `ui: no` WO skips this step entirely.

Invoke the validator subagent on $ARGUMENTS. Return the criterion-by-
criterion PASS/FAIL table and verdict. On REJECT, list precise defects for
the implementer.

For a `ui: yes` WO, the validator's own report — not this command — then
writes one `Placement:` line, fed by the pass just dispatched:
`Placement: clean` when nothing is left open, or `Placement: reviewed —
<n> open questions` naming the count when something still is
(`agents/validator.md`). The librarian's `done` gate requires this line
to exist on a `ui: yes` WO's latest TST section
(`agents/librarian.md`) — a UI WO cannot close without one — but the line
itself doesn't change the verdict; placement is a recommendation, not a
defect (`skills/design-system/SKILL.md`).
