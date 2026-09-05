// BUILD §4.1 module 5 — the free page card
//
// Page 1 of N: its title, the search it targets, the rival it beats, its
// format, and the one control that trades an email address for the
// finished draft. The draft itself is generated only *after* the address
// is submitted (§4.2) — this card offers the page, it does not contain it.
//
// The title is model text and reaches the screen only through
// `renderGenerated`, which cannot be called without the identity of the
// page the text belongs to and returns the label and the text together, so
// the card cannot show the title and drop the "proposed" label
// (REQ-093 c2).
import type React from "react";
import { Badge, Btn, Card } from "@/ui/components";
import { copy } from "@/lib/presentation/copy";
import { renderGenerated } from "@/lib/presentation/generated";
import type { FreePageSection } from "@/lib/scan/report";
import { Num } from "../_address/measured";

function Row(p: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="border-base-300 grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b py-2 last:border-b-0">
      <dt className="text-xs opacity-60">{p.label}</dt>
      <dd>{p.children}</dd>
    </div>
  );
}

export function FreePageCard(p: { section: FreePageSection }): React.JSX.Element {
  const { section } = p;
  const title = renderGenerated(section.title, {
    state: "proposed",
    opportunityId: section.opportunityId,
    title: section.title,
    slug: section.slug,
  });

  return (
    <Card
      state="default"
      title={
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span>{copy("free-page.title")}</span>
          <Badge tone="accent">{copy("free-page.of", { total: String(section.totalPages) })}</Badge>
        </div>
      }
    >
      <p className="text-xs opacity-60">{title.label}</p>
      <p className="font-bold">{title.text}</p>
      <dl className="flex flex-col">
        <Row label={copy("free-page.row.target")}>
          <Num>
            {copy("free-page.target.value", {
              keyword: section.target.keyword,
              volume: String(section.target.volume),
            })}
          </Num>
        </Row>
        <Row label={copy("free-page.row.beats")}>
          {section.beats === null ? (
            <span>{copy("place.report.first-page.rival")}</span>
          ) : (
            <Num>{section.beats}</Num>
          )}
        </Row>
        <Row label={copy("free-page.row.format")}>
          <Num>{section.format}</Num>
        </Row>
      </dl>
      <Btn label={copy("free-page.submit")} variant="primary" block />
    </Card>
  );
}

/** REQ-004 c10/c11: a scan that found no opportunity says so in one
 *  written line rather than showing an empty card. */
export function FreePageAbsent(): React.JSX.Element {
  return <Card state="degraded" title={copy("free-page.title")} degradedLine={copy("free-page.absent")} />;
}
