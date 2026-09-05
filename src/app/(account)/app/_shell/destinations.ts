// BUILD §4.4 — "nav **Overview / Calendar / Settings**" · "No other navigation."
//
// WO-155 `## Interfaces`, verbatim: "REQ-040 criterion 1 made structural.
// Exactly three, one tuple, consumed by both the sidebar and the mobile tab
// bar — so a fourth cannot appear on one breakpoint only, and cannot appear
// at all without a type change."
//
// The three maps below are keyed by `Destination`, so each is total by
// construction: a fourth member is a compile error in three places at once,
// not a nav entry that silently renders with no address and no name.
import type { CopyKey } from "@/lib/presentation/copy";

export const DESTINATIONS = ["overview", "calendar", "settings"] as const;
export type Destination = (typeof DESTINATIONS)[number];

/** The address each destination is reached at. `ARCHITECTURE.md`'s module
 *  row names them: "`/app` (Overview · Calendar · Settings)" — Overview is
 *  `/app` itself, not a fourth address `/app` redirects to. */
export const DESTINATION_HREF: Record<Destination, string> = {
  overview: "/app",
  calendar: "/app/calendar",
  settings: "/app/settings",
};

/** The registry key each destination's name is spoken from. No renderer
 *  writes a destination's word (BP-018 decision 2: "no component has a
 *  default string"). */
export const DESTINATION_COPY_KEY: Record<Destination, CopyKey> = {
  overview: "shell.nav.overview",
  calendar: "shell.nav.calendar",
  settings: "shell.nav.settings",
};

/** Which destination an app pathname is on, or `undefined` for a path under
 *  `/app` that is none of the three — the draft view (§4.6), say. Overview
 *  is matched exactly, never by prefix, because its address `/app` is the
 *  prefix of both the others; a route under `/app` with no entry here is
 *  simply not current anywhere, which is WO-155 decision 3's safe failure
 *  ("a route added under `/app` with no entry is unreachable by
 *  navigation") rather than a highlight on the wrong destination. */
export function destinationOf(pathname: string): Destination | undefined {
  return DESTINATIONS.find((d) => {
    const href = DESTINATION_HREF[d];
    if (href === DESTINATION_HREF.overview) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}
