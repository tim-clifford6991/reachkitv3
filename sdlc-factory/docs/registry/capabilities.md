# Capability Index — what already exists

> Rule 7.2: before any file plan is written, the planner searches this index
> AND the codebase for an existing implementation. Duplicating an indexed
> capability requires an ADR explaining why reuse was rejected.
>
> Rule 7.1: every capability is owned by exactly one BP node.
>
> Seeded 2026-08-31 from the container/component skeleton (BP-001..BP-019) and
> extended the same day with the forty-four feature nodes (BP-020..BP-063).
> Every row below is **specified, not yet built** — this repo carries no `src/`.
> A row exists so that the next planner reuses the seam instead of minting a
> second one; the "Public entry point" column is the contract to call, and it is
> the blueprint's `## Public interface` verbatim.
>
> **What "one owning BP" means here, and why a component and a leaf both appear.**
> Rule 7.1 gives one capability one owning node. In this corpus a component often
> *declares* a seam that a leaf beneath it *ships*: BP-016 declares
> `scheduleSequence()` and BP-029 realises it; BP-015 declares
> `becomesPublishable()` and BP-046 ships it. That is one capability with one
> owner, not two implementations — the component's declaration is the contract
> and the leaf is the implementation, and the two are the same signature by
> construction (a divergence is drift the librarian logs, and one such divergence
> is exactly what BP-054 refused to ship silently). **This index names the leaf**
> wherever a leaf exists, because the leaf is what a planner must open to write a
> file plan and is what `code:` binds; the component is named in parentheses
> where the seam is declared elsewhere. Where no leaf exists, the component owns
> both and appears alone. A capability with two nodes and no
> declaring/implementing relation between them is a rule 7.1 conflict and would
> be logged in `structure.md`'s `## Scope conflicts`; none is.

