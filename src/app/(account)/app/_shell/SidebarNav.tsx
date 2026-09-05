// BUILD §4.4 — "nav **Overview / Calendar / Settings** (Calendar shows item
// count)".
//
// Maps over `DESTINATIONS` — the one tuple, shared with `TabBar` — so a
// fourth destination cannot appear on one breakpoint only (WO-155 decision
// 3). Renders `<a href>`: navigation that works without a client runtime.
//
// REQ-040 c2: "the Calendar destination shows how many are waiting; when
// none are, it shows no count." Zero renders no count at all — not a `0`,
// not an empty badge. The count is `waiting` from the model and belongs to
// Calendar alone: `waiting` counts calendar items awaiting the customer.
"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/presentation/copy";
import { DESTINATIONS, DESTINATION_COPY_KEY, DESTINATION_HREF, destinationOf } from "./destinations";

export function SidebarNav(p: { waiting: number }): React.JSX.Element {
  const current = destinationOf(usePathname());

  return (
    <nav className="rk-nav" data-testid="shell-sidebar-nav">
      {DESTINATIONS.map((destination) => (
        <a
          key={destination}
          href={DESTINATION_HREF[destination]}
          className="rk-navlink"
          data-testid={`shell-navlink-${destination}`}
          aria-current={destination === current ? "page" : undefined}
        >
          <span>{copy(DESTINATION_COPY_KEY[destination])}</span>
          {destination === "calendar" && p.waiting > 0 ? (
            <span className="num rk-count" data-testid="shell-calendar-count">
              {p.waiting}
            </span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}
