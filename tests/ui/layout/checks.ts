// tests/ui/layout/checks.ts
//
// ADR-093 decision 6, checks 1-4, quoted in WO-269 `## Test plan`:
// "asserting: no horizontal document scroll; every border box contained in
// its containing block's padding box; `scrollWidth <= clientWidth` and
// `scrollHeight <= clientHeight` on every text-bearing element outside the
// declared truncation allow-list, with a truncated **value** failing
// whether allow-listed or not; and computed `font-size` at or above the
// floor."
//
// Each function below is closure-free — it references only DOM globals
// (`document`, `window`, `getComputedStyle`) and its own parameters, and
// every helper it needs is declared *inside* its own body. That is what
// lets one definition run unchanged in two hosts: called directly, in
// process, against the jsdom `ui` project's global `document` (WO-269 step
// 1 — the demonstration that a DOM with no layout engine makes every metric
// these checks read return `0`, so all four report nothing on a page that
// overflows on purpose); and passed to Playwright's `page.evaluate()`,
// which serialises a function's own source text and re-runs it inside a
// real Chromium tab, where a reference to a sibling function declared
// elsewhere in this module would be a `ReferenceError`.
export interface Offender {
  check: string;
  element: string;
}

// design/tokens.md §4: "`--font-mono` … Every numeral, date, URL, search
// query and code-like string." Check 3 reads this name off the computed
// `font-family`, mechanically, rather than trusting an allow-list to say
// whether a clipped string is a value (ADR-093 decision 6 point 3).
export const MONO_FONT_FAMILY = "JetBrains Mono";

// Both empty at cut (WO-269 file plan): a surface that declares its own
// scroll container, or its own registered truncation, adds its own row —
// never a default.
export const SCROLL_CONTAINER_ALLOWLIST: readonly string[] = [];
export const TRUNCATION_ALLOWLIST: readonly string[] = [];

/** Check 1 — no horizontal document scroll. */
export function checkNoHorizontalScroll(): Offender[] {
  function describe(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    return `${tag}${id}`;
  }
  const se = document.scrollingElement ?? document.documentElement;
  if (se.scrollWidth > window.innerWidth) {
    return [{ check: "no-horizontal-scroll", element: describe(se) }];
  }
  return [];
}

/** Check 2 — containment: every border box inside its containing block's padding box.
 *  Takes one object argument (rather than positional parameters) so the same
 *  function reference can be handed to Playwright's `page.evaluate(fn, arg)`,
 *  which passes exactly one argument through. */
export function checkContainment(opts: {
  scrollContainerAllowlist: readonly string[];
}): Offender[] {
  const { scrollContainerAllowlist } = opts;
  function describe(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = el.getAttribute("class");
    const clsPart = cls ? `.${cls.trim().split(/\s+/).join(".")}` : "";
    return `${tag}${id}${clsPart}`;
  }
  function matchesAny(el: Element, selectors: readonly string[]): boolean {
    return selectors.some((sel) => el.matches(sel));
  }

  const offenders: Offender[] = [];
  const EPS = 0.5;
  const all = Array.from(document.querySelectorAll("*"));
  for (const el of all) {
    const parent = el.parentElement;
    if (!parent) continue;
    if (matchesAny(parent, scrollContainerAllowlist)) continue;
    // ADR-093 decision 6 point 2 speaks of an element's *border box*. An
    // element that generates no box at all — `display: none`, which is
    // every `<script>`, `<head>` child and `[hidden]` placeholder the
    // framework writes into `<body>` — has none to contain, and
    // `getBoundingClientRect()` reports it as a 0×0 rect at the origin,
    // which lies outside any parent carrying a margin (issue #62: the
    // landing's four "offenders" were Next.js's own empty hidden `<div>`
    // and three `<script>` tags, against `<body>`'s 8px UA margin). No box,
    // nothing to measure — skipped, never reported.
    if (el.getClientRects().length === 0) continue;
    const box = el.getBoundingClientRect();
    const pbox = parent.getBoundingClientRect();
    if (
      box.left < pbox.left - EPS ||
      box.right > pbox.right + EPS ||
      box.top < pbox.top - EPS ||
      box.bottom > pbox.bottom + EPS
    ) {
      offenders.push({ check: "containment", element: describe(el) });
    }
  }
  return offenders;
}

/** Check 3 — no clipping and no truncation; a value is never saved by an
 *  allow-list. One object argument, for the same reason as check 2. */
export function checkNoClippingOrTruncation(opts: {
  truncationAllowlist: readonly string[];
  monoFontFamily: string;
}): Offender[] {
  const { truncationAllowlist, monoFontFamily } = opts;
  function describe(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = el.getAttribute("class");
    const clsPart = cls ? `.${cls.trim().split(/\s+/).join(".")}` : "";
    const text = (el.textContent ?? "").trim().slice(0, 40);
    return `${tag}${id}${clsPart}${text ? ` "${text}"` : ""}`;
  }
  function matchesAny(el: Element, selectors: readonly string[]): boolean {
    return selectors.some((sel) => el.matches(sel));
  }
  function isTextBearing(el: Element): boolean {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3 && (node.textContent ?? "").trim() !== "") return true;
    }
    return false;
  }

  const offenders: Offender[] = [];
  const all = Array.from(document.querySelectorAll("*"));
  for (const el of all) {
    if (!isTextBearing(el)) continue;
    const clipped = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    if (!clipped) continue;
    const allowListed = matchesAny(el, truncationAllowlist);
    const family = getComputedStyle(el).fontFamily || "";
    const isValue = family.toLowerCase().includes(monoFontFamily.toLowerCase());
    if (!allowListed || isValue) {
      offenders.push({ check: "no-clipping-or-truncation", element: describe(el) });
    }
  }
  return offenders;
}

/** Check 4 — the type floor. Reads `--t-floor` from `:root`; never defaults. */
export function checkTypeFloor(): Offender[] {
  function describe(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = el.getAttribute("class");
    const clsPart = cls ? `.${cls.trim().split(/\s+/).join(".")}` : "";
    const text = (el.textContent ?? "").trim().slice(0, 40);
    return `${tag}${id}${clsPart}${text ? ` "${text}"` : ""}`;
  }
  function isTextBearing(el: Element): boolean {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3 && (node.textContent ?? "").trim() !== "") return true;
    }
    return false;
  }

  const floorRaw = getComputedStyle(document.documentElement)
    .getPropertyValue("--t-floor")
    .trim();
  if (!floorRaw) {
    return [{ check: "type-floor", element: ":root (no --t-floor declared)" }];
  }
  const floor = parseFloat(floorRaw);
  const offenders: Offender[] = [];
  const all = Array.from(document.querySelectorAll("*"));
  for (const el of all) {
    if (el.closest("svg")) continue; // ADR-093 decision 3's SVG viewBox exemption.
    if (!isTextBearing(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (Number.isFinite(size) && size < floor) {
      offenders.push({ check: "type-floor", element: describe(el) });
    }
  }
  return offenders;
}
