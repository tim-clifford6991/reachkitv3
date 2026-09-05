// BUILD §2.4 — the two series colours, and nothing else
//
// §2.4, verbatim: "**Two chart colors only:** `--chart-you` (accent) and
// `--chart-rival` (neutral gray). The customer is always the accent;
// everyone else is context. Status colors (ok/warn/bad) are for state,
// never for series."
//
// `Tone` (`src/ui/types.ts`) is the state vocabulary and is deliberately
// **not** imported here. No chart prop in this directory accepts a `Tone`,
// so §2.5's "rival strength is neutral gray, never red" is not a
// convention a reviewer has to catch — there is no prop to break it with.

/** Whose mark this is. The only identity a chart series has. */
export type SeriesKind = "you" | "rival";

/** The one map from identity to paint. Every series stroke and every
 *  series fill in this directory reads its colour from here; a chart that
 *  names a colour of its own is the defect the closed-inventory test looks
 *  for. */
export const SERIES_COLOR: Readonly<Record<SeriesKind, string>> = {
  you: "var(--chart-you)",
  rival: "var(--chart-rival)",
};
