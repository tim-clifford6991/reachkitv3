// src/lib/presentation/copy/index.ts — BP-020, WO-041
//
// The module's public entry point. Re-exports exactly `COPY`, `COPY_META`,
// `copy` and the types `CopyKey`, `CopyMeta`, `CopyPartition` — nothing
// else. No partition is re-exported by name, so nothing outside this
// module can read one partition and miss the rest.
export { COPY, COPY_META, type CopyKey, type CopyMeta, type CopyPartition } from "./registry.ts";
export { copy } from "./copy.ts";
