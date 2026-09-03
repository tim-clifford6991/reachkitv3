// src/lib/presentation/copy/keys/settings.ts — BP-020 decision 5, WO-041
//
// Settings' sentences. Empty on purpose: WO-041 seeds no string here. The
// block that owns Settings fills this file and touches no other partition.
import type { CopyPartition } from "../registry.ts";

export const SETTINGS_COPY = Object.freeze({}) satisfies CopyPartition;
