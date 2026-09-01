# Component Registry

> Rule 7.3: UI code may use registered components only. A new one enters as
> `proposed` with its data contract and states, and needs sign-off before use.
> A second component overlapping an existing one's purpose is flagged here
> and blocked via a `blocked-by` edge on its owning BP node, reasoning in
> that BP's own body — this table has no body of its own to hold one.

**Status vocabulary.** `proposed` → `approved`. A row goes to `approved` when a
preview carrying that component is signed off, and not before (design-system
skill, step 3). **Every row below is `proposed`**: no preview has been drawn,
so nothing here is approved yet.

**Two closed sets, plus their surfaces.** `BUILD.md` §2.2: *"daisyUI components
only — no bespoke widgets."* Custom CSS is admitted for exactly five things:
*"the calendar grid, the day panel, the AI dot-matrix, chart SVGs, and the
sidebar — nothing else."* §2.4 closes the chart inventory at five.

**No component holds copy.** BP-018 decision 2: every label, empty state and
tooltip is a **required prop**. A default string is a product sentence nobody
wrote and nobody can find. "Required" in the contracts below means exactly
that — no fallback, no placeholder, no sensible default.

---

## 1. daisyUI primitives (15) — BP-018

| Component | Status | Data contract | States | Owning BP |
|---|---|---|---|---|
| `Btn` | proposed | daisyUI `btn` (+`primary`/`ghost`/`sm`/`block`). `label` required. Also carries the copy-to-clipboard affordance — no separate copy component exists | default · disabled · in-flight (a submit that is disabled while posting) | BP-018 |
| `Card` | proposed | `card`/`card-body`/`card-title`. Title slot takes a **verdict node**, not a metric label — §2.5: the card leads with the answer | default · degraded (one written line in place of a missing section — never an empty card, never a spinner) | BP-018 |
| `Badge` | proposed | `badge` (+`primary`/`success`/`warning`/`error`/`ghost`), keyed by `Tone`. **Requires a text child** — a tone alone may never carry meaning | default | BP-018 |
| `Alert` | proposed | `alert`, four tones. `message` required; no default empty-state sentence | default. **An intended-empty state takes `neutral` or `ok`, never `bad`/`warn`** (§2.5: an empty queue is a success state) | BP-018 |
| `Stat` | proposed | `stats`/`stat`. Value renders through the mono numeral utility. One headline number per module; every value carries its delta or its goal, never bare | measured · measured-zero (prints `0`) · unmeasured (prints `—` plus one written line naming the reason) | BP-018 |
| `Tabs` | proposed | `tabs`, boxed + bordered. Every tab label required | default · selected | BP-018 |
| `Table` | proposed | `table` (+`zebra`), **always inside an `overflow-x-auto` wrap** — the wrap is part of the component, not the caller's job | rows · empty (caller-supplied written line) · **never a skeleton** | BP-018 |
| `Progress` | proposed | `progress`. **Determinate only** — a caller cannot request an indeterminate bar. This is also the three driver mini-bars of the report's header strip (§4.1); mini-bars are *not* a sixth chart | default | BP-018 |
| `Toggle` | proposed | `toggle`. Label required; no default on/off wording | on · off · disabled | BP-018 |
| `Steps` | proposed | `steps`. **Each step's label required** — this is what the scan's named stages render through, so an unlabelled step cannot exist (REQ-003 c1: never an unlabelled spinner) | pending · active · done | BP-018 |
| `Join` | proposed | `join`. Layout only | — | BP-018 |
| `Collapse` | proposed | `collapse`. Summary text required. Server-rendered body, not a lazy fetch (REQ-009 c6 is readable without JavaScript) | collapsed · expanded | BP-018 |
| `Input` | proposed | `input`. Placeholder **and** label required, never defaulted | default · invalid (one written line, value intact) · disabled | BP-018 |
| `Divider` | proposed | `divider`. Layout only | — | BP-018 |
| `Kbd` | proposed | `kbd`. Renders through the mono utility — a code-like string under §2.3. **Inline only**; it is not a code block (see §4) | — | BP-018 |

