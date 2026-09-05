// BUILD §2.4 — the inventory, closed
//
// §2.4, verbatim: "The chart inventory is closed: growth line (Overview),
// presence bars (report), AI dot-matrix (report + Overview), rival-gap
// sparklines (Overview), 7-day week strip (Overview). A new chart form is
// a design-artifact approval first."
//
// This list is that clause as data. The barrel is checked against it, and
// so is the directory: a sixth chart fails the guard whether it is
// exported or not, which is what makes the closure real rather than
// remembered.

/** The five, in the order §2.4 names them. */
export const CHART_INVENTORY = [
  "GrowthLine",
  "PresenceBars",
  "AiDotMatrixChart",
  "RivalSparkline",
  "WeekStrip",
] as const;

export type ChartName = (typeof CHART_INVENTORY)[number];
