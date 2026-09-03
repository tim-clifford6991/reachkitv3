// src/lib/presentation/copy/keys/danger.ts — BP-020 decision 5, WO-041
//
// The destructive-action surfaces' sentences. Empty on purpose: WO-041
// seeds no string here. The block that owns each destructive-action
// surface fills this file and touches no other partition.
import type { CopyPartition } from "../registry.ts";

export const DANGER_COPY = Object.freeze({}) satisfies CopyPartition;
