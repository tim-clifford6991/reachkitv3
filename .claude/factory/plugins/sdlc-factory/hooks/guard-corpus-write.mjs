#!/usr/bin/env node
//
// PreToolUse gate: agents are the only writers of a corpus.
//
// Until this existed, "agents are the only writers" was doctrine and nothing
// more — the constitution said it, and nothing enforced it. The failure mode
// is predictable and was never hypothetical: three hundred lines of
// constitution loaded at session start, eighty thousand tokens of
// conversation since, a request that sounds small, and the main model simply
// opens `requirements/REQ-045.md` and edits it. No analyst, no review rounds,
// no rule 3.4. The corpus still parses. The gate was never run.
//
// The signal that makes this enforceable is that a PreToolUse hook receives
// `agent_type` ONLY when it fires inside a subagent. Its absence is a
// reliable statement that the main model is the one writing.
//
//   no agent_type          → deny, and name the verb that would have worked
//   agent_type owns zone   → allow, silently
//   agent_type, wrong zone → ask, and let the owner decide
//
// Deliberately NOT a blanket deny for the wrong agent: §4's table is a record
// of intent, and an agent doing something adjacent to its row is a judgement
// call the owner should make, not one a hook should make for them.
//
// Escape hatch: SDLC_FACTORY_GUARD=off disables it entirely, for the case
// where the owner genuinely means to hand-edit the corpus and does not want
// to answer a prompt per file.
//
// Fails open on every unexpected condition. A hook that cannot read its own
// input must not be able to halt the session.

import { existsSync } from "node:fs";
import { classify, findCorpus, isOwner, readPayload, VERBS } from "./corpus.mjs";

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

function decide(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

const off = (process.env.SDLC_FACTORY_GUARD || "").toLowerCase();
if (off === "off" || off === "0" || off === "false") process.exit(0);

const p = await readPayload();
if (!p || !WRITE_TOOLS.has(p.tool_name)) process.exit(0);

// Write/Edit use file_path; NotebookEdit uses notebook_path.
const filePath = p.tool_input?.file_path || p.tool_input?.notebook_path;
const corpus = findCorpus(filePath);
if (!corpus) process.exit(0); // not a corpus file — every non-factory repo lands here

const { kind, zone, file } = classify(corpus.rel);
if (kind === "exempt") process.exit(0);

// The scaffolding exemption. `/factory-init` runs from the main model and
// writes `registry/` and `design/` stubs before any agent exists to own them;
// once those files are on disk they are the librarian's and the
// design-guardian's. Artifacts get no such exemption — creating one is
// precisely the act being guarded.
if (kind === "curated" && !existsSync(filePath)) process.exit(0);

const agent = p.agent_type || null;
const verb = VERBS[zone] || "the matching owner verb";

if (!agent) {
  decide("deny",
    `${file} is corpus, not code — ${zone}/ belongs to an agent (constitution §4), and this write is coming from the main session, not a subagent.\n\n` +
    `Route it: ${verb}\n\n` +
    `That verb dispatches the owning agent and runs the gates attached to it (rule 3.4's two review rounds, the librarian's status audit). ` +
    `Writing the file here produces an artifact that parses but never passed them.\n\n` +
    `If you genuinely mean to hand-edit the corpus, re-run with SDLC_FACTORY_GUARD=off.`);
}

if (!isOwner(agent, zone)) {
  decide("ask",
    `${agent} is writing ${file}, but §4 gives ${zone}/ to ${(VERBS[zone] ? "another agent" : "no one")}. ` +
    `Allow if this is deliberate — the librarian and the reviewer legitimately write everywhere, and §4 is a record of intent, not a fence.`);
}

process.exit(0);
