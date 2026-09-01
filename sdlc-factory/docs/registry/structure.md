# Structure Map — canonical repo layout

> Owned by the architect. This is the ONLY authority on where code lives.
> Implementers and planners place files per this map; the librarian flags any
> file on main that has no home here. New top-level directories require an ADR.
>
> A module may hold several BP nodes; a BP node lives in exactly one module.

Greenfield Next.js (App Router) + TypeScript, per `00-project.md` ("Repo shape
and entry points") and `BUILD.md` §1 ("Repo shape: standard Next.js. `src/lib/`
holds the engine (measure, score, opportunities, generate, publish, costs),
`src/app/` the surfaces, `src/lib/config/constants.ts` **every** pinned number
in this document, `tests/pins.test.ts` asserting them"). Nothing below invents
a path the charter or `BUILD.md` does not already imply; the sub-module names
inside `src/lib/` are architect-chosen (rule 1.1) and derived in each owning
node's `## Decisions`.

## Top level

| Module / path | Responsibility (one sentence) | Owning BP nodes | Public entry points |
|---|---|---|---|
| `src/app/(public)/**` · `src/app/(account)/**` · `src/app/api/**` · `src/app/layout.tsx` · `src/middleware.ts` | The Next.js application container — every surface a person reaches on a ReachKit address, and the thin HTTP adapters that delegate to the engine. | BP-001; leaves BP-022, BP-027, BP-033, BP-037, BP-038, BP-039, BP-044, BP-055; BP-036 owns two files here under ADR-091 point 3 | `/` · `/scan/{domain}` · `/pricing` · `/setup` · `/app` (Overview · Calendar · Settings) · `/app/draft/{id}` · `src/app/api/**` route handlers |
| `next.config.ts` · `package.json` · `tsconfig.json` · `eslint.config.mjs` · `vitest.config.ts` · `postcss.config.mjs` · `.env.example` · `tests/setup.ts` | The repo's root configuration — the toolchain the deployable Next.js unit is built, typed, linted and tested by, and the one place a cross-module lint invariant can be enforced. | BP-001 (decision 2) | `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` |
| `supabase/**` · `src/lib/db/**` | The Supabase container — schema, migrations, RLS default-deny policies, and the only two clients any code may hold. | BP-002 (baseline · RLS · domainblocks); every other migration file is owned by the node whose topic or sub-token it carries | `db()` (request-scoped, RLS) · `dbAdmin()` (server-only) · `supabase/migrations/**` |
| `src/jobs/**` | The job-runner container — `BUILD.md` §11's six scheduled/evented jobs plus `account/maintenance`, and the kill switch that stops the first three. | BP-003 | `scan/run` · `draft/generate` · `publish/execute` · `publish/verify` · `weekly/refresh` (hourly tick, site-local due-ness — ADR-060) · `lead/nurture` · `account/maintenance` |
| `src/app/(hosted)/**` | The hosted-content edge container — Host-keyed static rendering of published pages on customer domains, and the robots/sitemap/410 policy we serve there. | BP-004; leaf BP-047 | `GET /*` keyed by `Host: content.{customer-domain}` · `/robots.txt` · `/sitemap.xml` |
| `src/lib/config/**` · `tests/pins.test.ts` | Every pinned number and every environment binding, defined once and asserted once. | BP-005 | `constants.ts` · `env.ts` · `tests/pins.test.ts` |
| `src/lib/egress/**` | The one way any byte leaves this process toward a URL a customer or a dataset supplied — SSRF-guarded, DNS-pinned, size-capped, robots-respecting. | BP-006 | `safeFetch()` · `resolvesInDns()` · `readRobots()` |
| `src/lib/costs/**` | The cost seam — every vendor and model call is ledgered, cached and cap-checked in one place; `fetches` is ledger, cache and raw store in one. | BP-007 | `withCostContext()` · `recordFetch()` · `capHit()` · `readCache()` |
| `src/lib/vendors/**` | The closed list of DataForSEO endpoints the product is allowed to call, and nothing else. | BP-008 | `rankedKeywords()` · `keywordSuggestions()` · `competitorsDomain()` · `serpOrganic()` · `aiMode()` · `llmScraper()` |
| `src/lib/llm/**` | The one `llm()` seam — nano and Haiku, per-call cost logging, and the closed list of call sites. | BP-009 | `llm()` · `LLM_CALL_SITES` |
| `src/lib/measure/**` | The measurement engine — deterministic parse of fetched HTML into four measured quantities, the three shown score factors, band, and the measured / measured-zero / unmeasured trichotomy at the point of storage. | BP-010; leaf BP-024 | `measureDomain()` · `factorsOf()` · `computeScore()` · `readMeasuredText()` · `Measured<T>` |
| `src/lib/market/**` | The market engine — business profile, the measured market set, the twelve questions, coherence, rival derivation and rival sizing. | BP-011; leaves BP-025, BP-026, BP-028, BP-034, BP-052, BP-056 | `deriveProfile()` · `deriveMarketSet()` · `selectTwelve()` · `intentWeight()` · `phraseQuestions()` · `checkCoherence()` · `deriveRivals()` · `sizeRivals()` |
| `src/lib/scan/**` | The one scan pipeline — tier is a parameter — plus free-path admission control, the time and spend ceilings, degradation, and the stored report blob. | BP-012; leaves BP-023, BP-036, BP-050 | `runScan()` · `admitFreeScan()` · `readCurrentReport()` |
| `src/lib/opportunities/**` | The opportunity engine — the eight types, their evidence, their acceptance tests, winnability banding, ranking, supply depth and weekly verdicts. | BP-013; leaves BP-040, BP-041, BP-051 | `deriveOpportunities()` · `bandWinnability()` · `supplyDepth()` · `judgePublished()` |
| `src/lib/generate/**` | The content engine — brief → outline → grounded draft → answerability pass → claim check, with every hard rule enforced in code. | BP-014; leaves BP-042, BP-043 | `generateDraft()` · `runHardRules()` · `claimCheck()` |
| `src/lib/publish/**` | The publishing subsystem — the state machine, the veto/approval rule, the destination adapters, idempotency, retries, health, the 24-hour verification and the page record a customer opens. | BP-015 (no migration glob — withdrawn 2026-09-01 under rule 2a); leaves BP-035, BP-045 (`publications`; `machine/`, `attempt/`, `record/`, `switch/`, `ceilings/`, `types.ts`), BP-046 (`publishable/`), BP-048 (`destinations/wordpress/`), BP-049 (`verify/`), BP-057 (`settings/`), BP-058 (`destinations/` except `wordpress/`; `destinations`) | `transition()` · `becomesPublishable()` · `publish()` · `verifyLive()` · `pageRecordFor()` · destination adapters under `src/lib/publish/destinations/**` |
| `src/lib/mail/**` | The mail seam — one `sendEmail()`, one branded shell with a plain-text alternative, the register of nine mail kinds and their stoppability, and sequence scheduling. | BP-016; leaves BP-029, BP-053, BP-059 | `sendEmail()` · `MAIL_KINDS` · `scheduleSequence()` |
| `src/lib/account/**` | Account, billing and lifecycle — Stripe checkout/webhook/portal, provisioning, magic-link identity, active-access, export, unpublish-all and erasure. | BP-017; leaves BP-030, BP-031, BP-032, BP-060, BP-061, BP-062, BP-063 | `handleStripeWebhook()` · `provisionFromPayment()` · `hasActiveAccess()` · `exportEverything()` · `deleteAccount()` |
| `src/ui/**` | The design system — daisyUI 5 theme tokens, the registered component set, the closed chart inventory, fonts. | BP-018 | `src/ui/theme.css` · `src/ui/components/**` · `src/ui/charts/**` |
| `src/lib/presentation/**` | The presentation-law layer — the copy registry (every sentence the product speaks), the rendering of `Measured<T>`, the cold-start line, the generated-text label, the stopped-work statement, and the band-label registry. | BP-019 (its own `bands.ts`, `measured.ts`, `index.ts`); leaves BP-020 (`copy/` **and** `generated/`), BP-021 (`place/`; `coldstart/` is BP-021's under `tests/` only), BP-054 (`stopped/`) | `copy()` · `renderMeasured()` · `emptyStateLine()` · `stoppedWorkStatement()` · `BAND_LABELS` |

## Rules this map fixes

1. **`src/app/**` holds no engine logic.** Every route handler and every server
   component is a thin adapter over a component's exported interface. A Stripe
   webhook adapter verifies nothing itself: it hands the raw body and signature
   to BP-017. An Inngest endpoint registers nothing itself: it serves BP-003's
   registry.
2. **One owner per path, decided by the most specific declared glob**
   (**ADR-091**). A container or component anchors a directory; a leaf anchors
   the files it specifies inside it, and the narrower glob owns the file. So
   BP-029 owns `src/lib/mail/leads/**` and BP-016 owns the rest of
   `src/lib/mail/**`; BP-054 owns `src/lib/presentation/stopped/**` and BP-019
   the rest. `src/app/(hosted)/**` is BP-004's and is the only part of
   `src/app/` BP-001 anchors none of.
   **2a.** Two globs that match *identically* are a conflict under rule 7.1, not
   a precedence: the node that specifies the thing keeps the glob and the node
   that merely reads it withdraws.
   **2b.** A node may own files inside a container it is not a child of when it
   says so in its own `## Decisions` — the hierarchy answers *what behaviour is
   this a leaf of*, the globs answer *what moves together*. BP-036 is the
   corpus's one instance: its engine half is BP-012's and its two `src/app/`
   files are transport-only under rule 1. The container's glob is never narrowed
   to route around it.
3. **Migrations are topic-prefixed and topic-owned.** All migrations live in
   `supabase/migrations/`; BP-002 owns the baseline (`*_baseline*.sql`), the RLS
   policy files (`*_rls*.sql`), `*_domainblocks*.sql` (REQ-002's table has no
   writer anywhere in the product, so no feature node can own it) and the
   clients. Every other node globs its own topic token and no other node may use
   it:
   `users` · `sites` · `scans` · `fetches` · `opportunities` · `drafts` ·
   `publications` · `destinations` · `leads` · `suppressions`.
   **3a — sub-tokens.** A component holds a token; a leaf narrows it with a
   sub-token and owns that file, by rule 2's precedence:
   `*_users_provisioning_*` · `*_users_subscription_*` · `*_users_identity_*` ·
   `*_users_erasure_*` (all inside BP-017's `*_users*`) ·
   `*_sites_provisioning_*` · `*_sites_hosting_*` · `*_sites_erasure_*` ·
   `*_scans_freepath*` · `*_scans_verdict*` · `*_opportunities_core*` ·
   `*_opportunities_supply*` · `*_opportunities_verdicts*` · `*_drafts_core*` ·
   `*_drafts_claims*`. **A sub-token is not a new topic** and needs no entry in
   the closed list above. A column added to `users`, `sites` or any other
   baseline table after the baseline is a migration under that table's token or
   a sub-token of it — never "part of the baseline", which is one file that runs
   once. The list above is the closed set of topics; the sub-token list is open
   and grows with the leaves.
4. **Tests live beside the module they exercise**: `tests/<module>/**` belongs to
   that module's owner. `tests/pins.test.ts` is BP-005's alone, and
   `tests/setup.ts` is BP-001's with the rest of the toolchain (row above).
   **4a — a node that globs a source directory globs its tests.** A leaf owning
   `src/A/B/**` without `tests/A/B/**` leaves those tests to whoever owns
   `tests/A/**`, which is the parent — a home, but the wrong one, and the sort
   of gap that reads as coverage. Corrected 2026-08-31 in the two places it had
   happened: BP-053 gained `tests/mail/shell/**` and `tests/mail/vendor/**`, and
   BP-029 gained the three `tests/mail/templates/*` globs for the three template
   directories it owns. A sweep of every node's globs found no third case.
5. **Config over constants.** A number that appears in two files is wrong; it
   belongs in `src/lib/config/constants.ts` (BP-005) and is asserted in
   `tests/pins.test.ts`.
6. **Dependency direction is one-way**, `src/app/` and `src/jobs/` → `src/lib/`
   → `src/lib/{config,egress,costs,db}`. No `src/lib/` module imports from
   `src/app/`. A cycle between `src/lib/` modules is a build failure, not a
   review comment.
7. **A new top-level directory requires an ADR.** The top-level set is fixed at
   `src/`, `supabase/`, `tests/`, `public/`, `sdlc-factory/`.

## Scope conflicts

**None open.** Three were found and resolved in the 2026-08-31 consolidation
pass and two more on 2026-09-01; none needed a `blocked-by` edge, because each
resolution was subtractive and landed inside a node its own owner could edit.
A sixth sweep on 2026-09-01, after ADR-072, ADR-084, ADR-085 and ADR-086 landed,
added one directory (`src/lib/publish/record/**` and `tests/publish/record/**`,
both BP-045's, inside `src/lib/publish/**` which BP-015 anchors — rule 2, no
conflict) and two files inside a glob BP-049 already owned whole
(`verify/answer.ts`, `verify/site.ts`). No node's glob overlaps another's.

The two found on 2026-09-01 are the same shape as the `*_leads*.sql` row below
and were missed when it was fixed: the resolution was applied to one identical
pair and not carried across to the others. Every `code:` glob in the corpus was
re-swept for identical pairs afterwards and no third case remains.

| Conflict | Resolution |
|---|---|
| `supabase/migrations/*_publications*.sql` declared identically by BP-015 and BP-045 | Rule 2a: BP-045 specifies every column on the topic and keeps the glob; BP-015 withdrew it and its data-model section now cites BP-045. Found 2026-09-01. |
| `supabase/migrations/*_destinations*.sql` declared identically by BP-015 and BP-058 | Rule 2a: BP-058 specifies every column on the topic and keeps the glob; BP-015 withdrew it and its data-model section now cites BP-058. Found 2026-09-01. |
| `src/app/api/stripe/**` wanted by BP-001 and BP-017 | Rule 1: every `src/app/api/**` file is BP-001's and is transport-only; signature verification stays inside BP-017. Reasoning in BP-001's `## Decisions`. |
| `*_leads*.sql` and `*_suppressions*.sql` declared identically by BP-016 and BP-029 | Rule 2a: BP-029 specifies the columns and keeps both globs; BP-016 withdrew them and its data-model section now cites BP-029. |
| `src/app/(account)/setup/waiting/**` and `src/app/api/setup/progress/route.ts` claimed by BP-036 inside BP-001's globs | Rule 2b / ADR-091 point 3: BP-036 owns both by the more specific glob, declared in its decision 4. BP-001's globs are unchanged. |

## Unowned paths (recorded, not resolved — rule 2.2a)

**Six mail-template directories have no owning `code:` glob.** ADR-040 partitions
`src/lib/mail/templates/<kind>/` by the node that owns each kind's occasions, and
BP-029 declares three of the nine (`first-page`, `first-page-unavailable`,
`nurture`). The other six — `magic-link`, `draft-ready`, `published`, `weekly`,
`setup-reminder`, `account` — are declared by nobody, so `file → blueprint`
(rule 5.6) cannot answer for them and the librarian would flag any file landing
there as having no home.

This is **pre-existing and was not caused by the 2026-09-01 rulings**; it is
recorded here rather than fixed for two reasons. It is corpus-wide — six
directories across at least five candidate owners (BP-046 for `draft-ready`,
BP-049 for `published`, BP-051/BP-050 for `weekly`, BP-061 for `magic-link`,
BP-033 for `setup-reminder`, BP-063 and BP-058 for `account`, whose occasions
five requirements share) — and fixing the one this pass touched would close a
sixth of a gap while making the map read as complete, which is worse than
leaving it visible. And `account` has no single owner under ADR-040's own rule:
its occasions come from REQ-024, REQ-074, REQ-076, REQ-077 and REQ-079, which is
a genuine question about ADR-040's partition and not a missing line. Owed as its
own pass; it blocks nothing, because no file exists.

Two overlaps are **by design and are not conflicts**: a component's directory
glob against its own leaves' narrower globs (rule 2), and a component's topic
token against its leaves' sub-tokens (rule 3a). The narrower one owns the file
in both cases.
