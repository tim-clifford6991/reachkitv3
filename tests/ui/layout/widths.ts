// tests/ui/layout/widths.ts
//
// BP-018 `## NFR budget`: "renders each at five widths — 320, the three
// bands, and each boundary minus one pixel." ADR-093 decision 6: "Each
// route is rendered at five widths: the floor (320), each of the three
// bands, and each boundary minus one pixel, which is where the off-by-one
// lives." No literal here but the floor's own provenance, which is
// `bands.ts`'s (`BAND_MIN`), not this file's to restate.
import { BAND_MIN } from "@/ui/layout/bands";

export function widths(): readonly [number, number, number, number, number] {
  return [
    BAND_MIN.compact,
    BAND_MIN.medium - 1,
    BAND_MIN.medium,
    BAND_MIN.wide - 1,
    BAND_MIN.wide,
  ];
}
