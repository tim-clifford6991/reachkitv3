// BUILD §4.1 — the one public report address
//
// Resolves `/scan/{domain}`, 308s any non-canonical written form of it to
// the one address for it, renders exactly one arm of the closed state
// union, and marks every response `noindex`. It never answers with a blank
// page, a 404 or an unhandled error: a segment that does not parse is the
// `malformed` arm, not a 404, and a removed report serves its line with
// HTTP 200.
//
// A thin adapter (`ARCHITECTURE.md` rule 1): the parse is `parseDomain`'s,
// the redirect policy is `_address/canonical.ts`'s, the rendering is
// `_address/view.tsx`'s, and what a visit resolves to is
// `_fixture/states.ts`'s until issue #25 replaces it with
// `readCurrentReport()`. This file holds no engine logic and renders no
// module itself.
//
// **No session read, no cookie set, no gate** (REQ-001 c6/c10): there is
// no auth call in this file and none in anything it imports.
//
// **No CDN cache** (WO-282 step 22): the `refused` and `scanning` arms
// depend on the visitor, so the render is not shared. `force-dynamic` plus
// `revalidate = 0` says so to Next and to any proxy in front of it.
//
// **`noindex` twice over** (ADR-002, REQ-001 c8): the meta tag is the
// `metadata` export below, and the `X-Robots-Tag` header is declared for
// this path in `next.config.ts` so it rides on every response the path
// produces, the 308 included. Neither half is enough alone.
import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { env } from "@/lib/config/env";
import { parseDomain } from "@/lib/scan/domain";
import { canonicalRedirect } from "./_address/canonical";
import { AddressView } from "./_address/view";
import type { AddressState } from "./_address/state";
import { fixtureStateFor } from "./_fixture/states";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** ADR-002: report pages are `noindex` forever and in no sitemap. The meta
 *  half of that promise; `src/middleware.ts` carries the header half. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function canonicalUrlFor(domain: string): string {
  return new URL(`/scan/${domain}`, env.NEXT_PUBLIC_APP_URL).toString();
}

/** REQ-001 c4: a segment that does not parse is answered with the
 *  `malformed` arm — one written line and the landing field — never a 404
 *  and never a scan. */
function resolve(rawSegment: string): AddressState {
  const parsed = parseDomain(rawSegment);
  if (!parsed.ok)
    return { kind: "malformed", problem: parsed.problem, value: rawSegment };
  return fixtureStateFor(parsed.domain);
}

export default async function ScanAddressPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<React.JSX.Element> {
  const { domain } = await params;
  const raw = decodeURIComponent(domain);

  // REQ-001 c2: one address per domain. The 308 happens before any arm
  // renders, so no arm is ever served at two URLs.
  const redirectTo = canonicalRedirect(raw);
  if (redirectTo !== null) permanentRedirect(redirectTo.redirectTo);

  const state = resolve(raw);
  // No `Surface` here. ADR-093 decision 6 puts one at every *screen* root,
  // and seven arms are seven screens with seven different band behaviours —
  // a long report that goes two columns at `medium`, and six short panes
  // that never do. `view.tsx` declares each arm's own arms, and the
  // `removed` arm brings its own from `_address/removal.tsx` (#28), so a
  // wrapper here would make two `[data-surface]` roots on that one arm.
  return <AddressView state={state} canonicalUrl={canonicalUrlFor(raw)} />;
}
