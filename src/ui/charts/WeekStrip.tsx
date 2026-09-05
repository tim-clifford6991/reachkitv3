// BUILD §2.4 — the seven-day week strip
//
// §4.5 module 5: "7-day strip (done/today/next)". Each day is
// direct-labelled with its own date, in the mono utility, and with the
// caller's written word for its state — identity is never colour-alone
// (§2.4), so the strip says what it means with the colours removed.
//
// **A day with nothing measured is a labelled empty mark, never a gap.**
// A missing day and a day with nothing on it are different claims and only
// one of them is true. The empty day takes `--sunk` and keeps its date and
// its written mark; it is not red, not warned and not skipped — §2.5's
// third rule ("an intended-empty state does not take `--bad` or
// `--warn`"), applied to the smallest surface in the inventory.
//
// **Seven days can never become six.** `days` is a seven-tuple, so a strip
// with a day dropped out of it has no call shape.
import type React from "react";
import { CHART, CHART_INK, type Box, round, SVG } from "./chart-primitives";
import { SERIES_COLOR } from "./series";
import { ChartFrame, Mark } from "./mark";

/** What the day is. Four states, and none of them is an alarm. */
export type WeekDayState = "done" | "today" | "to-come" | "nothing-measured";

export interface WeekDay {
  /** The date, as the caller's own time zone renders it. */
  readonly date: string;
  readonly state: WeekDayState;
  /** The written word for the state — the caller's, from the copy
   *  registry. No component in this directory owns a string. */
  readonly mark: string;
}

/** Seven, by type. */
export type SevenDays = readonly [WeekDay, WeekDay, WeekDay, WeekDay, WeekDay, WeekDay, WeekDay];

const DAYS = 7;
const BOX: Box = { width: 300, height: 64 };
const GAP = 4;
const CELL_TOP = 6;
const CELL_HEIGHT = 46;
const CELL_RADIUS = 9;
const AXIS_Y = 58;
const CELL_WIDTH = round((BOX.width - (DAYS - 1) * GAP) / DAYS);

/** `--accent-bg` / `--accent-line` are the customer's own accent family,
 *  which is `--chart-you`'s: a done day is theirs. Nothing here reaches a
 *  status colour. */
function cellPaint(state: WeekDayState): { fill: string; stroke: string; strokeWidth: number } {
  switch (state) {
    case "done":
      return { fill: "var(--accent-bg)", stroke: "var(--accent-line)", strokeWidth: 1 };
    case "today":
      return { fill: CHART_INK.surface, stroke: SERIES_COLOR.you, strokeWidth: 2 };
    case "nothing-measured":
      return { fill: CHART_INK.sunk, stroke: CHART_INK.line, strokeWidth: 1 };
    default:
      return { fill: CHART_INK.surface, stroke: CHART_INK.line, strokeWidth: 1 };
  }
}

export function WeekStrip(p: { days: SevenDays; label: string }): React.JSX.Element {
  const x = (i: number): number => round(i * (CELL_WIDTH + GAP));

  return (
    <ChartFrame box={BOX} label={p.label}>
      {p.days.map((day, i) => {
        const paint = cellPaint(day.state);
        return (
          <g key={`day-${day.date}`}>
            <rect
              x={x(i)}
              y={CELL_TOP}
              width={CELL_WIDTH}
              height={CELL_HEIGHT}
              rx={CELL_RADIUS}
              fill={paint.fill}
              stroke={paint.stroke}
              strokeWidth={paint.strokeWidth}
            />
            <text
              className="num"
              x={round(x(i) + CELL_WIDTH / 2)}
              y={26}
              textAnchor={SVG.anchorMiddle}
              fontSize={CHART.labelSize}
              fill={day.state === "today" ? SERIES_COLOR.you : CHART_INK.label}
            >
              {day.date}
            </text>
            <text
              className="num"
              x={round(x(i) + CELL_WIDTH / 2)}
              y={40}
              textAnchor={SVG.anchorMiddle}
              fontSize={CHART.nameSize}
              fill={CHART_INK.quiet}
            >
              {day.mark}
            </text>
          </g>
        );
      })}

      {/* The one axis: the rule the seven days stand on. */}
      <line className="rk-axis" x1={0} y1={AXIS_Y} x2={BOX.width} y2={AXIS_Y} stroke={CHART_INK.axis} strokeWidth={CHART.axisWidth} />

      <g>
        {p.days.map((day, i) => (
          <Mark
            key={`mark-${day.date}`}
            box={BOX}
            tip={`${day.date} · ${day.mark}`}
            x={x(i)}
            y={CELL_TOP}
            width={CELL_WIDTH}
            height={CELL_HEIGHT}
          />
        ))}
      </g>
    </ChartFrame>
  );
}
