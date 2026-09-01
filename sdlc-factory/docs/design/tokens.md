# Design Tokens

- Status: ready
- Source: `BUILD.md` §2.1 (colour, radius, shadow, ring), §2.3 (type and
  numerals), §2.4 (chart constraints), §2.5 (the meaning rules that bind how a
  token may be used). Values are **transcribed**, not derived, except the six
  rows §2.1 explicitly delegates (see "Derived at a stated rule").
- Owning blueprint: BP-018.

> Rule 7.3: **tokens by name only.** A raw hex or a raw px in UI code is a
> defect, whatever its value. If a surface needs a value this file does not
> name, it does not invent one — it raises the gap (see "What `BUILD.md` does
> not state").

`BUILD.md` §2.1, verbatim: *"Three-state theming: bare `:root` = light;
`@media (prefers-color-scheme: dark)` guarded with
`:root:not([data-theme="light"])`; `:root[data-theme="dark"]` for the explicit
toggle. **Never define a color only inside a dark block.**"*

---

## 1. Colour

Every row below exists in `:root`. A dark cell reading *inherits* means
`BUILD.md` §2.1 states no dark value and the light value stands in both themes.

### Surfaces and ink

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#f6f6f9` | `#0e1116` | Page background |
| `--surface` | `#ffffff` | `#161a21` | Card and panel surface; daisyUI `base-100` |
| `--sunk` | `#efeff4` | `#11151b` | Recessed surface; daisyUI `base-200` |
| `--line` | `#eaeaf1` | `#242a34` | Borders and rules; daisyUI `base-300` |
| `--ink` | `#191925` | `#dde3eb` | Primary text; daisyUI `base-content` |
| `--ink-2` | `#5e5e73` | `#8e99aa` | Secondary text |
| `--ink-3` | `#9695a8` | `#69738a` | Provenance and eyebrow text (§2.5: "always quiet") |

### Accent

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--accent` | `#5b4be0` | `#9bb4ff` | The customer's own colour; daisyUI `primary` |
| `--on-accent` | `#ffffff` | `#0e1116` | Text on an accent fill |
| `--accent-bg` | `#eeecfd` | `rgb(155 180 255/.12)` | Accent-tinted fill |
| `--accent-line` | `#ddd8fa` | `rgb(155 180 255/.28)` | Accent-tinted border |

### State — ok / warn / bad

`Tone` is for **state**. §2.4: *"Status colors (ok/warn/bad) are for state,
never for series."* §2.5: *"Red appears only for the customer's problem being
shown to them (blocked, absent, 0/12)."*

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--ok` | `#1f8a6b` | `#7bd8b0` | daisyUI `success` |
| `--ok-bg` | `#e7f6f0` | *derived — see below* | Success fill |
| `--ok-line` | `#d2ede3` | *derived — see below* | Success border |
| `--warn` | `#b8722a` | `#e6b45a` | daisyUI `warning` |
| `--warn-bg` | `#fff3e6` | *derived — see below* | Warning fill |
| `--warn-line` | `#fbe1c6` | *derived — see below* | Warning border |
| `--bad` | `#c0432b` | `#f0907a` | daisyUI `error` |
| `--bad-bg` | `#fdece8` | *derived — see below* | Error fill |
| `--bad-line` | `#f8d5cd` | *derived — see below* | Error border |

**Derived at a stated rule.** `BUILD.md` §2.1's dark block states the three
hues and then, verbatim: `/* + matching -bg/-line at 12%/28% alpha */`. The six
dark values are therefore that rule applied to those three hues — not
invented, and never carried over from light:

| Token | Dark value |
|---|---|
| `--ok-bg` | `rgb(123 216 176/.12)` |
| `--ok-line` | `rgb(123 216 176/.28)` |
| `--warn-bg` | `rgb(230 180 90/.12)` |
| `--warn-line` | `rgb(230 180 90/.28)` |
| `--bad-bg` | `rgb(240 144 122/.12)` |
| `--bad-line` | `rgb(240 144 122/.28)` |

### Series — the only two chart colours

§2.4, verbatim: *"**Two chart colors only:** `--chart-you` (accent) and
`--chart-rival` (neutral gray). The customer is always the accent; everyone
else is context."*

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--chart-you` | `#5b4be0` | `#5f7ff2` | The customer's series. Always the customer, never a rival |
| `--chart-rival` | `#787790` | `#5c6579` | Every rival series. **Neutral gray, never red** (§2.5) |
| `--chart-goal` | `#b8722a` | `#e6b45a` | The goal marker — dashed goal dots, the "at 400 …" footnote pair |

A third series colour does not exist. A rival never takes `--bad`, `--warn` or
`--ok`; a rival is context, not an alarm.

## 2. Radius, shadow, ring

`BUILD.md` §2.1 states these once, in `:root`, and repeats none of them in the
dark block.

| Token | Value | Dark | Used for |
|---|---|---|---|
| `--r-box` | `14px` | inherits | Cards, panels, the day panel |
| `--r-field` | `9px` | inherits | Inputs, buttons, chips |
| `--r-pill` | `999px` | inherits | Badges, verdict chips, stage chips |
| `--shadow-card` | `0 1px 3px rgb(24 24 48/.045)` | inherits — **unstated for dark**, see §7 | Card elevation |
| `--ring-accent` | `0 0 0 3px rgb(91 75 224/.18)` | inherits — **unstated for dark**, see §7 | Focus ring; today's ringed cell in the calendar grid |

## 3. daisyUI 5 slot mapping

`BUILD.md` §2.1, verbatim: *"Map these onto daisyUI's theme slots (`base-100`←
surface, `base-200`←sunk, `base-300`←line, `base-content`←ink, `primary`←accent,
`success/warning/error`←ok/warn/bad) in the Tailwind config so stock daisyUI
classes just work."*

