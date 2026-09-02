/**
 * The route index. One line each on what it shows and what is unsigned
 * about it — the same two facts the index page prints.
 */
export type RouteKind = "sheet" | "walk";

export type PreviewRoute = {
  href: string;
  short: string;
  shows: string;
  unsigned: string;
  kind: RouteKind;
};

export const ROUTES: readonly PreviewRoute[] = [
  {
    href: "/tokens",
    short: "tokens",
    kind: "sheet",
    shows:
      "The WO-029 specimen as live code: every token in the running theme, the four ruled values, the type roles at their real letterforms, the numeral rule, the chart bounds.",
    unsigned:
      "WO-029 + WO-030. A signature releases both and makes this the specimen every later preview is read against. It flips no components.md row — it registers no component.",
  },
  {
    href: "/primitives",
    short: "primitives",
    kind: "sheet",
    shows:
      "The WO-031 sheet: all fifteen registered daisyUI primitives, every state components.md records, plus the three states it records as NOT registered.",
    unsigned:
      "WO-031 + WO-032. A signature flips all fifteen §1 rows from proposed to approved.",
  },
  {
    href: "/surfaces",
    short: "surfaces",
    kind: "sheet",
    shows:
      "The WO-033 sheet: Sidebar, CalendarGrid, DayPanel, AiDotMatrix — the ways-through slot in all three route cases, the never-padded grid with its four empty-day accounts.",
    unsigned:
      "WO-033 + WO-034. A signature flips all four §2 rows, makes the three layout tokens law, and closes §4 gaps 1 and 7.",
  },
  {
    href: "/charts",
    short: "charts",
    kind: "sheet",
    shows:
      "The WO-035 sheet: the five closed chart forms, the gapped pair drawn together, the three-state cell with the ring on the customer's own absent row.",
    unsigned:
      "WO-035 + WO-036. A signature flips all five §3 rows and closes §4 gap 6 or refuses it. No sixth chart form is added.",
  },
  {
    href: "/walk/report",
    short: "walk · report",
    kind: "walk",
    shows: "The free report at /scan/{domain} — BUILD §4.1's six modules, in order.",
    unsigned:
      "Assembled from registered components for review. NOT a signed preview of any work order, and no work order is released by looking at it.",
  },
  {
    href: "/walk/setup",
    short: "walk · setup",
    kind: "walk",
    shows: "Setup — BUILD §4.3's three decisions and one submit, plus the deep-pass progress screen.",
    unsigned:
      "Assembled from registered components for review. NOT a signed preview of any work order.",
  },
  {
    href: "/walk/app/overview",
    short: "walk · overview",
    kind: "walk",
    shows: "The app's default view — BUILD §4.5's five modules, inside the real shell.",
    unsigned:
      "Assembled from registered components for review. NOT a signed preview of any work order.",
  },
  {
    href: "/walk/app/calendar",
    short: "walk · calendar",
    kind: "walk",
    shows: "BUILD §4.6 — stage filters, the never-padded month grid, and the day panel open beside it.",
    unsigned:
      "Assembled from registered components for review. NOT a signed preview of any work order.",
  },
  {
    href: "/walk/draft",
    short: "walk · draft",
    kind: "walk",
    shows:
      "The draft view behind 'Read the full page' — grounded-fact highlight with its source line, claim-check badge, and the Markdown edit pane.",
    unsigned:
      "Assembled from registered components for review, and it spends two PROPOSED additions (Textarea, CodeBlock). NOT a signed preview of any work order.",
  },
];
