// src/lib/presentation/copy/keys/setup.ts — BP-020 decision 5, WO-041
//
// Setup's sentences. Empty on purpose: WO-041 seeds no string here. The
// block that owns setup fills this file and touches no other partition.
import type { CopyPartition } from "../registry.ts";

export const SETUP_COPY = Object.freeze({}) satisfies CopyPartition;