## 2. Custom surfaces (4) — BP-018

The only places custom CSS is admitted, alongside chart SVGs.

| Component | Status | Data contract | States | Owning BP |
|---|---|---|---|---|
| `Sidebar` | proposed | Destinations as a **required prop** (the three destinations are BP-037's tuple, not this component's); publishing-state line as a required node. Width `--w-sidebar`. Names no destination and no state wording of its own | default · a destination with a count · a destination with no count (`0` renders no count at all) | BP-018 |
| `AiDotMatrix` | proposed | Cells with a **required label each** and **three cell states, not two** — see §4, gap 1. Row identity (`you` / `rival`) is part of the contract because §4.1 rings the customer's own empty row and fills rivals' gray. No legend-only mode; a written count renders alongside, caller-supplied | cited · not-cited · **muted** (a question with no AI answer — §6.2: *"never as a miss"*) | BP-018 |
| `CalendarGrid` | proposed | One entry per date: `date`, `stage`, `tone`, **`label` required** — a day can never render as a coloured cell alone. Columns `--grid-week`. Dates render mono. Knows nothing of what a stage means and **performs no padding**: an empty day is an absent entry the caller decides about | filled day · empty day (caller's one written line) · today (ringed accent) · **never a padded placeholder** (§4.6: *"the calendar is never padded"*) | BP-018 |
| `DayPanel` | proposed | Required heading node, required account node, actions slot. Supplies none of them and offers **no default action**. Width `--w-day-panel`; sticky beside the grid, **not a drawer** (§4.6) | page selected · no page (the date's one account, no publish/approve action) | BP-018 |

## 3. The closed chart inventory (5) — BP-018

§2.4: *"The chart inventory is closed … A new chart form is a design-artifact
approval first."* Every chart obeys the §2.4 constraints in `tokens.md` §5:
two series colours, direct labels on every mark, one axis, inline SVG.

| Component | Status | Data contract | States | Owning BP |
|---|---|---|---|---|
| `GrowthLine` | proposed | Weekly points, each with its **own measurement date**. **Must accept a gapped series** — an unmeasured week is a break with that week's own account beside it; never carried forward, never interpolated. Area + line in `--chart-you`, endpoint labelled | series · gapped series · **no-measurement** (one written line carrying the first-due date, in place of the chart) | BP-018 |
| `PresenceBars` | proposed | One bar per domain, direct-labelled with name and value. Customer in `--chart-you`, every rival in `--chart-rival`. No legend-only mode | bars · zero for the customer (`0` is a measurement, rendered, never an error) | BP-018 |
| `AiDotMatrixChart` | proposed | The chart form of `AiDotMatrix` over the **same cell type, imported and never re-declared** (rule 7.1: one capability, one shape). Adds axes, tooltip and the shared primitives | as `AiDotMatrix`, plus dashed goal dots where a goal exists | BP-018 |
| `RivalSparkline` | proposed | Per rival: name, falling series, endpoint. **The props accept no `Tone` at all**, so §2.5's "rival strength is neutral gray, never red" cannot be broken by a prop. Two arms: absolute (rivals' counts beside the customer's own) and ratio | absolute (used while the customer's count is 0 — **never a ratio**, §6.6: a division by zero reads as broken) · ratio (unlocks at ranked ≥ 10) | BP-018 |
| `WeekStrip` | proposed | Seven days, each direct-labelled with its date through the mono utility, in the customer's own time zone | done · today · to-come · **a day with nothing measured renders as a labelled empty mark, never a gap** | BP-018 |

## 4. Consumed by a work order, declared by no blueprint

Each row is a gap someone must close before the naming work order's preview can
be drawn. Registered `proposed` so the gap is visible, not so it is settled.
None may be used until approved.

| # | Component / contract | Who consumes it | The gap | Owning BP |
|---|---|---|---|---|
| 1 | `AiDotMatrix` **three-state cell + row identity** | WO-033 declares the cells two-state (`{ label, filled }`) | §4.1 needs three: *"rivals' cited rows filled gray, customer's row empty red-ringed … a no-AI-answer question = muted cell"*, and §6.2 repeats *"render a no-AI-answer question as a muted cell, never as a miss."* A boolean cannot hold three states, and it cannot say whose row it is — so the red ring on the customer's own absent row is unexpressible and a muted cell collapses into a miss. **This is a defect in the contract, not a styling preference** | BP-018 (contract widening, not a new component) |
| 2 | `Textarea` | WO-172 `Editor.tsx` | §4.6 fixes the shape by owner ruling: *"Edit = Markdown textarea with a live preview pane (owner ruling, 28 Aug) … no rich-text editor."* §2.2's set has `input` and no multi-line control, and BP-018's public interface declares none. The draft editor cannot be built from the registered set | none — needs a BP-018 row |
| 3 | Code block (`CodeBlock`) | WO-066 (the robots lines), WO-172 `CopyOut` | §4.1: *"the robots lines verbatim in a code block"*, and REQ-009 c2 requires them verbatim and copyable. `Kbd` is an inline key cap, not a block. §2.2's custom-CSS allowance lists five surfaces and a code block is not among them, so it is neither a registered primitive nor an admitted custom | none — needs a BP-018 row |
| 4 | An indeterminate "still running" affordance | WO-153 `Waiting.tsx` | The waiting frame *"renders **no** elapsed, estimate, countdown, clock or percentage"* — so `Progress` (determinate only, by WO-031's own rule) cannot serve it, and REQ-003 c1 forbids *"an unlabelled spinner or an indeterminate bar alone."* Nothing registered renders motion without a number. `Steps` covers the *scan* progress (named stages); the deep-pass waiting frame has named stages too, so `Steps` **may** be the answer — but that is a decision, not an omission to paper over | none — resolve to `Steps` or add a row |
| 5 | `TabBar` (narrow-viewport nav) | WO-155 | §4.4: *"Mobile: sidebar hidden, top tabs."* BP-018 admits custom CSS for *"the sidebar"* and registers `Tabs`, but declares no tab bar. If `TabBar` is a shell-local composition over registered `Tabs` needing no custom CSS, no row is needed and the boundary should say so; if it needs custom CSS it is a sixth custom surface §2.2 does not admit | none — architect's boundary call |

**Not gaps, recorded so three surfaces do not each mint one:**

- *Copy-to-clipboard control* — WO-066, WO-068 (copy link) and WO-172
  (`CopyOut`) each need one. It is `Btn`. No `CopyButton` is registered and none
  should be.
- *Report header driver mini-bars* — §4.1 module 1. `Progress`, not a sixth
  chart form. Registered in the `Progress` row above so a chart is not minted
  for them.
- *Stage chip, verdict chip, band badge, claim badge, source chip* — all
  `Badge`, each with its required text child.
- *Surface compositions* — `MonthGrid`, `StageFilter`, `AlertList`,
  `DayPanelView`, `WhyThisPage`, `ScoreTile`, `AiAnswersTile`,
  `PagesPublishedTile`, `RivalModule`, `GrowthModule`, `SidebarNav`,
  `DomainBlock`, `PublishingCard`, `SetupForm`, `ReportView`, `RemovedView`,
  and the settings panels are **screen compositions over registered
  components**, owned by their own surface blueprints. They are not registry
  rows and must not become any.

## 5. Preview state

No preview exists. `sdlc-factory/docs/design/previews/` holds only `.gitkeep`.
Thirty-three work orders carry `ui: yes` and each needs its own signed preview
before implementation (rule 7.3, step 2–3). Every row above moves to `approved`
as the preview carrying it is signed.
