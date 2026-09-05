// BUILD §12 · §2.3 — the one numeral formatter both mail bodies share.
//
// Split out of the two renderers (rule 1.1) for the same reason
// `omit.ts` is: a number written one way in the HTML body and another in
// the plain-text body is a defect no single-renderer test can see. Cost of
// reversing: inline it into each renderer — one edit, two copies.
//
// This module deliberately does **not** call `renderMeasured()`
// (`src/lib/presentation/measured.ts`). That renderer's unmeasured arm
// produces the `unmeasured.dash` em dash, which is right on a screen and
// forbidden in a mail: BUILD §12 says a missing number *omits its
// section*. `omit.ts` has already removed every unmeasured block before a
// value reaches here, so this formatter only ever sees the two arms that
// carry one — and it can reach no dash, because it imports none.
import type { Measured } from "@/lib/measure/measured";
import type { StatFormat } from "./types";

/** The per-month suffix §4.1 writes on a search volume ("{vol}/mo").
 *  A unit, not a sentence — it is not the product speaking, it is the
 *  number's own dimension, on the same footing as a currency symbol. */
const PER_MONTH_SUFFIX = "/mo";

function plain(value: number, format: StatFormat): string {
  switch (format) {
    case "integer":
      return String(value);
    case "delta":
      // A measured zero delta is a result: "no movement", written as the
      // number it is. A sign is added only where there is a direction.
      return value > 0 ? `+${value}` : String(value);
    case "perMonth":
      return `${value}${PER_MONTH_SUFFIX}`;
  }
}

/** Formats the value of a block `omit.ts` has already kept. Narrowed by
 *  exclusion, so there is no `zero` branch to delete: a measured zero
 *  takes exactly the same path as any other measured number, which is
 *  what BUILD §12's "never prints 0" rule means in reverse — a zero that
 *  was measured prints. */
export function formatStat(value: Measured<number>, format: StatFormat): string {
  if (value.kind === "unmeasured") {
    // Unreachable through either renderer: `omittedIndexes()` drops this
    // block before it is rendered. Stated as a refusal rather than a
    // fallback, because every fallback here would be a placeholder — the
    // one thing BUILD §12 forbids in place of an omitted section.
    throw new Error(
      "formatStat: an unmeasured value reached the formatter — BUILD §12 omits its section instead."
    );
  }
  return plain(value.value, format);
}
