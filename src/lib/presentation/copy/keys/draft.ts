// src/lib/presentation/copy/keys/draft.ts — BP-020 decision 5, WO-041
//
// The draft view's sentences. Empty on purpose: WO-041 seeds no string here.
// The block that owns the draft view's surface fills this file and touches
// no other partition.
import type { CopyPartition } from "../registry.ts";

export const DRAFT_COPY = Object.freeze({}) satisfies CopyPartition;
