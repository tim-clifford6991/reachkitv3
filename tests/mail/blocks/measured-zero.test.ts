// BUILD §12 — a measured zero is a result, and prints as zero.
import { describe, expect, it } from "vitest";
import { renderBlocksText } from "../../../src/lib/mail/blocks/text";
import { omittedIndexes } from "../../../src/lib/mail/blocks/omit";
import { formatStat } from "../../../src/lib/mail/blocks/format";
import * as f from "../fixtures";

describe("BUILD §12 — a measured zero prints", () => {
  it("renders 0 in every stat format, and is never omitted", () => {
    for (const format of ["integer", "delta", "perMonth"] as const) {
      const blocks = [f.stat(f.num(0), { format })];
      expect(omittedIndexes(blocks)).toEqual([]);
      const { text } = renderBlocksText(blocks);
      expect(text).toContain(`${f.LABEL_TEXT}: ${formatStat(f.num(0), format)}`);
      expect(text).toMatch(/0/);
    }
  });

  it("a zero delta carries no sign — the number is the result, not a direction", () => {
    expect(formatStat(f.num(0), "delta")).toBe("0");
    expect(formatStat(f.num(4), "delta")).toBe("+4");
    expect(formatStat(f.num(-4), "delta")).toBe("-4");
  });

  it("a per-month figure carries its unit", () => {
    expect(formatStat(f.num(0), "perMonth")).toBe("0/mo");
    expect(formatStat(f.num(320), "perMonth")).toBe("320/mo");
  });
});
