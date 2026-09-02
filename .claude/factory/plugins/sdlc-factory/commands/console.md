---
description: System · Open the read-only knowledge-graph console for this project
---

Run the factory console against the current project root.

```bash
node "$CLAUDE_PROJECT_DIR/.claude/factory/console/bin/factory-console.mjs" $ARGUMENTS
```

Check that path exists before running it. The console lives beside the
plugin inside the marketplace repository, which is where it is when the
plugin source is a relative path — but an installed plugin can end up
outside that checkout. If the file is not there, in order:

1. try `factory-console $ARGUMENTS` on the PATH;
2. otherwise tell me to run `npm link` once inside the marketplace's
   `console/` directory, and stop. Do not go looking for a copy of the
   console elsewhere on disk — the wrong version parsing a corpus is the
   exact failure mode shipping doctrine and console as one unit exists to
   prevent.

Modes, all one parser so the viewer and the checker can never disagree
about what the corpus says:

| Invocation | Does |
|---|---|
| `/sdlc-factory:console` (typed; `/console` below is the name) | serves the viewer, prints the URL |
| `/console --check` | conformance run; exits 1 on an `error`-severity finding |
| `/console --json` | writes the graph to stdout for other tools |
| `/console impact <WO-### \| path>` | blast radius: files → blueprints → importers → requirements |
| `/console registry` | projects `registry/generated/` (the librarian's generator) |
| `/console registry --check` | drift check on the generated files; exits 1 on drift |
| `/console register` / `unregister` / `projects` | the `~/.factory` fleet registry |
| `/console upgrade [--all]` | migrate this corpus (or every registered one) to the shipped doctrine |

The console **never writes to the corpus.** Agents remain the only writers
(`registry` writes only `registry/generated/` — the derived projection,
and the one sanctioned write path in the binary).
If it reports something wrong, fix it through the pipeline — `/sync`,
`/require`, the owning agent — not by editing around the finding.

After a `--check` run, summarise the findings by rule, say which are at
`error` and which at `warn`, and name the single most valuable one to fix
first. Do not fix them as part of this command.
