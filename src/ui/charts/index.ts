// BUILD §2.4 — the chart barrel
//
// Exactly the five `CHART_INVENTORY` names, plus the inventory itself so
// the closure has one source. A sixth chart has nowhere to be exported
// from; a sixth `.tsx` in this directory has nowhere to hide, because the
// guard reads the directory too.
export { GrowthLine } from "./GrowthLine";
export type { GrowthWeek } from "./GrowthLine";
export { PresenceBars } from "./PresenceBars";
export type { PresenceBar } from "./PresenceBars";
export { AiDotMatrixChart } from "./AiDotMatrixChart";
export type { AiDotMatrixCellState, AiDotMatrixRow } from "./AiDotMatrixChart";
export { RivalSparkline } from "./RivalSparkline";
export type { RivalSparklineProps } from "./RivalSparkline";
export { WeekStrip } from "./WeekStrip";
export type { SevenDays, WeekDay, WeekDayState } from "./WeekStrip";

export { CHART_INVENTORY } from "./inventory";
export type { ChartName } from "./inventory";
export { SERIES_COLOR } from "./series";
export type { SeriesKind } from "./series";
