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
