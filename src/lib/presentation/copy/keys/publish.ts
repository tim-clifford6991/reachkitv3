// src/lib/presentation/copy/keys/publish.ts — BP-020 decision 5, WO-041
//
// Publishing's sentences. Empty on purpose: WO-041 seeds no string here.
// The block that owns publishing fills this file and touches no other
// partition.
import type { CopyPartition } from "../registry.ts";

export const PUBLISH_COPY = Object.freeze({}) satisfies CopyPartition;