| daisyUI slot | Token |
|---|---|
| `base-100` | `--surface` |
| `base-200` | `--sunk` |
| `base-300` | `--line` |
| `base-content` | `--ink` |
| `primary` | `--accent` |
| `success` | `--ok` |
| `warning` | `--warn` |
| `error` | `--bad` |

A daisyUI slot carrying a literal colour rather than a variable reference is a
second home for a value that already has one (rule 2.4).

## 4. Type and numerals

`BUILD.md` §1 fixes the two families; §2.3 fixes the scale. Both are
self-hosted via `@fontsource` — no third-party font request, because BP-004
renders these same fonts from a customer's own domain.

| Token | Value | Used for |
|---|---|---|
| `--font-ui` | Plus Jakarta Sans | Every non-numeric string |
| `--font-mono` | JetBrains Mono | **Every numeral, date, URL, search query and code-like string**, always with `tabular-nums` |

| Role | Value (§2.3, §2.5) |
|---|---|
| Heading weight | 700–800 |
| Heading letter-spacing | `−0.02em` |
| Heading wrapping | `text-wrap: balance` |
| Body | `15px` / `1.55` |
| Eyebrow (uppercase section label) | `10.5–11px` |
| Explanatory line under a card's answer (§2.5) | `11–12px`, dim (`--ink-3`) |

Two absolutes, both from §2.3:

- **The numeral rule is mechanical.** One utility applies `--font-mono` *and*
  `tabular-nums` together; a component cannot apply one without the other. A
  numeral rendered in the UI font is a defect.
- **No emoji anywhere in the product.** Not in a component, not in copy, not in
  a chart label.

## 5. Chart constraints (§2.4)

These are bounds, not single values — §2.4 states ranges and they are the law
as ranges. A chart asserts against the bound, not against a token name.

| Constraint | Value |
|---|---|
| Series colours | Exactly two: `--chart-you`, `--chart-rival` |
| Axes | One axis per chart |
| Line weight | `2–2.5px` |
| Endpoint dot | `3.5–5px`, with a `--surface`-coloured ring |
| Gridlines | Faint, at 2–3 values |
| Tooltip | On every mark; fixed-position, ink-on-bg, mono |
| Labelling | Every bar and point **direct-labelled** (name + value). Identity is never colour-alone; no legend-only mode |
| Implementation | Inline SVG, hand-sized viewBoxes. No chart library |
| Inventory | Closed at five — see `components.md`. A sixth form is a design-artifact approval first |

