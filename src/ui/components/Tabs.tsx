// src/ui/components/Tabs.tsx
//
// `components.md` §1, verbatim: "`tabs`, boxed + bordered. Every tab label
// required" | "default · selected".
//
// Each tab's `label` is a required field of its own array entry, so a tab
// with no label cannot be constructed. `selectedId` is required (no default
// selection is invented by this component).
"use client";

import type React from "react";

export interface TabItem {
  id: string;
  /** Required — no default tab wording exists. */
  label: string;
}

export function Tabs(p: {
  tabs: TabItem[];
  selectedId: string;
  onSelect?: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="tabs tabs-boxed tabs-border" role="tablist">
      {p.tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className={`tab${tab.id === p.selectedId ? " tab-active" : ""}`}
          aria-selected={tab.id === p.selectedId}
          onClick={() => p.onSelect?.(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
