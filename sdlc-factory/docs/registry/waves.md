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
| W2 | The landing page renders its one field and submit control, a typed domain is canonicalised and checked against the free path's admission order in a single claiming transaction, POST /api/scan starts — or refuses — the scan and returns the address to navigate to, and the container denies by default at its edge behind one declared public allow-list, so JN-001 step 2's REQ-001 surface works end to end on the W1 substrate and no account route is reachable by omission | WO-051 (Must), WO-041 (Must), WO-056 (Must), WO-057 (Must), WO-058 (Must), WO-003 (Must), WO-062 (Must), WO-070 (Must) | closed |
| W3 | The free report screen stands up: `/scan/{domain}` resolves a visit into exactly one arm of a closed union and renders it, a running scan names its six stages on a stream that closes after one bounded ending, and the verdict at the top is one score, its band word and one written line naming what holds it down — with a dash and its reason wherever a measurement could not be taken — so JN-001 steps 3 and 4 work end to end on the W2 substrate | WO-283 (Must), WO-018 (Must), WO-276 (Must), WO-277 (Must), WO-278 (Must), WO-279 (Should), WO-280 (Must), WO-281 (Must), WO-282 (Must), WO-284 (Should) | open |
