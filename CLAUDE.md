# reachkitv3

**The spec is `BUILD.md`.** It says what the product is. Where it rules, don't re-open. Where it is silent, ask the owner once, then record the answer in `DECISIONS.md`. `ARCHITECTURE.md` says where code lives. `DATA-COSTS.md` is the price book behind §6.

**CI is the process.** Every rule that matters is a check in `.github/workflows/`, a lint rule in `eslint.config.mjs`, or a test. If you care about a rule and no check enforces it, add the check — do not add a paragraph here.

## How work flows
- One GitHub issue = one branch = one PR. Never start without an issue; `gh issue create` first if none exists. Branch name `feat/<issue>-<slug>` or `fix/<issue>-<slug>`.
- Read the issue, the `BUILD.md` section it cites, and `DECISIONS.md` before writing code.
- `npm run typecheck && npm run lint && npm test` green locally before opening a PR. CI runs the same and will not pass otherwise.
- PR body: `Closes #N` · what changed · how you verified it · preview URL. The `pr-hygiene` check fails without `Closes #N` and without every `Done when` box in the issue ticked.
- Merge is done. Nothing else counts as done. The owner merges.
- `/build <#N>` runs this loop; `/ship <#PR>` merges an approved PR.

## Rules the code already enforces (don't work around them)
- Every pinned number lives in `src/lib/config/constants.ts`; nothing is inlined twice.
- Every byte leaving the process toward a customer URL goes through `src/lib/egress/safeFetch()`. Every vendor or LLM call goes through the cost seam in `src/lib/costs/`. Nothing outside `BUILD.md` §6.3's closed list ships.
- `src/lib/**` never imports from `src/app/**`. Only `@/lib/db` is imported from outside `src/lib/db`. Only `hasActiveAccess()` is imported from outside `src/lib/account/billing`.
- Every sentence the product speaks is a key in `src/lib/presentation/copy/`. UI strings are written by the owner: never invent copy — add the key, leave the value `TODO(copy)`, flag it in the PR.
- No generated prose anywhere except draft page content, always labelled (`GeneratedText`).
- No emoji in the product. Every numeral is JetBrains Mono.

## Design
Any new or visually changed screen gets an artifact mockup linked in the issue before code. Match `BUILD.md` §2 tokens and the approved prototype; the chart inventory (§2.4) is closed.

## Don't
- Add settings that tune the engine (caps, cadences, model choice are constants).
- Add a dependency, a top-level directory, or a vendor call without asking.
- Pad scope beyond the issue. If you find adjacent work, open an issue for it.
- Edit `BUILD.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `.github/**`, `eslint.config.mjs` or `scripts/**` in a feature PR — those are the owner's files (`CODEOWNERS`); make the change in its own PR.
- Touch `archive/` — it is the frozen 2026-08-30 → 2026-09-04 sdlc-factory corpus, kept for reference. Read it if a decision's reasoning is not obvious; never write to it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
