# Decisions

Append-only. One ruling per line, dated, newest last. A ruling here is not re-opened; if it turns out wrong, a new dated line supersedes it and says so. Reasoning lives in the linked issue/PR, or — for `ADR-` lines — in `archive/sdlc-factory-2026-09-04/corpus/docs/decisions/`.

Format (checked by `scripts/drift-audit.mjs`): `YYYY-MM-DD  ruling — optional source`

2026-08-28  Greenfield build to BUILD.md. The shipped reachkit.app repo is reference, not substrate; copy no file wholesale. — BUILD §1
2026-08-28  Free report AI matrix = the `ai_overview` block inside 12 live organic SERPs (2.4¢). The free path makes zero AI Optimization API calls. — BUILD §6.2
2026-08-28  MVP is US-English only: one `SERP_LOCATION` constant, one written footer line. Locale derivation is v1.1. — BUILD §6.3a
2026-08-28  Draft editing is a Markdown textarea with a live preview pane; no rich-text editor. — BUILD §4.6
2026-08-28  No Stripe Tax at launch. Charge €49 tax-inclusive, collect country + VAT ID so records exist. Accepted compliance debt; revisit before meaningful EU B2C volume. — BUILD §13
2026-08-28  Supply is the cap: never invent an opportunity to fill a day; the calendar is never padded. — BUILD §7, §4.6
2026-08-31  One band-label registry (`BAND_LABELS`) owns all six band words; disjointness asserted once. — ADR-001
2026-08-31  Report pages are `noindex` forever and in no sitemap; v1 report removal is a written request, not an authenticated control. — ADR-002
2026-08-31  One arbiter (`account()`) decides a place's single empty-state line over a closed cause union with fixed precedence; ReachKit's own stop outranks every other cause that is also true. — ADR-011
2026-08-31  The spend ceiling outranks the verdict: a cut-off factor nulls the score; no partial score is ever computed. — ADR-021
2026-08-31  One closed, pinned list of AI reader user-agents (`AI_READER_AGENTS`); blocked-readers count, unblock lines and hosted robots policy all read it. — ADR-022
2026-08-31  Declared answer and measured answer are two facts; a pending change is computed as their difference, never stored as a state. — ADR-030
2026-08-31  One directory per mail kind under `src/lib/mail/templates/<kind>/`. — ADR-040
2026-08-31  A nurture sequence that missed its window is dropped forever; a re-delivery starts nothing; an opted-out address still receives the page it asked for. — ADR-041
2026-08-31  Address-wide suppression and per-kind notification toggles are two mechanisms and never merge. — ADR-042
2026-08-31  Active access is `users.paid_through > now()` alone; `plan_status` is recorded and never read by the gate. — ADR-050
2026-08-31  Deletion is a tombstone plus a 30-day purge; unreachability is enforced by row policy, not by callers. — ADR-051
2026-08-31  The €49 Stripe Price is tax-inclusive with Stripe Tax off; switching tax on must never raise a customer's bill. — ADR-052
2026-08-31  Weekly measurement is triggered hourly and gated on each site's own local Monday; "Mon 06:00 UTC" is not the trigger. — ADR-060
2026-08-31  "Nothing worth publishing" is a proven arm, never the fallback; an unattributed empty day is ReachKit's own stop. — ADR-061
2026-08-31  One automatic regeneration; a draft that has entered review is never regenerated. — ADR-070
2026-08-31  The `publications` row (written before the destination call) plus the destination-side marker are the at-most-once guarantee; neither may be tidied away. — ADR-080
2026-08-31  `AI_CRAWLERS` is folded into `AI_READER_AGENTS`; one name. — ADR-090
2026-08-31  Path ownership is by most-specific declared glob; a feature may own files inside a container it is not a child of when it says so. — ADR-091
2026-09-01  A page has four ways of having no ordinary verdict — verdict / not judgeable / not measured / no week — none may be merged, and all four are terminal. — ADR-071, ADR-072
2026-09-01  A ReachKit post in a customer's WordPress carries two marks: the invisible idempotency marker and a visible findability stamp; neither does the other's job. — ADR-083
2026-09-01  Every CMS publishes live in one call; "created" and "made live by us" are two booleans and never merge back. Unpublish is scoped by liveness and names which of five things happened. — ADR-081, ADR-082, ADR-084
2026-09-01  The post-publish check has three outcomes; "could not be confirmed" asserts nothing, is final, and never merges with "no page found". — ADR-085
2026-09-01  A credential that cannot publish is its own occasion (a `HealthReason`, not a fourth health state) with a distinct line and an action leading to a different account. — ADR-086
2026-09-02  The publishing subsystem's six leaves are one strongly connected component at node level and acyclic at file level; the cycle is broken at file granularity, never by deleting a true dependency. — ADR-092
2026-09-02  Layout law: three named bands (compact / medium / wide); content fits its box or the box changes; text is never shrunk to fit; no type step below the floor is minted. — ADR-093
2026-09-03  One canonical domain key from one parser (`parseDomain` → `CanonicalDomain`) used by every domain-keyed row, URL and counter. — ADR-020
2026-09-03  The free report's AI matrix DOES set `load_async_ai_overview` (counts Google's actual AI answers). BUILD.md §6.2/§6.4 "never set it" is superseded for the first pass. — ADR-094
2026-09-03  Free-scan cap stays 12¢ ("a lead magnet … wasting money on it is a crime"). A market-correction re-run does not buy async AI Overviews; the corrected card counts cached AI answers and its disclosure says so. — OWNER-QUESTIONS item 9
2026-09-03  Free report verdict is the score, its band word and one written line naming the factor holding it down. The three driver mini-bars are removed. — OWNER-QUESTIONS item 4 (supersedes BUILD §4.1 header strip)
2026-09-03  Per-question `{vol}/mo` is removed from the 12-questions list; the search text stays. The market-total volume footnote is removed, both halves. — OWNER-QUESTIONS items 5, 6 (supersedes BUILD §4.1)
2026-09-03  Overview's AI-answers tile shows one reading only: weeks present in the trailing window. The composite score has no tile on Overview. — OWNER-QUESTIONS items 7, 8 (supersedes BUILD §4.5)
2026-09-03  Search Console connection is POSTPONED, not answered: "get users on app and later start reviewing and improving based on feedback." — OWNER-QUESTIONS item 3
2026-09-04  Conformance suites are scoped by path glob over the surface tree, not by call-site lists; they run in CI. — ADR-010
2026-09-04  `GeneratedText` is a nominal brand; `fromStored` is the only construction path. Deleting the brand "looks like tidying" and is forbidden. — ADR-012
2026-09-04  The sdlc-factory process is retired for this project. Corpus and plugin frozen under `archive/sdlc-factory-2026-09-04/`; requirements and work orders become GitHub issues, waves become milestones, validation becomes CI, traceability becomes `Closes #N`. Three owner files carry intent: BUILD.md, DECISIONS.md, ARCHITECTURE.md. Rules that matter are checks, not prose.
2026-09-04  `MarketSet` is a declared type owned by the questions leaf (`src/lib/market/questions/market-set.ts`); the report blob's market section takes the leaf's shape, and coherence is a member of it. — ADR-095
2026-09-05  Layout tokens (`--breakpoint-lg` 1024px, `--breakpoint-xl` 1280px, `--t-floor` 11px) live as `:root` custom properties in `src/ui/layout/layout.css`, imported by the root layout; not in `theme.css` (whose `:root` is BUILD §2.1 verbatim) and not a Tailwind `@theme`. — #65
2026-09-05  The landing's medium and wide arms are one column (`same-as-below`) until REQ-099's demo component lands; that build re-declares them. — #65
2026-09-05  The type floor is 11px — the bottom of BUILD §2.3's 10.5–11px eyebrow range and what `type.css` already draws; no type step below it is minted. — #65 (ADR-093 decision 3)
2026-09-05  Layout containment (check 2) considers only elements that generate a box; hidden placeholders and `<script>` tags are skipped. Clarifies ADR-093. — #65
2026-09-05  A test fixture lives beside its test, never in the archived corpus — `tests/presentation/copy/__fixtures__/RULING-copy-2026-09-04.json`. — #61
2026-09-05  The layout conformance suite gates merges (required status check on main). — #68
2026-09-05  Dev environment: Vercel project `reachkitv3` (team timclifford) on this repo; `main` → https://dev.reachkit.app; every PR gets a preview. `NEXT_PUBLIC_APP_URL=https://dev.reachkit.app`, `KILL_SWITCH=false`, `HOSTED_EDGE_CNAME_TARGET=content.dev.reachkit.app` there; production cutover of reachkit.app stays M4 per the go-live plan.
