# Owner questions — SEO-automation research, 2026-09-03

Each line is a question only the owner can answer because the answer
changes what the product promises. Grounds for each are in the evidence
file named; nothing here has been written into a requirement.

1. **Asynchronous AI Overviews — RULED 2026-09-03.** "the free report loads
   asynchronous AI Overviews (`load_async_ai_overview`), the cost stays
   inside the 12¢ cap; the card counts Google's actual AI answers." Recorded
   in `sdlc-factory/docs/decisions/ADR-094.md` (landmine); design consequences
   in `sdlc-factory/docs/blueprints/BP-008.md` decision 3 and
   `sdlc-factory/docs/blueprints/BP-025.md` decision 4. No requirement text
   changes as a result — see the architect's brief to the requirements-analyst.

2. **Weekly movement per question — RULED 2026-09-03.** "The AI-answers card
   and 'is it working' promise presence over a window ... — cited in k of
   the last n weeks — with movement shown only at the aggregate, never per
   question per week." The shape is the owner's; the window (`k`/`n`) is a
   parameter recorded in `sdlc-factory/docs/blueprints/BP-038.md` decision 5
   (`AI_PRESENCE_WINDOW_WEEKS = 4`, pinned in `sdlc-factory/docs/blueprints/BP-005.md`).
   No requirement text changes as a result — see the architect's brief to the
   requirements-analyst.

3. **Google's own AI-visibility report — DEFERRED 2026-09-03, not answered.**
   Since 2026-08-31 Search Console reports, for every site worldwide, which of
   its URLs appeared in AI Overviews and AI Mode (impressions by page,
   country, device, date). Should ReachKit ask customers to connect Search
   Console and show Google's observed figure beside its own sampled one, a new
   customer-side dataset outside `BUILD.md` §6.3's closed list? —
   `registry/evidence/RESEARCH-competitor-visibility-measurement.md` §4.

   **Owner's ruling:** "Search Console connection is POSTPONED — not now,"
   reason given verbatim: "we need to get users on app and later start
   reviewing and improving based on feedback." This item is postponed, not
   answered, and is kept open rather than deleted.

---

# Owner questions — UX simplification audit, 2026-09-03

Five questions from the audit of `BUILD.md` §4 and the approved card idiom
against `00-project.md` standing law 2 ("zero SEO knowledge required to read
any screen; meaning over data: a number that answers no customer question is
not rendered, even if we hold it"). Each is here and not derived because each
removes a number a customer reads — §1's rights table puts that with you.
Grounds are the `REVIEW(...)` line on each artifact named, and the
screen-by-screen reading is `sdlc-factory/docs/design/meaning-over-data.md`.
Nothing has been written into a requirement, a criterion or a preview.

4. **The free report's three driver bars — do they stay?** REQ-004 criterion 2
   shows three named 0–100 factors while REQ-004's own non-goals forbid any
   on-screen explanation of them or any drill-down, so a stranger reads three
   numbers we have decided not to let them understand; the same measurement's
   meaning is already on the page as REQ-009's three problem cards. Simplest
   form that keeps the promise: the score and its band word as the verdict,
   plus one written line naming which factor holds the score down. —
   `requirements/REQ-004.md`, `blueprints/BP-024.md`,
   `design/meaning-over-data.md` §3.2.

5. **Per-question monthly search volume on the free report — does it stay?**
   REQ-006 criterion 9 puts up to twelve `{vol}/mo` figures in front of a
   stranger, and REQ-006's non-goals forbid editing, reordering or removing a
   question — so no decision on that page turns on one. The search text beside
   each question, which criterion 9 also requires, is what makes the market
   checkable. Dropping the figure narrows criterion 9 and edits JN-001 step 5's
   wording. — `requirements/REQ-006.md`, `journeys/JN-001.md`.

6. **The market-total volume footnote — does it stay?** REQ-008 criterion 3's
   `{N}/mo` has no comparator anywhere on the report and no reader action turns
   on it. Its footnote's second half ("you currently appear in {n}") is already
   the customer's own bar restated, which criterion 3's "exactly once" rule
   forbids. Simplest form: neither half. — `requirements/REQ-008.md`,
   `blueprints/BP-026.md` (`PresenceCard.totalMonthlyVolume` is the field it
   travels in).

7. **Overview's AI-answers tile — one reading of AI presence, or two?** The
   tile carries three denominators: a level out of twelve tracked questions,
   `GOAL_VALUES.ai_answers = 6` out of twelve, and `AiPresenceWindow`'s `k` out
   of a four-week window (your ruling, item 2 above). BP-038 decision 5 keeps
   both readings and says outright they "are not to be conflated into one
   number" — which is the tile asking a founder to hold two meanings of "AI
   answers" apart. Which single reading survives, and what goal it carries, is
   yours. — `requirements/REQ-041.md` criteria 4 and 12, `blueprints/BP-038.md`
   decisions 2 and 5, `design/meaning-over-data.md` §3.1.

8. **Does the composite score keep a tile on Overview?** It sits beside
   searches-appeared-in, AI presence and pages published — three measures the
   customer can act on — while REQ-004's non-goals forbid explaining anywhere
   what the score is made of. On the free report one number for a stranger
   earns its place; on Overview the head line already answers "is it working"
   in words and the three concrete tiles answer it in measurements. Removing a
   customer-visible verdict is a change to what the product promises. —
   `requirements/REQ-041.md`, `journeys/JN-005.md` (its "under two minutes"
   success condition is the measure this fails).
