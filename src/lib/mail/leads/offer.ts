// BUILD §4.2 — what is on offer, and the arm where nothing is.
//
// The report's free-page card and the giveaway mail read one offer, so the
// card cannot say "page 1 of 6" while the inbox says something else. This
// function returns data and never a rendered string: the card is a surface
// (issue #13) and holds no rule about when it appears, because that rule is
// REQ-010 criterion 6's and stating it twice is how the two come to
// disagree.
//
// `{ offered: false }` is criterion 6 — "no page is offered for this
// domain and no control to have one emailed". It is the **absence of a
// card**, not a card with an empty slot, which is why the false arm carries
// no `title` for a surface to render from.
//
// `volume` and `rival` stay `Measured<T>` all the way out. This function
// coalesces nothing and substitutes nothing: a page found without a rival
// to name comes back `unmeasured`, and the written line that says so is the
// card's (REQ-091 c3). Reading an offer writes nothing and gates nothing —
// every other part of the report is readable whether or not anyone ever
// types an address (criterion 5).
import type { Measured } from "@/lib/measure/measured";
import { readOffer } from "./ports";

export type FirstPageOffer =
  | { offered: false }
  | {
      offered: true;
      /** §8's proposed title — model text, labelled where it renders. */
      title: string;
      /** The N of "page 1 of N". */
      pagesFound: number;
      targetQuery: string;
      volume: Measured<number>;
      rival: Measured<string>;
      format: string;
    };

/** A scan whose offer could not be read is not a scan with no offer. The
 *  card renders nothing either way, but the giveaway must not turn an
 *  unreadable store into `no-page-to-write` and tell a founder their scan
 *  found nothing — so the two are distinguishable here and
 *  `deliverFirstPage` keeps them apart. */
export type OfferRead = { read: true; offer: FirstPageOffer } | { read: false };

export async function readFirstPageOffer(scanId: string): Promise<OfferRead> {
  const result = await readOffer(scanId);
  if (!result.read) return { read: false };
  if (result.page === null) return { read: true, offer: { offered: false } };

  const page = result.page;
  return {
    read: true,
    offer: {
      offered: true,
      title: page.title,
      pagesFound: page.pagesFound,
      targetQuery: page.targetQuery,
      volume: page.volume,
      rival: page.rival,
      format: page.format,
    },
  };
}

/** BP-029's declared entry point, for the surface that renders the card. A
 *  scan whose offer cannot be read shows no card — the same rendering as a
 *  scan with nothing to offer, because there is nothing honest to put in
 *  one — while `deliverFirstPage` reads the fuller answer above. */
export async function firstPageOffer(scanId: string): Promise<FirstPageOffer> {
  const result = await readFirstPageOffer(scanId);
  return result.read ? result.offer : { offered: false };
}
