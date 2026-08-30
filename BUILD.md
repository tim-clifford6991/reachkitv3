---
id: BUILD
type: implementation-specification
title: "ReachKit — build specification"
version: 1.1 — final pre-handoff
date: 2026-08-28
status: ready-to-build
audience: Claude Code, building this in as few shots as possible
sources: MVP.md v2.0 · DATA-COSTS.md v1.1 · the approved UI prototype (artifact "meaning-first MVP", 28 Aug)
---

# ReachKit — build specification

**What this is.** Everything needed to build ReachKit v1, in one file. Product
rules, design system, every screen, every dataset, every formula, the data model,
the jobs, and the build order. Where a judgement call is needed, the ruling is
already written here — build to the ruling, don't re-open it.

**The one-paragraph product.** A founder gives us a URL. We measure how findable
they are — in Google and in AI answers — against competitors they confirm. From
that we derive a ranked list of pages worth publishing, write one per day, and
publish it to a blog on their own domain (or their WordPress) after a 24-hour
veto window. Every Monday we re-measure and show what moved.

---

## 0. How to work on this repo

1. **Design before code, in artifacts.** Any new or visually changed surface is
   first mocked as a Claude artifact (self-contained HTML on the §2 design
   system), approved by Tim, then implemented to match. The approved prototype
   artifact is the visual source of truth for every screen in §4; do not
   re-design what it already settles.
2. **Simplicity is the product.** A person with zero SEO knowledge must
   understand every screen at first glance. If a module needs explaining, it is
   wrong. Meaning over data: every number on screen answers a question the
   customer actually has; anything else is not rendered even if we hold it.
3. **No generated prose in the UI.** LLM output appears in exactly one place:
   draft page content, always labelled. Every sentence in the interface is a
   written string in the codebase. No LLM-written summaries, narrations, or
   insights, anywhere.
4. **Lean data is a law, not a preference.** §6 lists every dataset the product
   is allowed to pull. A vendor call not in that table does not ship. Every call
   goes through the cost seam (§6.5), reads cache first, and respects its
   freshness window. "It's cheap" is not a reason to add a call.
5. **One claim, one home.** Every constant (price, cap, limit, copy string)
   is defined once. Every UI number traces to a stored measurement with a date.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Matches the existing reachkit.app build |
| Styling | **Tailwind CSS 4 + daisyUI 5** | daisyUI is the component library; theme via §2 tokens |
| Fonts | **Plus Jakarta Sans** (UI) + **JetBrains Mono** (all numerals/data) | `@fontsource`, self-hosted |
| Icons | **lucide-react** | Thin, 2px stroke |
| DB + auth | **Supabase** (Postgres, RLS default-deny, magic-link auth) | `dbAdmin` server-only |
| Payments | **Stripe** Checkout + customer portal + webhook | Pay before account |
| Email | **Resend**, one `sendEmail()` seam, one branded shell | Plain-text alt on every mail |
| Jobs | **Inngest** (or Vercel cron + queue) | Scan runs, daily generation, Monday refresh |
| Search data | **DataForSEO** (Labs, SERP, AI Optimization) | §6 price book |
| Inference | **Anthropic Haiku 4.5** (prose) + a nano-class model (scaffolding) | Behind one `llm()` seam with per-call cost logging |
| Hosting | Vercel; hosted-CMS pages served from an edge route keyed by Host header | §11 |

Repo shape: standard Next.js. `src/lib/` holds the engine (measure, score,
opportunities, generate, publish, costs), `src/app/` the surfaces,
`src/lib/config/constants.ts` **every** pinned number in this document,
`tests/pins.test.ts` asserting them.

**Greenfield (owner ruling, 28 Aug).** Build fresh in `ReachKitV2` exactly to
this document. The shipped reachkit.app repo is *reference, not substrate* — its
three-lane plan, day scheduler and score machinery would fight this shape at
every step. Read it for proven patterns (SSRF fetcher, cost seam, Stripe webhook
handling) and reimplement to this spec; copy no file wholesale.

---

## 2. Design system

### 2.1 Tokens

daisyUI 5 theme, expressed as CSS variables. These exact values — they are lifted
from timclifford.dev so the products share a visual family. Three-state theming:
bare `:root` = light; `@media (prefers-color-scheme: dark)` guarded with
`:root:not([data-theme="light"])`; `:root[data-theme="dark"]` for the explicit
toggle. Never define a color only inside a dark block.

```css
:root {            /* light */
  --bg:#f6f6f9; --surface:#ffffff; --sunk:#efeff4; --line:#eaeaf1;
  --ink:#191925; --ink-2:#5e5e73; --ink-3:#9695a8;
  --accent:#5b4be0; --on-accent:#ffffff; --accent-bg:#eeecfd; --accent-line:#ddd8fa;
  --ok:#1f8a6b;  --ok-bg:#e7f6f0;  --ok-line:#d2ede3;
  --warn:#b8722a; --warn-bg:#fff3e6; --warn-line:#fbe1c6;
  --bad:#c0432b;  --bad-bg:#fdece8; --bad-line:#f8d5cd;
  --chart-you:#5b4be0; --chart-rival:#787790; --chart-goal:#b8722a;
  --r-box:14px; --r-field:9px; --r-pill:999px;
  --shadow-card:0 1px 3px rgb(24 24 48/.045);
  --ring-accent:0 0 0 3px rgb(91 75 224/.18);
}
/* dark */
  --bg:#0e1116; --surface:#161a21; --sunk:#11151b; --line:#242a34;
  --ink:#dde3eb; --ink-2:#8e99aa; --ink-3:#69738a;
  --accent:#9bb4ff; --on-accent:#0e1116;
  --accent-bg:rgb(155 180 255/.12); --accent-line:rgb(155 180 255/.28);
  --ok:#7bd8b0; --warn:#e6b45a; --bad:#f0907a;   /* + matching -bg/-line at 12%/28% alpha */
  --chart-you:#5f7ff2; --chart-rival:#5c6579; --chart-goal:#e6b45a;
```