## 6. The meaning rules that bind token use (§2.5)

A palette does not enforce meaning. These four rules bind how the tokens above
may be spent, and two of them are the ones a token table loses:

1. **Every card leads with the answer, not the metric** — a verdict chip, a big
   mono number with its delta badge, or a filled/empty visual. The explanatory
   line is one short written sentence, 11–12px, dim.
2. **Provenance is always visible but always quiet** — `--ink-3`, mono, small.
3. **An empty queue is a success state.** An empty or degraded state is
   designed, never blank, and an intended-empty state does **not** take `--bad`
   or `--warn`. A measurement that failed says so in one written sentence.
4. **Rival strength is neutral gray, never red.** Red is only ever the
   customer's own problem shown to them — blocked, absent, `0/12`.

Where the palette alone would let rules 3 and 4 be broken, `components.md`
carries the counter-constraint in the component's own `States` cell. Two are
worth naming here because a token table is exactly where they get lost:

- `Alert` and `Badge` both take a `Tone`, and nothing in the type system stops
  a caller passing `bad` to an empty-queue alert. **The palette permits the
  defect; only a call-site test refuses it.** Every data view's empty state is
  registered with its required tone in `components.md`.
- `--chart-rival` is a token any UI code can name, and a rival series is
  structurally protected (the rival props accept no `Tone` at all) — but a
  rival rendered as a `Badge` or a table cell is *not*. A rival's strength
  outside a chart takes `neutral`, never `bad`.

## 7. What `BUILD.md` does not state

Recorded here rather than filled. A UI work order that needs one of these
raises it; nobody guesses a value (rule 1.2).

| Gap | What is missing | Who it bites |
|---|---|---|
| **Spacing scale** | §2 names no spacing token at all. Only three fixed dimensions appear anywhere, and all three are in §4, not §2.1: the sidebar at `222px` (§4.4), the day panel at `290px` (§4.6), and the calendar grid's `repeat(7, minmax(0, 1fr))` (§4.6, *"the minmax is load-bearing"*). Rule 7.3 forbids raw px in UI code, so these three need token names before `Sidebar`, `DayPanel` and `CalendarGrid` can be written. Proposed below. | WO-033, WO-034, WO-155, WO-167, WO-168 |
| **Dark `--shadow-card`** | The light value is tuned for a light background (`rgb(24 24 48/.045)`) and is invisible on `#0e1116`. §2.1 states no dark replacement and no rule for deriving one, unlike the `-bg`/`-line` case | Every card in dark mode |
| **Dark `--ring-accent`** | Same: `rgb(91 75 224/.18)` is the light accent at 18%; the dark accent is `#9bb4ff`. §2.1 states neither a dark value nor a derivation rule | Focus rings, today's calendar ring |
| **Heading size scale** | §2.3 fixes heading *weight*, *tracking* and *wrapping*, and fixes body and eyebrow sizes — but names no size for h1…h4. "Big mono number" (§2.5) has no size either | Every screen head; the score in the verdict strip |
| **Token delivery into email** | WO-101/103 require the mail shell and block renderer to use "BP-018's named tokens only", with a test that the frame emits no colour literal. CSS custom properties are not reliably supported by mail clients, so an email that renders correctly needs literal values inline. §2 states no build-time token→literal path. **This is a contract to settle, not a value to guess** | WO-101, WO-102, WO-103, WO-113 |

### Proposed layout tokens

Status `proposed` — usable once approved (duty 3). The **values** are
transcribed from `BUILD.md` §4; the **names** are the system's (rule 1.1,
internal names). Reversal cost: three CSS lines and their call sites.

| Token | Value | Source | Used for |
|---|---|---|---|
| `--w-sidebar` | `222px` | §4.4: *"Left sidebar (222px, sticky)"* | `Sidebar` width |
| `--w-day-panel` | `290px` | §4.6: *"Day panel (290px, sticky, beside the grid — not a drawer)"* | `DayPanel` width |
| `--grid-week` | `repeat(7, minmax(0, 1fr))` | §4.6: *"Mon–Sun columns (`repeat(7,minmax(0,1fr))` — the minmax is load-bearing)"* | `CalendarGrid` columns |
