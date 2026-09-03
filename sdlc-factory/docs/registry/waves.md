# Waves — what we decided to build next, and whether it's done

> Owned by `/wave`. `propose` adds a row; `close` sets its Status to
> `closed`. The current wave is the last `open` row — a work order is in
> at most one open wave at a time.
>
> `Work orders` is a comma-separated, ordered list of WO ids — dependency
> order, the order the planner would run them in — each optionally
> followed by a MoSCoW word in parentheses (`WO-003 (Must)`). Every id
> here must also carry that same wave in its own front-matter
> (`wave: <this row's Wave>`); the console's `wave-off-record` check is
> what verifies the two agree.

| Wave | Goal | Work orders | Status |
|---|---|---|---|
| W1 | ReachKit boots: toolchain, pinned configuration, the default-deny database, and the design system's tokens, fonts and fifteen registered components stand, with the root document rendering on them, so the free scan's first screen can be cut next | WO-001 (Must), WO-005 (Must), WO-006 (Must), WO-267 (Must), WO-029 (Must), WO-030 (Must), WO-268 (Must), WO-002 (Should) | closed |