| Capability | Module | Owning BP | Public entry point | Consumers |
|---|---|---|---|---|
| Serving every ReachKit-addressed surface | `src/app/(public)`, `src/app/(account)`, `src/app/api` | BP-001 | routes; `src/app/api/**` adapters | people |
| The seven surfaces this container anchors **directly** — no leaf owns them | `src/app/(public)/pricing`, `src/app/(public)/opt-out/[token]`, `src/app/api/{lead,export,stripe/webhook}`, `src/app/api/report/[domain]/correct`, `src/app/api/drafts/[id]/[action]` | BP-001 | `GET /pricing` · `POST /api/lead` · `POST /api/report/{domain}/correct` · `GET /api/export` · `POST /api/drafts/{id}/{approve\|veto\|skip}` · `POST /api/stripe/webhook` · `GET /opt-out/{token}` — each a thin adapter; the delegation target for each is BP-001's own `## Public interface` table | people, Stripe |
| Postgres access, RLS default-deny, magic-link auth | `supabase/`, `src/lib/db/` | BP-002 | `db()` · `dbAdmin()` | every module |
| Scheduled and evented work, kill switch | `src/jobs/` | BP-003 | `serve()` · the seven `JobId`s | BP-012, BP-014, BP-015, BP-016, BP-017 |
| Serving published pages on a customer domain | `src/app/(hosted)/` | BP-004 | Host-keyed `GET /*` · `/robots.txt` · `/sitemap.xml` | crawlers, readers |
| Every pinned number and env binding | `src/lib/config/` | BP-005 | `constants.ts` (incl. `SELECTION` · `COHERENCE` · `CORRECTION` · `SEVERITY_THRESHOLDS` · `AI_READER_AGENTS` · `EFFORT_BY_TYPE` · `FIT_WEIGHT` · `VERIFY` · `WEEKLY_DUE_HOUR_LOCAL` · `GOAL_VALUES`) · `env` · `tests/pins.test.ts` | every module |
| Safe outbound fetch of a URL we did not author | `src/lib/egress/` | BP-006 | `safeFetch()` | BP-010, BP-011, BP-015, BP-017 |
| Does this domain resolve in DNS | `src/lib/egress/` | BP-006 | `resolvesInDns()` | BP-011, BP-017 (setup, settings, rivals) |
| robots.txt read and per-agent verdicts | `src/lib/egress/` | BP-006 | `readRobots()` | BP-010 |
| Cost context, cap enforcement, cache-first, ledger | `src/lib/costs/` | BP-007 | `withCostContext()` · `recordFetch()` · `capHit()` | BP-008, BP-009, BP-012 |
| DataForSEO — the closed endpoint list | `src/lib/vendors/dataforseo/` | BP-008 | `rankedKeywords()` · `keywordSuggestions()` · `competitorsDomain()` · `serpOrganic()` · `aiMode()` · `llmScraper()` | BP-010, BP-011, BP-013 |
| Model calls, one seam, closed call-site union | `src/lib/llm/` | BP-009 | `llm()` · `LlmCallSite` | BP-011, BP-013, BP-014 |
| Deterministic HTML parse and on-page facts | `src/lib/measure/` | BP-010 | `measureDomain()` | BP-012, BP-013, BP-014 |
| The three shown score factors, the score and its band | `src/lib/measure/` | BP-024 (four measured quantities are BP-010's `Drivers`) | `factorsOf()` · `presenceOf()` · `computeScore()` · `bandOf()` | BP-012, BP-022 |
| The measured / measured-zero / unmeasured trichotomy | `src/lib/measure/` | BP-010 | `Measured<T>` | every producer and every surface |
| Business profile in buyer vocabulary | `src/lib/market/` | BP-011 | `deriveProfile()` | BP-012 |
| The measured market set | `src/lib/market/` | BP-011 | `deriveMarketSet()` | BP-012 |
| Deterministic selection of the twelve searches, and the one intent classifier | `src/lib/market/questions/` | BP-025 (seam declared by BP-011) | `selectTwelve()` · `classifyIntent()` · `intentWeight()` | BP-012, BP-040 |
| Question wording (model touches words, never selection) | `src/lib/market/` | BP-011 | `phraseQuestions()` | BP-012 |
| Market coherence verdict, three-valued | `src/lib/market/` | BP-011 | `checkCoherence()` | BP-012 |
| Rival derivation from the twelve SERPs (cold-start safe) | `src/lib/market/` | BP-011 | `deriveRivals()` | BP-012, setup, settings |
| Rival sizing and `near`/`middle`/`far` banding | `src/lib/market/` | BP-011 | `sizeRivals()` | BP-013, Overview |
| The one scan pipeline, tier as a parameter | `src/lib/scan/` | BP-012 | `runScan()` | BP-001, BP-003 |
| Free-path admission control and refusal reasons | `src/lib/scan/` | BP-012 | `admitFreeScan()` | BP-001 |
| One current stored report per domain | `src/lib/scan/` | BP-012 | `readCurrentReport()` | BP-001, BP-004 |
| Named-stage scan progress | `src/lib/scan/` | BP-012 | `progress()` | BP-001 |
| Opportunity derivation, evidence and the closed type enum | `src/lib/opportunities/` | BP-013 | `deriveOpportunities()` | BP-012 |
| Winnability qualification and banding | `src/lib/opportunities/` | BP-013 | `qualifies()` · `bandWinnability()` | BP-013 internal, calendar |
| Unused-supply depth (open, non-`fix`) and the one supply notice | `src/lib/opportunities/supply/` | BP-041 (seam declared by BP-013) | `supplyDepth()` · `supplyNotice()` · `pursueDepth()` · `topUp()` | BP-001, BP-014 |
| Weekly verdicts against the recorded acceptance test | `src/lib/opportunities/verdicts/` | BP-051 (seam declared by BP-013) | `judgeWeek()` · `evaluateAcceptance()` · `readWeek()` · `weeklyDigest()` | BP-003, BP-016 |
| The five-step draft pipeline | `src/lib/generate/` | BP-014 | `generateDraft()` | BP-003, BP-015 |
| The generation hard-rule battery | `src/lib/generate/` | BP-014 | `runHardRules()` | BP-014 internal, BP-015 |
| Claim check against the do-not-claim list | `src/lib/generate/` | BP-014 | `claimCheck()` | BP-014, BP-015 (re-check) |
| Near-duplicate similarity, one fixed measure | `src/lib/generate/` | BP-014 | `similarity()` | BP-014 |
| The publish state machine, ten states, fifteen edges | `src/lib/publish/` | BP-015 | `TRANSITIONS` · `transition()` | BP-001, BP-003 |
| When a page becomes publishable, and whether the customer was told | `src/lib/publish/publishable/` | BP-046 (seam declared by BP-015) | `becomesPublishable()` · `toldCurrentPair()` · `tellingFor()` · `issueVetoLink()` | BP-003, BP-001 |
| Idempotent delivery to a destination | `src/lib/publish/` | BP-015 | `publish()` | BP-003 |
| 24-hour liveness verification | `src/lib/publish/` | BP-015 | `verifyLive()` | BP-003 |
| Destination adapters and health (hosted, WordPress) | `src/lib/publish/destinations/` | BP-015 | `DestinationAdapter` | BP-015, settings |
| One mail seam, one shell, plain-text alternative | `src/lib/mail/` | BP-016 | `sendEmail()` | BP-003, BP-015, BP-017 |
| The register of nine mail kinds, the omission rule and the shell | `src/lib/mail/` | BP-053 (register declared by BP-016) | `MAIL_KINDS` · `composeMail()` · `sendEmail()` | every sender, settings |
| Bounded per-domain follow-up sequencing | `src/lib/mail/leads/` | BP-029 (seam declared by BP-016) | `scheduleSequence()` · `advanceSequences()` | BP-003 |
| Address-wide suppression | `src/lib/mail/leads/` | BP-029 (seam declared by BP-016) | `suppressAddress()` · `applyOptOutToken()` | BP-001 (opt-out), BP-017 |
| Checkout, webhook and provisioning | `src/lib/account/` | BP-017 | `createCheckoutSession()` · `handleStripeWebhook()` · `provisionFromPayment()` | BP-001, BP-003 |
| The single active-access gate | `src/lib/account/` | BP-017 | `hasActiveAccess()` | BP-003, BP-012, BP-015 |
| Magic-link identity and safe address change | `src/lib/account/` | BP-017 | `requestMagicLink()` · `beginEmailChange()` | BP-001 |
| Content export, always available, never partial | `src/lib/account/` | BP-017 | `exportEverything()` | BP-001, BP-017 (deletion) |
| Unpublish-all and account deletion with 30-day purge | `src/lib/account/` | BP-017 | `unpublishEverything()` · `deleteAccount()` | BP-001 |
| Theme tokens and the daisyUI mapping | `src/ui/` | BP-018 | `src/ui/theme.css` · `tailwind.config.ts` | BP-001, BP-004 |
| The registered component set | `src/ui/components/` | BP-018 | the exported set | BP-001, BP-004 |
| The closed five-chart inventory | `src/ui/charts/` | BP-018 | `GrowthLine` · `PresenceBars` · `AiDotMatrixChart` · `RivalSparkline` · `WeekStrip` | BP-001 |
| The copy registry — every product sentence, and its metadata map | `src/lib/presentation/copy/` | BP-020 (seam declared by BP-019) | `COPY` · `COPY_META` · `copy()` · `explain()` | every surface, BP-016 |
| Rendering a `Measured<T>` truthfully | `src/lib/presentation/measured.ts` | BP-019 | `renderMeasured()` | every surface |
| The cold-start written line, per place, and the one-account-per-place arbiter | `src/lib/presentation/place/` | BP-021 (seam declared by BP-019) | `PLACES` · `emptyStateLine()` · `account()` · `CAUSE_PRECEDENCE` | every surface |
| Identifying generated text as page content | `src/lib/presentation/generated/` | BP-020 (seam declared by BP-019) | `generatedLabel()` · `renderGenerated()` | BP-001, BP-016 |
| The stopped-work statement, and the one next-publish line | `src/lib/presentation/stopped/` | BP-054 (seam declared by BP-019) | `stoppedWorkStatement()` · `nextPublishStatement()` · `dayAccount()` | BP-001, BP-016 |
| The band-label registry (ADR-001) | `src/lib/presentation/bands.ts` | BP-019 | `BAND_LABELS` · `SCORE_BANDS` · `SEVERITY` | BP-001, BP-016, BP-027, BP-040, BP-052 |

## Feature-node capabilities (BP-020..BP-063)

> Same rules. One capability, one owning node; the module is the node's own
> `code:` boundary inside its component's. **Ten feature nodes' capabilities are
> listed in the section above, not repeated here** — BP-020, BP-021, BP-024,
> BP-025, BP-029, BP-041, BP-046, BP-051, BP-053 and BP-054 each ship a seam a
> component declares, and a planner searching by module finds them under that
> module. One capability, one row, one owner; no capability appears twice in
> this file.

| Capability | Module | Owning BP | Public entry point | Consumers |
|---|---|---|---|---|
| The one public report address and its exhaustive resolution order | `src/app/(public)/scan/[domain]/`, `/api/scan/` | BP-022 | `resolveAddress()` · `canonicalRedirect()` | people, BP-001 |
| Free-scan admission, the named stages, the bounded ending | `src/lib/scan/` (`admission.ts`, `stages.ts`, `domain.ts`) | BP-023 | `admitFreeScan()` · `claimFreeScanSlot()` · `STAGES` · `progress()` | BP-001, BP-003 |
| Rival derivation and the Google-presence card | `src/lib/market/rivals/` | BP-026 | `deriveRivals()` · `buildPresenceCard()` · `isPlatformDomain()` | BP-012, BP-022, setup |
| Three problems, three severities, and the free method | `src/app/(public)/scan/[domain]/_problems/` | BP-027 | `severityOf()` · `cardsOf()` · `unblockLines()` | BP-022 |
| Coherence, the category on the report, one correction per free scan | `src/lib/market/coherence/` | BP-028 | `checkCoherence()` · `correctionOffer()` · `CORRECTION_SCOPE` | BP-012, BP-022 |
| Checkout without an account, and what checkout records | `src/lib/account/checkout/` | BP-030 | `createCheckoutSession()` · `CHECKOUT_PARAMS` · `recordCheckoutFacts()` | BP-001, BP-022 |
| The offer surface and an account with nothing measured yet | `src/lib/account/offer/` | BP-031 | `offerTerms()` · `purchaseContext()` · `setSiteDomain()` | BP-001 |
| A completed payment opens exactly one account | `src/lib/account/provisioning/` | BP-032 | `handleStripeWebhook()` · `provisionFromPayment()` · `requestMagicLink()` | BP-001, BP-003 |
| Payment chase and provisioning backstop (due-work) | `src/lib/account/provisioning/` | BP-032 | `paymentsAwaitingSignIn()` · `paymentsWithoutAccounts()` · `chaseSignIn()` · `backstopProvision()` | BP-003 `account/maintenance` |
| Setup: three decisions, one submit, and the way back | `src/app/(account)/setup/` | BP-033 | `readSetupState()` · `SETUP_INCOMPLETE_ALLOWLIST` · `scheduleSetupReminders()` | BP-001 |
| Market and rivals settled at setup, and the rival-set invariant | `src/lib/market/rivalset/`, `/setup/` | BP-034 | `addRival()` · `removeRival()` · `settleSetup()` · `validateSetup()` | BP-033, BP-055 |
| Mode and destination chosen at setup with working defaults | `src/lib/publish/setup/` | BP-035 | `setupCards()` · `applySetupChoice()` | BP-033 |
| The deep pass, its progress screen, the unconditional release | `src/lib/scan/deep/` | BP-036 | `runDeepPass()` · `progressStream()` · `releaseToApp()` | BP-003, BP-033 |
| App shell: three destinations, publishing state always in view | `src/app/(account)/app/_shell/` | BP-037 | `DESTINATIONS` · `readShell()` · `NO_PUBLISH_PRECEDENCE` | BP-001 |
| Overview: is it working, what needs me, how far ahead each rival is | `src/app/(account)/app/overview/` | BP-038 | `readOverview()` · `GOALS` (values from BP-005's `GOAL_VALUES`) · `OVERVIEW_HEAD` | BP-001 |
| The calendar, its stages, and the day panel's one account per date | `src/app/(account)/app/calendar/` | BP-039 | `readMonth()` · `readDay()` · `accountFor()` · `actionsFor()` | BP-001 |
| Opportunity derivation, evidence, winnability bands and the ranking | `src/lib/opportunities/derive/`, `/winnability/`, `/rank/` | BP-040 | `deriveOpportunities()` · `qualifies()` · `bandWinnability()` · `rankOpen()` · `explainChoice()` | BP-012, BP-041 |
| The generation pipeline, the hard rules, brand voice, similarity | `src/lib/generate/pipeline/`, `/rules/`, `/voice/` | BP-042 | `generateDraft()` · `runHardRules()` · `similarity()` · `HARD_RULES` | BP-003, BP-015 |
| The do-not-claim filter and the one recovery path | `src/lib/generate/claims/` | BP-043 | `claimCheck()` · `claimRecheckOutstanding()` · `recoveryOutcome()` | BP-042, BP-046 |
| The draft view: read it whole, edit as Markdown, copy it out | `src/app/(account)/app/draft/` | BP-044 | `readDraft()` · autosave `PATCH` · `MAX_BODY_BYTES` | BP-001 |
| Ten states, fifteen transitions, no duplicate post, instant stop | `src/lib/publish/machine/`, `/attempt/` | BP-045 | `TRANSITIONS` · `transition()` · `publish()` · `unpublish()` · `setPublishing()` · `heldPages()` | BP-001, BP-003 |
| Hosted pages on the customer's own domain, never ranking on ours | `src/app/(hosted)/` | BP-047 | `resolveHost()` · `robots.txt` · `sitemap.xml` · `tags()` | crawlers, readers |
| The WordPress destination | `src/lib/publish/destinations/wordpress/` | BP-048 | `wordpressAdapter` (its `deliver` · `unpublish` · `health`; `unpublish` is scoped by liveness and both its arms are here — **ADR-081**) · `detectSeoPlugins()` | BP-045, BP-058, BP-063 |
| 24-hour liveness verification, failures shown plainly | `src/lib/publish/verify/` | BP-049 | `verifyLive()` · `dueNow()` · `bodyCoverage()` | BP-003, BP-039 |
| The weekly re-measurement and a week that could not be measured | `src/lib/scan/weekly/` | BP-050 | `weekStartFor()` · `runWeekly()` · `dueSites()` · `accountForWeek()` | BP-003, BP-038, BP-051 |
| Rival sizing, `near`/`middle`/`far` bands, and the swap offer | `src/lib/market/sizing/` | BP-052 | `sizeRivals()` · `bandRivalSize()` · `swapOffer()` | BP-038, BP-055 |
| Settings: the closed list of what is the customer's to decide | `src/app/(account)/app/settings/` | BP-055 | `SETTABLE` · `ACTIONS` · `applySettings()` · `readSettings()` | BP-001 |
| Changing domain, market or rivals — effective at the next re-measurement | `src/lib/market/changes/` | BP-056 | `saveDomain()` · `saveCategory()` · `saveRivals()` · `effectiveOn()` · `generationHold()` | BP-055, BP-050 |
| Publishing settings: mode, veto window, publish time, time zone | `src/lib/publish/settings/` | BP-057 | `readPublishingSettings()` · `savePublishingSettings()` · `nextPublishTimeAtOrAfter()` | BP-055, BP-046 |
| Destination connection, health as a state, and the DNS record | `src/lib/publish/destinations/` (`config/`, `health/`) | BP-058 | `listDestinations()` · `connect()` · `reconnect()` · `checkHealth()` · `dnsRecordFor()` · `withConfig()` | BP-045, BP-055, BP-035 |
| Notification toggles for the three recurring mails | `src/lib/mail/notifications/` | BP-059 | `TOGGLABLE_KINDS` · `readNotifyPrefs()` · `stoppedByPreference()` · `applyUnsubscribeToken()` | BP-053, BP-055 |
| Billing, cancellation, resume, and the end of hosting | `src/lib/account/billing/` | BP-060 | `billingSummary()` · `portalLink()` · `hasActiveAccess()` · `hostedServingState()` | BP-055, BP-004, BP-003 |
| Hosting-end notices and hosting stop (due-work) | `src/lib/account/billing/` | BP-060 | `sitesDueHostingEndNotice()` · `sitesDueHostingStop()` | BP-003 `account/maintenance` |
| Magic-link identity, the sign-in session, and safe address change | `src/lib/account/session/` | BP-061 | `issueLink()` · `redeemLink()` · `currentSession()` · `signOut()` · `beginEmailChange()` | BP-001, BP-032 |
| Export everything, always, never partial | `src/lib/account/export/` | BP-062 | `exportEverything()` · `contentSummary()` · `buildManifest()` | BP-055, BP-063 |
| Unpublish everything, delete account, and the 30-day erasure | `src/lib/account/lifecycle/` | BP-063 | `DANGER_ZONE` · `beginDangerAction()` · `confirmDangerAction()` | BP-055 |
| The 30-day purge (due-work) | `src/lib/account/lifecycle/` | BP-063 | `accountsDueForPurge()` · `purgeAccount()` | BP-003 `account/maintenance` |
