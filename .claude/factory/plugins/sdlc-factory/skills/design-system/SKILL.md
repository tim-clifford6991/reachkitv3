---
name: design-system
description: Rules for any UI/UX work - tokens, components, preview-before-code gate. Use whenever a REQ, BP, WO, or code change involves user interface.
---

# Design System Discipline

Order of operations for any UI feature:
0. The WO declares `ui: yes` in its front-matter — exactly that key and
   value (0.8.0; the head-bullet `- UI: yes` is the pre-0.8.0 form and is
   no longer read). This is the field rule 7.3 is matched on; `true`, `n`
   and `touches` are not it, and a WO spelling it any other way is
   outside the gate.
1. BP node specifies the screen in words: data shown, primary action,
   states. A project that accumulates recurring screen shapes may keep its
   own `design/patterns.md`; the skeleton doesn't scaffold one until
   there's something to put in it.
2. Design-guardian (or planner via design-guardian) produces a PREVIEW
   ARTIFACT: single-file HTML or React prototype, mock data, registry
   components only, tokens by name. Saved to
   sdlc-factory/docs/design/previews/WO-XXX.html.
3. User reviews the preview. Changes iterate on the preview, never on
   production code. Sign-off recorded in the WO — and the design-guardian
   flips the preview's registered rows in components.md from `proposed` to
   `approved` in the same pass: a signed preview over a still-`proposed`
   registry is the table lagging its own gate.
4. Only then may the implementer write UI code — matching the approved
   preview. Deviation = validator REJECT.
5. Before the validator's verdict, the design-guardian runs its UI-fit
   pass (`agents/design-guardian.md`): placement against the journey map,
   navigation, related settings, and adjacent features it should connect
   to — written as `- [ ] REVIEW(placement): …` lines under the WO's own
   `## Open questions`, never a design-file edit. This is a
   recommendation, not a preview-gate defect: it never blocks the verdict
   the way a missed token or component does in step 4. The validator
   (`agents/validator.md`), dispatched next by `/validate`
   (`commands/validate.md`), counts what the pass left open and writes
   one `Placement:` line into its own TST report: `Placement: clean` when
   nothing is open, or `Placement: reviewed — <n> open questions` when
   something still is. The librarian's `done` gate requires this line on
   every `ui: yes` WO (`agents/librarian.md`) — a `ui: no` WO carries
   neither the pass nor the line.

## tokens.md readiness gate

`tokens.md` carries `Status: draft` until it is backfilled with real
values. **While it is `draft`, every UI WO is blocked** — there is no law
book yet for the design-guardian to enforce. Fill in the placeholders,
set `Status: <ready>`, then UI WOs may proceed. This is a project-startup
condition, not a standing rule about any particular project's tokens — a
fresh install starts here; don't assume any given corpus is still in it.

Hard rules (validators enforce):
- Tokens by name only; raw hex/px in UI code is a defect.
- Components from components.md only; new ones enter via `proposed` flow.
- No long LLM-generated text anywhere in the UI. Microcopy ≤ 1 sentence.
- Every data view specifies loading, empty, and error states.
- Simplicity: one primary action per screen; cut before you add.
