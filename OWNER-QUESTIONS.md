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

# Owner questions — optimisation and efficiency audit, 2026-09-03

One question. The rest of the audit's findings are parameters, budgets and
price-book rows — the system's under rule 1.1 — and are filed as `REVIEW(...)`
lines on BP-005, BP-007, BP-008, BP-009, BP-023, BP-028, BP-050 and ADR-094.
The arithmetic behind this one is
`sdlc-factory/docs/registry/evidence/RESEARCH-cost-envelope.md` §1.

9. **Does a corrected free report still count Google's actual AI answers?**
   Your 2026-09-03 ruling (item 1) was scoped, in your own words, to "the free
   report": it loads asynchronous AI Overviews, and the card counts Google's
   actual AI answers. A **correction** re-runs that report against a corrected
   category, so its twelve queries are new and none can come from cache. The
   two together exceed the 12¢ cap: the scan is 9.0¢ worst case and the
   correction 6.9¢, and REQ-094 criterion 3 puts both inside one ceiling
   ("spends no further scan allowance and opens no second spend ceiling") —
   **15.9¢ against 12¢**. Even with no surcharge charged at all the pair is
   11.1¢ against 12¢, so the correction is tight either way. Nothing overspends
   — BP-007 degrades at the cap — but the correction then stops mid-flight and
   REQ-094 criterion 7's "the correction did not complete" becomes the ordinary
   result for exactly the reports whose market was read wrongly. Three levers,
   and the choice between them is yours because each changes something a
   customer reads:

   - **Pay for it** — raise `CAPS.FREE_C` from 12¢ to ~18¢. The report keeps
     its promise on both passes; the charter's stated free-report envelope
     moves, and worst-case daily exposure at 200 free scans/day goes from
     ~$13/day (`DATA-COSTS.md` §2) to ~$19.
   - **Don't pay on the second pass** — the correction's twelve SERPs set the
     flag `false`. The corrected card then counts only the AI answers Google
     had cached, which is exactly the disclosure you declined for the first
     pass, now applying to the report a reader asked us to fix.
   - **Let it degrade** — no change; the correction stops at the cap and says
     so. Cheapest, and the one that most often fails the reader who noticed we
     had their market wrong.

   No requirement text changes under any of the three;
   `sdlc-factory/docs/decisions/ADR-094.md` and `blueprints/BP-028.md` carry
   the finding, and `CAPS.FREE_C` is a BP-005 pin.