Map these onto daisyUI's theme slots (`base-100`←surface, `base-200`←sunk,
`base-300`←line, `base-content`←ink, `primary`←accent, `success/warning/error`←
ok/warn/bad) in the Tailwind config so stock daisyUI classes just work.

### 2.2 Components

daisyUI components only — no bespoke widgets. The set the product uses:
`btn` (+primary/ghost/sm/block) · `card`/`card-body`/`card-title` · `badge`
(+primary/success/warning/error/ghost) · `alert` (4 tones) · `stats`/`stat` ·
`tabs` (boxed + bordered) · `table` (+zebra, always inside an `overflow-x-auto`
wrap) · `progress` · `toggle` · `steps` · `join` · `collapse` · `input` ·
`divider` · `kbd`. Custom CSS is allowed only for: the calendar grid, the day
panel, the AI dot-matrix, chart SVGs, and the sidebar — nothing else.

### 2.3 Type and numerals

Headings: Jakarta 700–800, tight letter-spacing (−0.02em), `text-wrap:balance`.
Body 15px/1.55. **Every numeral, date, URL, search query and code-like string is
JetBrains Mono with `tabular-nums`.** Uppercase 10.5–11px eyebrows for section
labels. No emoji anywhere in the product.

### 2.4 Charts

Rules (already validated with a CVD checker — keep these exact pairs):

- **Two chart colors only:** `--chart-you` (accent) and `--chart-rival` (neutral gray). The customer is always the accent; everyone else is context. Status colors (ok/warn/bad) are for state, never for series.
- Every bar/point is **direct-labelled** (name + value) — identity is never color-alone.
- One axis per chart, thin 2–2.5px lines, 3.5–5px endpoint dots with a surface-colored ring, faint gridlines at 2–3 values, hover tooltip on every mark (fixed-position, ink-on-bg, mono).
- Inline SVG, hand-sized viewBoxes — no chart library.
- The chart inventory is closed: growth line (Overview), presence bars (report), AI dot-matrix (report + Overview), rival-gap sparklines (Overview), 7-day week strip (Overview). A new chart form is a design-artifact approval first.

### 2.5 The meaning rules

- Every card leads with **the answer**, not the metric: a verdict chip (`You: 0/12`), a big mono number with its delta badge, or a filled/empty visual. Explanatory text is one short written line, 11–12px, dim.
- Provenance is always visible but always quiet: `measured 28 Aug`, `from: appcues alternative · 1,900/mo` — mono, dim, small.
- Empty/degraded states are designed, never blank: a measurement that failed says so in one written sentence; an empty queue is a success state ("Nothing worth publishing today").
- Red appears only for *the customer's problem being shown to them* (blocked, absent, 0/12). Rival strength is neutral gray, never red — rivals are context, not alarms.

---

## 3. User journey

Follows the shipped reachkit.app journey — public scan URL, pay-before-account,
magic link — with the publishing product on the paid side.

```
/                     Landing: one field, one button. "See what AI tells buyers
                      about your market — and write your way in."
   ↓ scan
/scan/{domain}        FREE REPORT (public, permanent, shareable; §4.1)
                      · arriving on a shared link starts a scan client-side on
                        first frame; never during server render
   ↓ "Email me the full page"  →  lead captured, full draft emailed (§4.2)
   ↓ "Start ReachKit €49"
Stripe Checkout       No account, no form before payment
   ↓ webhook          provision user + site, queue deep pass, send magic link
/setup                THREE DECISIONS (§4.3): market · competitors · mode+destination
   ↓                  deep pass finishes → opportunities → first draft generated
/app                  Sidebar: Overview · Calendar · Settings (§4.4–4.7)
                      Daily loop: 1 page/day, veto window, publish, verify
                      Monday: full re-measure, movement email
```

Existing-route compatibility: keep `/scan/{domain}` as the public report path and
the report → checkout → magic-link → setup order exactly as the current app has
it. What changes behind those URLs is the content, per §4.

---

## 4. Screens

The approved prototype artifact renders all of these — match it. Per screen:
purpose, modules in order, and states.

### 4.1 Free report `/scan/{domain}` — public

Purpose: a stranger sees, in under a minute, that AI recommends rivals and not
them — and leaves with a finished page. Order:

1. **Header strip** (card): domain · date · category · score (big mono, band badge) · three driver mini-bars · Copy link.
2. **Two equal cards, side by side** — never stacked in importance:
   - **AI answers** (source chip: *Google AI answers · {date}*): denominator line ("AI answers appear on {m} of your 12 biggest searches"), dot matrix over those m (rivals' cited rows filled gray, customer's row empty red-ringed, `n/{m}` per row; a no-AI-answer question = muted cell) · divider · **"The 12 questions"** list — each row: `n · "question"` + `not you` badge + provenance line `from: {search} · {vol}/mo · named: {brands}`. First 4 shown, "Show all 12". Method stated as one chip: *"= your market's 12 biggest searches, asked as a buyer asks AI."*
   - **Google search** (source chip: *your market's 12 biggest searches*): occupancy bars — top-10 appearances /12 per rival (gray) and the customer (accent), direct-labelled · divider · "5 biggest searches you're absent from" table (search · /mo · holds #1) · footnote from F4: "Your market's search set totals {N}/mo — you currently appear in {n}." Rivals on this card come from §6.6's derivation, never from `competitors_domain`.
3. **Three problem cards** (grid): *AI readers blocked* (`badge-success` "Free fix · 10 min", the robots lines verbatim in a code block) · *Missing pages* (`badge-primary` "ReachKit writes", counts only) · *Unquotable pages* ("ReachKit rewrites", counts only). Left border color = severity.
4. **DIY collapses** (3): the complete method, free. Instructional text is allowed here.
5. **Free page card** (accent border): title of page 1 of N, target/beats/format rows, **"Email me the full page"**.
6. **Pricing card**: €49/mo + four spec rows (1/day · weekly · weekly · 24h veto) + Start button + "Cancel in one click."

States: scanning (progress steps, no bare spinner) · degraded (missing driver →
section absent + one written line, score `null` renders as "—") · cooldown for a
domain that failed <24h ago (honest message + retry button, no auto-restart).

### 4.2 The giveaway email

Capture = the trade for the finished page. The full draft is generated **only
after** the email is submitted (~7¢ spent on identified leads only). Email
contains the page in a copy-ready block (Markdown + HTML buttons), the target
search + volume, and one line: "That's page 1 of {N} we found for you." Nurture:
max 3 mails (24h/72h/168h), stops on conversion.

### 4.3 Setup `/setup` — post-payment, once

Three cards, one submit. (1) **Your market** — inferred category chip, Change.
(2) **Competitors** — suggested chips from `competitors_domain`, up to 5 selected.
(3) **Mode + destination** — Autopilot (default, selected) vs Copilot card pair;
destination: *Hosted blog* (chosen, shows the CNAME record) vs *WordPress —
connect later, ask me after the first page*. Footer: "Start — first page in ~3
minutes." No other configuration exists at setup.

While the deep pass runs: progress screen; on completion straight to the app with
the first draft already in the calendar. A degraded pass still releases setup
(zero proposals is legal, never faked).

### 4.4 App shell

Left sidebar (222px, sticky): domain block (accent dot, domain, `Week n ·
re-measured Mon`) · nav **Overview / Calendar / Settings** (Calendar shows item
count) · footer autopilot card (state + next publish time + toggle). Mobile:
sidebar hidden, top tabs. No other navigation.

### 4.5 Overview (default view)

1. Head: "The gap is closing." + `▲ every week since you started` badge — the four words are backed by the chart directly under them.
2. **Growth chart**: searches-you-appear-in, weekly points, area+line in `--chart-you`, endpoint labelled, footnote pair: start value · "At 400 the big category terms unlock." Hover tooltips.
3. **Three stat tiles**: Score (mono + ▲delta + band badge) · AI answers `n/12` (dot row incl. dashed goal dots + "goal: 6") · Pages published (n + "m already ranking" + "rest under 3 weeks — too early to judge").
4. **How far ahead each rival is**: per rival — name · falling sparkline (gray, accent endpoint) · `78×` big mono · `was 276×` success badge. One dim line: "Every line pointing down is the gap shrinking."
5. **This week**: 7-day strip (done/today/next) + "Open calendar →" + up to two alerts (today's page pending veto → "Read it"; a needs-you item → action button).

Data rules: max one headline number per module; every value carries its delta or
its goal, never bare.

### 4.6 Calendar (with day panel)

- Head: "One page a day. Every day." + month switcher.
- **Stage filter cards** (All/Live/Your review/Scheduled/Planned/Needs you) with counts; clicking filters the grid.
- **Grid**: Mon–Sun columns (`repeat(7,minmax(0,1fr))` — the minmax is load-bearing), one event per day, every day filled while supply lasts, weekends included. Stage = chip color. Today ringed accent.
- **Day panel** (290px, sticky, beside the grid — not a drawer): **today selected on open**. Contents: stage badge + date · title · status rows · "Why this page" (search / asked / answered-today-by / you / done-when — all mono values) · stage-appropriate actions (review → *Read the full page* + Move/Veto; live → *View live page*; needs-you → *Reconnect*; planned → Move/Skip) · one dim provenance line.
- "Read the full page" opens the **draft view** (full page render, grounded-fact highlight with its source line, claim-check badge, Approve/Edit/Veto, and the "what happens if you do nothing" info box). Back link returns to the calendar.
- **Edit = Markdown textarea with a live preview pane** (owner ruling, 28 Aug) — two columns on desktop, tabbed on mobile, autosaved, no rich-text editor. An edited draft keeps its grounding highlight if the fact survives the edit and drops the claim-check badge until the check re-runs (one nano call) on save.
- Footnote: planned pages are written the evening before from Monday's measurements. **Supply rule:** when opportunities run out, future days are empty and the empty state says so — the calendar is never padded.

### 4.7 Settings

Two-column cards. Left: **Your market** (chip + Edit + "changing this rebuilds
the search set and the 12 questions next Monday") · **Competitors** (chips ×5,
add/remove) · **Publishing** (mode toggle, veto window stepper 0–7d default 24h,
publish time, destinations list with health + Reconnect; footnote: *"Fix-type
tasks are never automated, whatever the mode."*) · **Notifications** (3 toggles).
Right: **Billing** (plan, next invoice, card, invoices link, Update card / Cancel
plan + "cancelling keeps everything running until {date}") · **Account** (name,
email, magic-link note, change email, sign out) · **Your content** (pages count,
Export everything — always available) · **Danger zone** (unpublish all, delete
account; "pages are exported to you first, never silently destroyed").

Settings holds the three product answers plus account admin, and **nothing that
tunes the engine** — caps, cadences, question counts, model choices are code
constants.

---

## 5. Scoring

```
Foundations    = access gates + clarity signals, 0–100
                 (generic noindex on the home document ⇒ 0, and score ⇒ 0)
Answerability  = shape of the home + measured pages, 0–100, floored at 1
                 shape = (questionShaped + directAnswers + evidenceDensity) / 3
SearchPresence = min(100, 25 × log10(ranked + 1)) × (0.55 + 0.45 × min(1, top10share × 4))
AIPresence     = max(1, (0.4 × mentionRate + 0.6 × citationRate) × 100)
Presence       = max(1, √(SearchPresence × AIPresence))

Score = round( ∛(Foundations × Answerability × Presence) )
Bands: 0–24 Invisible · 25–49 Hard to find · 50–74 Findable · 75–100 Dominant
```

Sub-measures: `questionShaped` = question-shaped headings ÷ all headings × 100
(question-shaped = ends `?` or opens with how/what/why/when/where/which/who/can/
do/does/is/are); `directAnswers` = question headings whose first block is 40–320
visible chars ÷ all headings × 100; `evidenceDensity` = saturating log curve over
(numerals + dates + outbound citations per 1k chars). Empty denominators read 0,
never null. A driver that **could not be measured** is `null` and nulls the score
(rendered "—" + one written line); a **measured 0 is a 0**. Identical free/paid;
no tier parameter. All measurement over raw fetched HTML — no JS execution, fully
deterministic.

---

## 6. Data layer

### 6.1 Price book (pin in `constants.ts`, assert in `tests/pins.test.ts`)

| Constant | Value |
|---|---|
| `RANKED_FREE_ROWS / COST` | 50 rows · 1.8¢ |
| `RANKED_PAID_ROWS / COST` | 300 rows · 4.8¢ |
| `RANKED_RIVAL_ROWS / COST` | 100 rows · 2.4¢ |
| `COMPETITORS_DOMAIN_COST` | 1.5¢ |
| `SUGGESTIONS_COST` | 1.8¢ / call @ 50 rows |
| `SERP_LIVE / SERP_STD` | 0.2¢ · 0.06¢ |
| `CHATGPT_SCRAPE_STD` | 0.12¢ (paid battery only — never on the free path) |
| `AI_MODE_LIVE / STD` | 0.2¢ · 0.06¢ |
| `QUESTIONS` | 12 |
| `TARGET_SERPS_MAX` | 13 |
| `MEASURED_PAGES_MAX` | 25 |
| `COMPETITORS_MAX` | 5 |
| `CAP_FREE / CAP_DEEP / CAP_WEEKLY / CAP_DRAFT` | 12¢ · 150¢ · 40¢ · 45¢ |
| `PLATFORM_DOMAINS` | reddit, quora, youtube, wikipedia, g2, capterra, medium, linkedin, producthunt, stackoverflow, … (closed list) |
| `RIVAL_SCORE` | top10Appearances + 2×aiCitations (§6.6) |
| `SERP_LOCATION` | Google US · en (MVP; §6.3a) |

### 6.2 The AI-visibility ruling (the lean answer)

We do **no own inference** for AI visibility — all AI-answer data is DataForSEO
data, three tiers, and the MVP uses the cheap two plus a free one:

| Tier | What it is | Cost | MVP use |
|---|---|---|---|
| **AI Overviews** | `ai_overview` item + per-domain `references`, returned **inside** organic SERPs we already buy | **0¢ extra** | **The free report's AI matrix** (12 question-SERPs) and every paid target SERP. Never set `load_async_ai_overview` |
| **Google AI Mode** | Google's AI answer surface, own SERP endpoint, cited sources | 0.06¢ std / 0.2¢ live | Paid battery, engine 2 |
| **ChatGPT (LLM Scraper)** | The actual ChatGPT product's answer, scraped | 0.12¢ std / 0.4¢ live | **Paid only** — battery engine 1 (std) |
| Perplexity (LLM Responses) | API answer, model cost dominates | ~0.56¢ | **Deferred to v1.1** — 70% of the old battery cost for a duplicate verdict |

Free report battery (owner ruling, 28 Aug): **12 organic SERPs live = 2.4¢**,
reading each SERP's `ai_overview` + cited domains for free — the matrix is
"Google's AI answers", not engine-specific, and the same SERPs supply the
"holds #1" column. The free path makes **zero** AI Optimization API calls.
An AI Overview does not appear on every query: state the denominator
("AI answers appear on 9 of your 12 biggest searches — you are cited in none"),
and render a no-AI-answer question as a muted cell, never as a miss.
Paid weekly battery: **ChatGPT std + AI Mode std + AI-Overview piggyback =
2.2¢/week**, rendered as three answer columns.

### 6.3 Datasets — the closed list

**Free scan** (total ~6.3¢, cap 12¢): own fetches (home, detected pricing page,
robots.txt) → Foundations/Answerability · nano ×1 over the **homepage text** →
business profile in buyer vocabulary (§6.7, never over rankings) · `keyword_suggestions` seeded from
those terms → market set + denominator + the 12 questions ·
`ranked_keywords`@50 → the customer's own presence (0 rows is a legal result) ·
**12 organic SERPs live** → top-10 holders, the AI-Overview matrix, **and the
rivals themselves** (§6.6). No `competitors_domain` on the free path. Brand
mentions/citations = string match over references.

**Paid deep scan** (~30¢ live at onboarding; **weekly refresh ~8¢** standard):
adds `ranked_keywords`@300 (user) · @100 ×rivals (**monthly**) ·
`competitors_domain` (**monthly**) · `suggestions` ×2 (**monthly**) · ≤13 target
SERPs (weekly, std) · own fetches of ≤25 ranking pages + rival home/robots ·
battery per §6.2 · Haiku ×~4 for opportunity typing.

**One day of content**: ~6.5¢ (nano brief/outline/claim-check + Haiku draft +
answerability pass + retry allowance). `CAP_DRAFT` 45¢ is enforced headroom.

**Monthly per customer ≈ $2.71 ≈ €2.50 → ~95% gross margin at €49.**

### 6.3a Locale (owner ruling, 28 Aug)

**MVP is US-English only.** Every SERP, suggestion and volume uses Google US /
`en` — one location constant (`SERP_LOCATION`), never per-customer derivation.
Consequences stated, not hidden: volumes and rivals will be wrong for non-US
markets; the free report footer carries one written line — *"Measured on US
Google. More countries soon."* Locale derivation (site `lang` + TLD → country) is
the designed v1.1 upgrade and changes no other part of the pipeline.

### 6.4 Redundancy rules — the never-pull list

- Nothing is fetched that no rendered surface reads (a dataset ships only with its screen).
- Cache windows: own domain 7d · rivals 30d · SERPs 30d (except the weekly target re-check) · suggestions 30d. Cache is keyed source+key+policy-version; an empty payload is always a miss; **no negative cache**.
- Never: SERP depth >10 · search operators (`site:` = 5×) · clickstream flags · `load_async_ai_overview` · Labs historical endpoints · per-rival `ranked_keywords` on the free path · a 4th engine · per-draft re-probing · AI Keyword Data (v1.1 candidate only).
- Live mode only where a human is waiting (free scan, onboarding pass). Everything scheduled = standard queue.
- **A free re-scan of the same domain within 7 days serves the stored report** — no new spend. The report shows its measurement date; a "Re-scan" affordance appears only after the window. (Failure cooldown stays 24h as specced.)
- **A free scan's data is reused by the paid deep pass** within its cache windows — the questions, market set, and 12 SERPs from a <7-day-old free scan carry over, so onboarding is faster and cheaper than the headline 30¢ when the customer converts promptly (the common case).
- Every fetch of user-supplied URLs goes through one SSRF-guarded, DNS-pinned, size-capped fetcher; robots.txt respected; no crawling — the page set is only URLs we already hold from ranking data or construct by name.

### 6.5 The cost seam

Every vendor/LLM call runs inside a per-scan cost context: `recordFetch{scanId,
source, cacheKey, costCents, payload}` — one `fetches` table is ledger + cache +
raw store. Caps degrade (skip remaining optional work, mark scan `degraded`),
never throw; money already spent is always ledgered. `capHit()` is re-checked
between calls in any multi-call step.

### 6.6 Rival derivation, and the cold-start law

**The cold-start law: every derivation in the product must work for a domain that
ranks for nothing.** Cold start is the default customer — the product exists to
build their foundation — so no dataset, module, or sentence may assume presence.
Anything keyed on the customer's own rankings is a warm-start *supplement*, never
a dependency.

**Rivals** are therefore derived from the *market*, not from the customer:

```
rivalDomains = for each of the 12 question-SERPs (F7):
                 take the organic top-10 domains + the ai_overview reference domains
  → strip the customer's own domain
  → partition against PLATFORM_DOMAINS (reddit, quora, youtube, wikipedia,
    g2.com, capterra, medium, linkedin, producthunt, stackoverflow, …):
      platform hits  → the "sources" list (stored in the report blob; not rendered in MVP — a v1.1 Standing module)
      product domains → rival candidates
  → score = top10Appearances + 2 × aiCitations   (cited-by-AI weighs double)
  → top 5 by score = suggested rivals
```

Zero extra cost — it counts over SERPs already bought — and the output is
identical whether the customer ranks for 10,000 searches or none. At setup the
suggested chips come from this list, `competitors_domain` adds candidates only
when the customer has presence (warm-start supplement), and **the customer can
always type a rival manually** — a cold-start founder knows their competitors
even when no dataset does.

**Cold-start rules per surface** (the pipeline never branches; only rendering
guards):

- Free report contrast = *share of the market's 12 biggest searches* (top-10 appearances /12, AI citations /m) — meaningful at zero. Global ranked-count contrast (12,400 vs 25) is a paid reveal.
- "You appear in N searches" renders N=0 as a measurement, never an error; the header strip's footnote line comes from F4 either way.
- Score: SearchPresence 0 → Presence floors at 1 → a clean cold-start site scores ~10–15, Invisible. Honest, and the reason the product was bought.
- Overview "how far ahead" ratios: when the customer's count is 0, render the rivals' absolute numbers with `you: 0` — **never a ratio** (division by zero renders as ∞× and reads as broken). The ratio module unlocks at ranked ≥ 10 with copy "now comparable".
- Growth chart starts at 0 and that is the story: the line leaving the floor.
- Opportunities: all Write-family at first (nothing to Improve yet); winnability `max(500, 5×ranked)` keeps winnable targets non-empty at ranked = 0; Improve types appear naturally as pages start ranking.
- Every empty-at-cold-start module states what fills it: "appears after your first pages rank", never a blank.

### 6.7 From a URL to the 12 questions

The 12 questions are the product's foundation — they drive the free report, the
rival derivation, and (once confirmed) the paid tracking set. The chain is five
steps; **selection is deterministic and auditable end to end — the LLM touches
vocabulary, never selection.**

**Step 1 — Business profile (nano, ~0.3¢).** From the fetched home + pricing
pages, extract a structured profile: category phrase **in buyer vocabulary**
(the prompt asks "what would a buyer type into Google", not the site's marketing
language — "product adoption platform" also yields "user onboarding software"),
the job it does, offering type, 2–4 audience/use-case terms, rivals the site
itself names, locale. A wrong guess here self-corrects at step 2: a bad seed
returns off-market suggestions that die in the relevance guard.

**Step 2 — Measured market (1.8¢).** `keyword_suggestions` on the primary seed →
~50 real searches with real volumes. This converts guessed language into measured
language: if the market says "onboarding tool", the volumes say so.

**Step 3 — Select the 12.** Score every suggestion:

```
score = intentWeight × log10(volume + 1)          volume floor: 50/mo

intentWeight (deterministic keyword-shape patterns, no LLM):
  3  decision      best X · X vs Y · X alternatives · top X tools
  3  solution      {category} software|tool|app|platform
  2  problem       how to {job} · {pain phrase}
  1  informational what is X
  drop  own-brand  contains the customer's name (measures nothing about discovery)

relevance guard (kills seed drift): every non-generic token must be
  supported by the profile's vocabulary — "employee onboarding checklist HR"
  dies here for a user-onboarding SaaS.

composition constraints on the final 12 (a portfolio, not a leaderboard):
  ≥4 decision · ≥3 solution · ≤3 rival-brand · ≤2 how-to
  near-duplicates collapse (same content-token stem set → keep highest volume),
  so the 12 SERPs are 12 different questions — a leanness rule as much as a
  quality one.
```

*What makes one search more critical than another:* *decision and solution intent
beat raw volume* — a 1,900/mo "appcues alternative" outranks a 24,000/mo
informational query, because it is where buyers choose and where AI answers
recommend lists. Volume enters log-scaled so it breaks ties inside an intent
class rather than steamrolling across classes.

**Step 4 — Phrase as questions (nano, same call as step 1).** Template-first
("best X" → "What's the best X?"; "X vs Y" → "X or Y — which should I pick?");
the LLM only words the question. **Phrasing never changes which searches were
selected**, and each question renders with its source search + volume — the
provenance line the report already shows.

**Step 5 — Coherence check + correction (0¢ + bounded).** After the 12 SERPs
return: if no domain appears in ≥3 of the 12 top-10s, the market set is likely
wrong (disjoint SERPs = incoherent market). The report then leads the header with
the category chip and **"Not your market? Correct it"** — one correction per free
scan re-runs steps 2–5 (~4.2¢; worst case 10.5¢, still under the 12¢ cap). On the
paid side the customer confirms the category at setup, may edit it in Settings,
and the question set **freezes after confirmation** so week-on-week movement is
comparable; it re-derives only when the category changes.

---

## 7. Opportunities

Derived mechanically — **no LLM decides what an opportunity is** (Haiku only
labels/classifies). Types, closed enum:

| Family | Type | Trigger |
|---|---|---|
| **Write** | `answer_page` | AI answer for a question names rivals, not customer |
| | `keyword_page` | Rival top-20 for a query ≥10/mo; customer absent |
| | `comparison_page` | Gap query names a rival or contains vs/alternative |
| | `format_page` | Rivals have a page type customer lacks entirely |
| **Improve** | `expand_page` | Customer ranks 4–30, page thin |
| | `answerable_page` | Page has search value, low answerability |
| | `refresh_page` | Ranking page stale vs rivals' |
| **Fix** | `unblock` | Any access gate fails — **instruction only, never generated, never automated** |

Every opportunity: trigger · evidence (query, volume, rival, URL, position) ·
target (URL or proposed slug+title) · demand · effort · **acceptance test**
("top 20 for Q" / "named on question P" / "gate passes").

**Winnability (right-sizing):** a Write target qualifies only if its top-10
contains at least one domain whose ranked count ≤ max(500, 5× customer's). Bands
(Winnable/Reach/Not-yet) power the report's "picked because" line and the
Standing scope module. Ranking: `demand × intent × (1−effort) × fit`, one list.
**Supply is the cap:** never invent an opportunity to fill a day.

---

## 8. Generation

Pipeline per draft: **brief (nano) → outline (nano) → grounded draft (Haiku) →
answerability+SEO pass (Haiku) → claim check (nano)**. Hard rules, enforced in
code, not prompts:

1. **Grounded**: ≥1 verifiable fact from the customer's own live pages, carried with its source URL + read date, rendered as the highlight in the draft view.
2. **No invented people**: no generated bylines/bios/personas. Customer identity or none.
3. **Not a doorway**: answers the target question before naming the product (checked: first 300 chars contain no brand mention).
4. **Do-not-claim list**: hard output filter (string/semantic match), failure = regenerate, twice = needs-attention.
5. **Near-duplicate gate**: ≥85% similarity vs the customer's published set = never queued.
6. No rival metrics invented; every rival claim links its public source.
7. Brand voice = one free-text field appended to the draft prompt. Nothing learned.

Timing: the day's page is generated the evening before its publish date from the
freshest scan. `CAP_DRAFT` enforced before the pipeline runs.

---

## 9. Publishing and autopilot

**State machine** (exact, idempotent):

```
planned → generating → in_review → approved → publishing → published
                          ↓ veto                  ↓ fail
                       skipped            failed → retry ×3 → needs_attention
published → unpublished (always available)
```

- **Draft-by-default everywhere.** Autopilot = auto-approve when the veto window (default 24h, settable 0–7d) expires without a veto. Copilot = explicit approve only.
- Autopilot hard limits regardless of settings: ≤1 publish/day, ≤8/week; **Fix never automates**; pause is one click and instant.
- Publishing idempotent by `(draft_id, destination)` — a retry can never create a second post.
- Failed publish: back in the queue with a written reason; expired credential is a **state** (reconnect prompt, queue holds), not an error loop.
- Every published page records: opportunity id, target query, measurement date, approved-vs-autopilot, live URL.

**Hosted CMS:** `content.{customer-domain}` by CNAME → our edge route serves
static-rendered pages by Host header. Sitemap, canonical, `FAQPage` schema where
FAQ exists, and a robots.txt **we serve** that allows GPTBot, ClaudeBot,
OAI-SearchBot, Claude-SearchBot, PerplexityBot, Google-Extended. Preview at
`{slug}.reachkit.app` is `noindex` **forever** (site-reputation-abuse guardrail —
customer content never ranks on our domain). Published pages render through **one** clean typographic template (the §2 design
system, light-only is acceptable), customisable later — never per-customer
templates in MVP. Export = Markdown + assets zip, always available. **WordPress:** REST + application password, posts as draft +
Yoast/RankMath meta when detected; credentials encrypted at rest, never logged,
revoked on disconnect. Everything else = copy as Markdown/HTML (always shown).

**Verification:** publish +24h → fetch the live URL, confirm reachable/indexable/
in-sitemap/AI-readable (chips in the day panel). Monday → full re-measure; each
published page gets Working / Too early / Not working against its acceptance
test. A regression is shown, never hidden.

---

## 10. Data model (Supabase, RLS default-deny)

| Table | Key columns |
|---|---|
| `users` | id, email, plan_status(active/past_due/canceled), stripe_customer_id, created_at |
| `sites` | id, user_id, domain, category, competitors jsonb[≤5], mode(autopilot/copilot), veto_hours, publish_time, voice_text, do_not_claim jsonb, created_at |
| `scans` | id, site_id(null for free), domain, tier(free/deep/weekly), status(running/done/degraded), score, drivers jsonb, report jsonb(versioned blob: measurements, questions, answers, market set), cost_cents, created_at |
| `opportunities` | id, site_id, scan_id, type, family, target_query, volume, evidence jsonb, proposed_slug, title, effort, fit_band, acceptance jsonb, status(open/queued/done/dismissed), created_at |
| `drafts` | id, opportunity_id, site_id, state(§9 enum), title, body_md, meta jsonb, grounded_fact jsonb, cost_cents, scheduled_for date, veto_deadline, created_at |
| `publications` | id, draft_id, site_id, destination, live_url, published_at, mode(approved/autopilot), verify jsonb(reachable/indexable/sitemap/ai_readable/checked_at), verdict(working/too_early/not_working), unpublished_at |
| `destinations` | id, site_id, kind(hosted/wordpress), config jsonb(encrypted creds), health(ok/expired/error), created_at |
| `fetches` | id, scan_id, source, cache_key, policy_version, cost_cents, payload jsonb, created_at — **ledger + cache + raw store in one** |
| `leads` | id, scan_id, email(lowercased), consented_at, converted_at, draft_sent_at |

One report blob per scan, no per-section tables. A 10th table needs a rendered
surface that reads it, specified first.

---

## 11. Jobs

| Job | Schedule | Does |
|---|---|---|
| `scan/run` | on demand | The one pipeline; tier is a parameter. Free ≈60s live; deep live; weekly standard |
| `draft/generate` | daily, evening | Next opportunity → pipeline → `in_review`, veto clock starts, daily email |
| `publish/execute` | on approve/expiry | State machine → destination |
| `publish/verify` | +24h | Liveness checks |
| `weekly/refresh` | Mon 06:00 UTC | Weekly scan per active site → re-derive → verdicts → movement email |
| `lead/nurture` | event + delays | Draft email, then ≤3 touches, stops on convert |

Bounds: 5 free scans/IP/h · 1 in-flight/IP · 200 free scans/day · kill switch env
var stops scan+generate+publish · scan limiter fails open, lead capture fails
closed.

## 12. Emails (Resend, one shell, plain-text alt, no LLM prose)

`magic-link` · `report` (free scan summary) · `first-page` (the giveaway draft)
· `draft-ready` (daily: title, why-data, *publishes tomorrow 09:00 unless you say
no*, one veto link) · `published` (live URL + 24h checks) · `weekly` (score
delta, AI answers delta, pages verdicts, next 3 — all values conditional: a
missing number omits its section, never prints 0).

## 13. Payments

Stripe Checkout from the report (scan id in metadata) or any price surface
(scanless — no fabricated scan id). €49/mo flat. **Tax handling is deferred
(owner ruling, 28 Aug): no Stripe Tax at launch** — charge €49, collect the
buyer's country (Stripe does automatically) and VAT ID field on, so the records
exist when registration is set up. This is a known, accepted compliance debt from
customer one; revisit before meaningful EU B2C volume. Webhook
(signature-verified, the only provisioning path): upsert user, create site
(domain null if scanless — asked at setup), stamp lead converted, queue deep
pass, send magic link → `/setup`. Portal for card/cancel; cancel keeps access to
period end; export always.

## 14. Compliance guardrails (build as features)

1. Volume follows supply (§7) — the anti-scaled-content-abuse control.
2. No invented authors (§8).
3. Near-duplicate gate before queueing (§8).
4. No doorway pages (§8).
5. Grounding (§8).
6. Customer is publisher of record: their domain, their identity; `*.reachkit.app` noindex forever (§9).
7. Autopilot rate limits independent of the monthly cap (§9).

We make pages **structurally citable**; we never engineer content to steer what
an assistant recommends (May-2026 spam policy line — no prompt-shaped tricks, no
hidden instructions, in any generated page).

## 15. Env

`DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE
STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID RESEND_API_KEY
DATAFORSEO_LOGIN DATAFORSEO_PASSWORD ANTHROPIC_API_KEY NANO_API_KEY
IP_HASH_SALT KILL_SWITCH OWNER_EMAILS NEXT_PUBLIC_APP_URL`

## 16. Build order

Each milestone ends with a check; a milestone that can't pass its check isn't
done. **Any new surface gets its design artifact approved before its milestone
starts.**

| # | Milestone | Done when |
|---|---|---|
| 1 | Design system + app shell + all §4 screens on fixture data | Every screen pixel-matches the approved artifact, both themes |
| 2 | Measurement engine: fetcher, parsers, drivers, score | Same HTML twice → byte-identical; fixture suite for every driver. **Verify against the live API**: whether Labs `ranked_keywords` on the root domain includes `content.{domain}` subdomain rows (it must, or hosted pages' wins would be invisible to the growth chart — if not, query with subdomain inclusion or add the subdomain as a second tracked target) |
| 3 | Free scan pipeline + report + share + cooldown | Real domain → real report <60s, ≤12¢ ledgered |
| 4 | Questions + AI-Overview matrix + giveaway email + lead capture | 12 SERPs stored with their `ai_overview` references; draft only after email |
| 5 | Stripe + provisioning + setup | Pay → magic link → 3 decisions → deep pass queued |
| 6 | Deep scan + opportunities + calendar (fixture-free) | Real supply fills the calendar; empty days honest |
| 7 | Generation pipeline + draft view + veto | Draft passes all 5 hard rules; ≤45¢ enforced |
| 8 | Hosted CMS + publish state machine + verify | CNAME domain serves a published page; retry never duplicates |
| 9 | Autopilot + daily/weekly jobs + emails | A week runs hands-off; Monday email correct with missing values omitted |
| 10 | WordPress + settings/billing complete | Connect → draft lands with meta; token expiry = state not error |

**Sellable at the end of M4** (free funnel complete) **and chargeable at M7**
(paid loop minus publishing = review + copy). Ship the beta there if draft
quality needs proving before M8–M10.

## 17. Non-goals — do not build

Settings that tune the engine · feature flags · a crawler or sitemap reader ·
LLM-written UI text or emails · a second score · multi-site · approval workflows
/ comments / content calendars beyond §4.6 · images in drafts · backlinks, local,
per-country SERPs · Perplexity (v1.1) · Webflow/Shopify/Ghost/Framer/Notion
(v1.1) · community outreach of any kind.
