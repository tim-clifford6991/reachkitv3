// The doctrine's linter.
//
// Not a separate implementation: the same parse, with assertions. The viewer
// and the checker can never disagree about what the corpus says, because
// there is only one thing that reads it.
//
// Severity is configurable per rule so a project can adopt the checker before
// it is clean and ratchet rules from `warn` to `error` as it fixes them. A
// corpus with a real history will never be green on day one, and a checker
// that must be green immediately is a checker that gets disabled.

import { readdirSync } from "node:fs";
import { join } from "node:path";

/** The rule set. Order is report order. */
export const RULES = [
  "dangling-id",
  "registry-contradiction",
  "generated-drift",
  "status-off-grammar",
  "field-vocabulary",
  "ellipsis-range",
  "tst-heading-off-grammar",
  "orphan-requirement",
  "done-without-validation",
  "tst-without-regression",
  "silent-index",
  "edge-off-schema",
  "requirement-off-journey",
  "satisfies-superseded",
  "stale-blueprint",
  "untraced-change",
  "done-without-commits",
  "wave-off-record",
  // 0.11.0 — altitude. Four rules that READ a ratio the factory had never
  // measured (docs/design/22-proposal-0.11.0-altitude.md §4–§6).
  "work-order-fanout",
  "corpus-volume",
  "assumption-budget",
  "open-assumption-on-done",
];

export const RULE_TEXT = {
  "dangling-id": "a cited ID with no artifact behind it",
  "registry-contradiction": "the traceability registry disagrees with the artifact file",
  "generated-drift": "the console's parse disagrees with docs/registry/generated/graph.json",
  "status-off-grammar": "a status word outside the declared set",
  "field-vocabulary": "one field, several spellings or key casings",
  "ellipsis-range": "a link line that cannot be expanded",
  "tst-heading-off-grammar": "a heading that opens with a TST id but is not read as a validation report",
  "orphan-requirement": "an approved requirement no blueprint satisfies",
  "done-without-validation": "a done work order with no TST section validating it",
  "tst-without-regression": "a done work order whose latest validation records no regression",
  "silent-index": "an edge field whose corpus-wide coverage is below the visibility floor",
  "edge-off-schema": "a declared edge whose ends are not the node types the graph contract allows",
  "requirement-off-journey": "an approved requirement no journey step exercises",
  "satisfies-superseded": "a live blueprint satisfies a requirement that has since been superseded",
  "stale-blueprint": "a blueprint whose code moved after the blueprint did",
  "untraced-change": "a commit under governed paths that names no work order",
  "done-without-commits": "a done work order no commit names",
  "wave-off-record": "a work order and registry/waves.md disagree about its wave",
  "work-order-fanout": "an approved requirement with more work orders than the floor allows",
  "corpus-volume": "live words per approved requirement, or lines per work order, over budget",
  "assumption-budget": "open rests-on rows per approved artifact over budget",
  "open-assumption-on-done": "a done work order still carrying an open rests-on row",
};

// A verb phrase for each edge name, used only to render edge-off-schema's
// summary as an English sentence ("a blueprint may not satisfy a
// blueprint"). Purely cosmetic — the judgment itself is cfg.edges, not this
// map — but a summary that reads as a sentence is what makes the finding a
// question a human can adjudicate rather than a triple to decode.
const REL_VERB = {
  satisfies: "satisfy",
  covers: "cover",
  implements: "implement",
  "decides-for": "decide for",
  about: "be about",
  "depends-on": "depend on",
  "blocked-by": "be blocked by",
  supersedes: "supersede",
  validates: "validate",
  exercises: "exercise",
};

/**
 * Which declared status vocabulary governs a given type.
 *
 * Front-matter nodes carry a semantic type name ("requirement", "validation",
 * …) that never matches an uppercase `cfg.types[].id` — so that lookup is
 * tried first, under `cfg.statuses[typeId]` directly (constitution rule
 * 2.2b's six per-type vocabularies: requirement/blueprint/work-order/
 * decision/validation/feedback). `validation` in particular has no entry in
 * `cfg.types` at all — it is derived structurally, not a directory — so it
 * would fall through to the single legacy `artifact` vocabulary without this
 * branch, which is exactly the "6 errors of pure vocabulary noise" this rule
 * used to produce against a front-matter corpus.
 */
function vocabularyFor(typeId, cfg) {
  if (cfg.grammar === "front-matter" && cfg.statuses[typeId]) return cfg.statuses[typeId];
  const t = cfg.types.find((x) => x.id === typeId);
  if (!t) return cfg.statuses.artifact;
  if (t.table) return cfg.statuses.registry;
  if (cfg.statuses[typeId]) return cfg.statuses[typeId];
  return cfg.statuses.artifact;
}

/**
 * @param {object} graph  output of extract()
 * @param {object} cfg    the validated config
 * @param {string} [root] the project root — optional; a caller exercising
 *   `check()` against a hand-built graph with no real project on disk (most
 *   unit tests) simply gets the directory-scan rule skipped rather than a
 *   crash. Every real caller (the CLI, the server) has a root and passes it.
 * @returns {{findings: object[], bySeverity: object, exitCode: number, notices: string[], notRun: string[]}}
 */
export function check(graph, cfg, root) {
  const sev = (rule) => cfg.checks.severity[rule] ?? "warn";
  const findings = [];
  // Declared here (not down by the "notices" section below) so the
  // stale-blueprint block, which runs earlier, can push its own notice when
  // docsRoot sits outside the repository.
  const notices = [];
  // Rules that could not run at all this pass — distinct from a rule that
  // ran and found nothing. A rule with no findings and a rule that never
  // executed both look silent in `findings`; `notRun` is what tells
  // `formatReport` and the Health view apart from a false "clean".
  const notRun = [];
  const add = (rule, summary, detail, where) => {
    const s = sev(rule);
    if (s === "off") return;
    findings.push({ rule, severity: s, summary, detail, where, text: RULE_TEXT[rule] });
  };

  // ---- dangling-id ------------------------------------------------------
  // Rule 2 of the constitution — every downstream artifact cites upstream
  // IDs — is broken whenever this fires.
  for (const [id, citedBy] of Object.entries(graph.health.dangling)) {
    add("dangling-id",
      `${id} is cited but no artifact exists`,
      `cited by ${[...new Set(citedBy)].join(", ")}`,
      id);
  }

  // ---- registry-contradiction -------------------------------------------
  // Rule 1 settles it: the file wins, the registry is the copy. So the
  // registry is reported as the thing to fix.
  for (const r of graph.health.registry) {
    add("registry-contradiction",
      `${r.id}: the registry says "${r.registry}", the file says "${r.file}"`,
      `rule 1 — the file wins; correct ${cfg.traceability.file}`,
      r.id);
  }

  // ---- generated-drift (front-matter grammar only) -----------------------
  // Cross-checks this parse against docs/registry/generated/graph.json — the
  // DERIVED registry, projected by scripts/build-registry.mjs from the same
  // front-matter this console reads. registry-contradiction (above) is the
  // legacy-grammar check against the hand-authored registry/traceability.md;
  // this is its front-matter replacement, named separately per the work
  // order rather than repointed in place, so a fleet mid-migration can see
  // both checks' history distinctly.
  for (const m of graph.health.generatedDrift?.mismatches || []) {
    add("generated-drift",
      `${m.id}: the console's parse says "${m.parsed}", graph.json says "${m.generated}"`,
      "one of the two is stale — regenerate with `factory-console registry`, or fix the artifact's own status",
      m.id);
  }

  // ---- status-off-grammar -----------------------------------------------
  const offByType = new Map();
  const unsetByType = new Map();
  for (const n of graph.nodes) {
    const declared = vocabularyFor(n.y, cfg);
    if (!n.s) {
      unsetByType.set(n.y, (unsetByType.get(n.y) || 0) + 1);
      continue;
    }
    if (declared.includes(n.s)) continue;
    if (!offByType.has(n.y)) offByType.set(n.y, new Map());
    const m = offByType.get(n.y);
    m.set(n.s, (m.get(n.s) || 0) + 1);
  }
  for (const [type, words] of offByType) {
    const declared = vocabularyFor(type, cfg);
    const rows = [...words.values()].reduce((a, b) => a + b, 0);
    add("status-off-grammar",
      `${type}: ${rows} artifacts carry ${words.size} status words the grammar does not name`,
      [...words].map(([w, c]) => `${w} ×${c}`).join(" · ") + `  (declared: ${declared.join(", ")})`,
      type);
  }
  for (const [type, n] of unsetByType) {
    add("status-off-grammar",
      `${type}: ${n} artifacts carry no status at all`,
      `declared: ${vocabularyFor(type, cfg).join(", ")}`,
      type);
  }

  // ---- field-vocabulary --------------------------------------------------
  // This one bit the prototype directly: successive passes reported 2, then
  // 7, then the true 16 UI-gated work orders, purely from field spelling.
  for (const [name, field] of Object.entries(cfg.fields)) {
    const seen = graph.fieldVocab?.[name] || {};
    const canonical = new Set([...field.true, ...field.false]);
    const off = Object.entries(seen).filter(([v]) => !canonical.has(v));
    if (off.length) {
      add("field-vocabulary",
        `${name}: ${off.length} value${off.length > 1 ? "s" : ""} outside the declared vocabulary`,
        off.map(([v, c]) => `${v} ×${c}`).join(" · ") +
          `  (declared: ${[...field.true].join("/")} = true, ${[...field.false].join("/")} = false)`,
        name);
    }
    const casings = Object.entries(graph.keyCase || {})
      .filter(([k]) => k.toLowerCase() === name.toLowerCase() && k !== field.key);
    if (casings.length) {
      add("field-vocabulary",
        `${name}: the key is written ${casings.length + 1} different ways`,
        [`${field.key} ×${graph.keyCase[field.key] || 0}`, ...casings.map(([k, c]) => `${k} ×${c}`)].join(" · "),
        name);
    }
  }

  // ---- ellipsis-range ----------------------------------------------------
  // Refused, never expanded. WO-002 alone would fabricate ~140 edges.
  for (const r of graph.health.ranges) {
    add("ellipsis-range",
      `${r.id}: "${r.key}:" uses a range the parser refuses to expand`,
      `${r.line} — enumerate the IDs, or split the work order`,
      r.id);
  }
  // A commit message can carry the same shape of lie — `WO-145..147` in a
  // subject line is exactly as unexpandable as one in a document, and for
  // the same reason: refusing it is cheaper than fabricating the middle ids.
  if (graph.code?.present) {
    for (const r of graph.code.ranges) {
      add("ellipsis-range",
        `commit ${r.h}: the message uses a range the parser refuses to expand`,
        `${r.text} — enumerate the ids in the commit body, or split the commit`,
        r.h);
    }
  }

  // ---- tst-heading-off-grammar -------------------------------------------
  // A heading that opens with a TST id but misses the validation-report
  // grammar is silently not a validation node. WO-084 sat `done` and
  // apparently unvalidated for a week on one parenthesis.
  for (const t of graph.health.tstHeadings || []) {
    add("tst-heading-off-grammar",
      `${t.id}: a heading opens with a TST id but is not read as a validation report`,
      `${t.line} — the grammar wants \`TST-### — title\`; this section's verdict is invisible until it does`,
      t.id);
  }

  // ---- orphan-requirement ------------------------------------------------
  // The rule is about *approved* requirements: an approved REQ nothing
  // satisfies has been signed off and never expanded. Candidates for the
  // next blueprint wave rather than errors, which is why it defaults to warn.
  const byId = new Map(graph.nodes.map((n) => [n.i, n]));
  const approvedOrphans = graph.health.orphanREQ.filter((id) => byId.get(id)?.s === "approved");
  for (const id of approvedOrphans) {
    add("orphan-requirement",
      `${id} is approved and nothing satisfies it`,
      `no declared edge points at ${id}`,
      id);
  }

  // ---- done-without-validation (front-matter grammar only) ---------------
  // A work order marked `done` with no `## TST-###` section validating it —
  // the built thing was declared finished and no one checked. Defaults to
  // error: unlike orphan-requirement (a candidate for the next wave),
  // `done` is a completion claim, and an unvalidated one is a defect now,
  // not a future task.
  if (cfg.grammar === "front-matter") {
    const validatedWOs = new Set(graph.edges.filter((e) => e[2] === "validates").map((e) => e[1]));
    for (const n of graph.nodes) {
      if (n.y === "work-order" && n.s === "done" && !validatedWOs.has(n.i)) {
        add("done-without-validation",
          `${n.i} is done and no TST section validates it`,
          "no `## TST-###` heading in this work order's body declares a validates edge to it",
          n.i);
      }
    }
  }

  // ---- tst-without-regression (front-matter grammar only) ----------------
  // A done work order's LATEST `## TST-###` section should say what
  // regression sweep backed the verdict, not just describe the new work —
  // rule 3 (validator's structure-compliance step) extended by /regress.
  // Silent on a done WO with no TST section at all: that gap belongs to
  // done-without-validation, not this rule. The extractor keeps a
  // validation node's own body empty (its section text is only ever read
  // once, by readVerdict, at parse time) — so this rule re-reads the WO's
  // OWN body (`n.b`) and re-finds the TST headings there, the same bound
  // (next heading's start, or EOF) extract/index.mjs computes for
  // readVerdict, and the same latest-by-id-sort convention the blockers
  // panel uses (console.template.html) — "-R" sorts after the base id,
  // "-R2" after "-R".
  if (cfg.grammar === "front-matter") {
    const TST_HEADING_RE_CHECK = /^#{1,3}\s+(TST-\d+(?:-R\d*)?)\s+[—-]\s*(.+?)\s*$/gm;
    for (const n of graph.nodes) {
      if (n.y !== "work-order" || n.s !== "done") continue;
      const bodyText = n.b || "";
      TST_HEADING_RE_CHECK.lastIndex = 0;
      const headings = [];
      let m;
      while ((m = TST_HEADING_RE_CHECK.exec(bodyText))) {
        headings.push({ id: m[1], start: m.index, end: m.index + m[0].length });
      }
      if (!headings.length) continue; // done-without-validation's business
      const latestId = headings.map((h) => h.id).sort().pop();
      const latestIdx = headings.findIndex((h) => h.id === latestId);
      const latest = headings[latestIdx];
      const section = bodyText.slice(
        latest.end,
        latestIdx + 1 < headings.length ? headings[latestIdx + 1].start : bodyText.length
      );
      const hasRegression = section.split("\n").some((line) => line.trim().startsWith("Regression:"));
      if (!hasRegression) {
        add("tst-without-regression",
          `${n.i} is done and its latest validation records no regression`,
          `add a "Regression:" line via /regress — rule 3 extended`,
          n.i);
      }
    }
  }

  // ---- silent-index (front-matter grammar only) ---------------------------
  // Rule 5.5 as a check: "an index that is derived cannot lie, but it can be
  // silent." Any edge-shaped field whose corpus-wide carrying fraction sits
  // below the configured floor gets one warning naming the field and its
  // X-of-Y count, the same shape build-registry.mjs's own coverage lines use.
  const silentThreshold = cfg.checks.silentIndexThreshold ?? 0.05;
  // Measured against the nodes that CAN carry the field, not the whole corpus.
  // Only feedback declares `about`, so 8-of-411 is really 8-of-8 — complete,
  // and reporting it as near-silent buries the fields that genuinely are.
  // graph.json's own coverage block keeps the corpus-wide denominator: it is
  // byte-identical to the reference generator and is not this rule's business.
  const eligibleFor = (field) => {
    // Derived from the graph contract (cfg.edges) rather than a second,
    // hand-maintained map: a field's eligible owner is whatever node type is
    // the sole `from` side of its edge — the same fact edge-off-schema
    // already enforces. `code` is the one field with no `cfg.edges` entry
    // (it anchors a blueprint to its implementation, not an edge between two
    // nodes), so it stays a literal special case. A field whose `from` is
    // `["*"]`, spans several types, or names none in `cfg.edges` at all
    // (`rests-on`) has no single eligible owner — `null` falls back to the
    // corpus-wide denominator, same as before.
    const from = cfg.edges?.[field]?.from;
    const owner = field === "code" ? "blueprint" : (Array.isArray(from) && from.length === 1 && from[0] !== "*" ? from[0] : null);
    return owner ? graph.nodes.filter((n) => n.y === owner).length : null;
  };
  for (const [field, { carrying, total: corpusTotal }] of Object.entries(graph.health.fieldCoverage || {})) {
    const scoped = cfg.grammar === "front-matter" ? eligibleFor(field) : null;
    const total = scoped ?? corpusTotal;
    if (total === 0) continue;
    const ratio = carrying / total;
    if (ratio < silentThreshold) {
      add("silent-index",
        `${field}: only ${carrying} of ${total} ${scoped ? "eligible " : ""}nodes carry it (${(ratio * 100).toFixed(1)}%)`,
        `below the ${(silentThreshold * 100).toFixed(0)}% visibility floor (checks.silentIndexThreshold) — rule 5.5`,
        field);
    }
  }

  // ---- undeclared artifact directories -------------------------------------
  // A directory under docsRoot that already holds artifact-shaped files —
  // filenames opening with an uppercase prefix and three digits — but that
  // no `cfg.types[].dir` names is invisible to this console: never scanned,
  // never counted, never checked. `journeys/` sat exactly this way for one
  // commit before the JN type was declared. Skipped deliberately:
  // `registry` (generated plus hand-authored files, not artifacts),
  // `design`, `_archive`, `history` (none of these are artifact
  // directories by convention) and anything `_`-prefixed (a project's own
  // scratch or draft area). `root` is optional — see the doc comment above.
  if (root) {
    const declaredDirs = new Set(cfg.types.filter((t) => t.dir).map((t) => t.dir));
    const SKIP_DIRS = new Set(["registry", "design", "_archive", "history"]);
    const docsRoot = join(root, cfg.docsRoot);
    let entries = [];
    try {
      entries = readdirSync(docsRoot, { withFileTypes: true });
    } catch { /* no docs root yet — nothing to scan */ }
    for (const ent of entries) {
      if (!ent.isDirectory() || declaredDirs.has(ent.name) || SKIP_DIRS.has(ent.name) || ent.name.startsWith("_")) continue;
      let files;
      try {
        files = readdirSync(join(docsRoot, ent.name));
      } catch {
        continue;
      }
      const shaped = files.filter((f) => f.endsWith(".md") && /^[A-Z]+-\d{3}/.test(f));
      if (!shaped.length) continue;
      const ids = shaped.map((f) => `${f.match(/^[A-Z]+-\d{3}/)[0]}-…`);
      notices.push(
        `\`${ent.name}/\` holds ${shaped.length} artifact-shaped file${shaped.length > 1 ? "s" : ""} ` +
        `(${ids.join(", ")}) but no declared type covers it — add the type to factory.config.json's ` +
        "`types`, or the console will never read it."
      );
    }
  }

  // ---- edge-off-schema (front-matter grammar only) ------------------------
  // The graph contract (docs/design/04-p1-backbone.md § "The graph
  // contract"): every declared edge names, in cfg.edges, which node types
  // its two ends may be. This rule is the enforcement — not a parse error
  // (the edge is real, declared, and read correctly) but a modeling
  // question a human should adjudicate: should a blueprint really satisfy a
  // blueprint? Judged only where both ends resolve to a node in this corpus
  // (a dangling id is dangling-id's problem, not this rule's), and only for
  // a `rel` cfg.edges actually names — a project's own extra relations
  // (declared via `relations` for head-block, or simply not in cfg.edges)
  // are its own business.
  if (cfg.grammar === "front-matter") {
    const offSchema = [];
    for (const [from, to, rel] of graph.edges) {
      const allowed = cfg.edges[rel];
      if (!allowed) continue;
      const fromNode = byId.get(from);
      const toNode = byId.get(to);
      if (!fromNode || !toNode) continue;
      const fromOk = allowed.from.includes("*") || allowed.from.includes(fromNode.y);
      const toOk = allowed.to.includes("*") || allowed.to.includes(toNode.y) ||
        (allowed.to.includes("same") && toNode.y === fromNode.y);
      if (fromOk && toOk) continue;
      offSchema.push({ from, to, rel, fromType: fromNode.y, toType: toNode.y, allowed });
    }
    offSchema.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0)));
    for (const v of offSchema) {
      // `validates` and `exercises` are the two derived relations — a human
      // never types them, the parser mints them from a `## TST-###` heading
      // (validates) or a journey step's `exercises:` list (exercises). "fix
      // the edge" makes no sense for either: there is no edge line to edit,
      // only the heading or the step that produced it.
      const fix = v.rel === "validates"
        ? "this edge comes from a `## TST-###` heading in the work order's body — fix the heading"
        : v.rel === "exercises"
          ? "this edge comes from a journey step's `exercises:` list — fix the step"
          : "fix the edge";
      add("edge-off-schema",
        `\`${v.from} -${v.rel}-> ${v.to}\`: a ${v.fromType} may not ${REL_VERB[v.rel] || v.rel} a ${v.toType}`,
        `the contract allows ${v.rel}: ${v.allowed.from.join("/")} → ${v.allowed.to.join("/")} — ` +
        `${fix}, or change the contract in factory.config.json`,
        v.from);
    }
  }

  // ---- requirement-off-journey (front-matter grammar only) ----------------
  // Constitution rule 5.7: an approved requirement is exercised by at least
  // one journey step, or states why it cannot be. The rule can only judge
  // that once the corpus has written its first journey — before then, every
  // approved requirement would fire, which is noise, not signal — so a
  // corpus with zero journey nodes gets one notice instead of N findings.
  if (cfg.grammar === "front-matter") {
    const journeyNodes = graph.nodes.filter((n) => n.y === "journey");
    if (journeyNodes.length === 0) {
      notices.push(
        "No journeys yet — requirement-off-journey cannot run; write the first with /require or the journey-writing skill."
      );
      notRun.push("requirement-off-journey");
    } else {
      const exercised = new Set(graph.edges.filter((e) => e[2] === "exercises").map((e) => e[1]));
      for (const n of graph.nodes) {
        if (n.y === "requirement" && n.s === "approved" && !exercised.has(n.i)) {
          add("requirement-off-journey",
            `${n.i} is approved and no journey exercises it`,
            "place it on a journey step, or record in the REQ why it has no user-facing step",
            n.i);
        }
      }
    }
  }

  // ---- satisfies-superseded (front-matter grammar only) -------------------
  // `/requirement-cleanup` retires a duplicate requirement in place (`status:
  // superseded`) and its survivor gains `supersedes:` — but nothing
  // repoints a blueprint's own `satisfies` automatically. A live blueprint
  // whose `satisfies` still names a superseded requirement is exactly
  // that dangling edge: `/relink` is the fix this rule points at.
  // Silent on a blueprint that is itself `status: superseded` — a retired
  // twin's own edges are history, not a live claim needing a repoint.
  if (cfg.grammar === "front-matter") {
    for (const [from, to, rel] of graph.edges) {
      if (rel !== "satisfies") continue;
      const bp = byId.get(from);
      if (!bp || bp.y !== "blueprint" || bp.s === "superseded") continue;
      const req = byId.get(to);
      if (!req || req.y !== "requirement" || req.s !== "superseded") continue;
      add("satisfies-superseded",
        `${bp.i} satisfies a superseded requirement`,
        "repoint to the survivor or retire the blueprint — /relink after requirement-cleanup",
        bp.i);
    }
  }

  // ---- stale-blueprint (code layer only) ----------------------------------
  // 8090's pitch turns on one question: which document is the source of
  // truth once code and docs disagree? Here that question is mechanical —
  // for a blueprint anchored to real files, compare the newest commit
  // touching those files against the newest commit touching the blueprint's
  // own file. If the code moved more recently and the blueprint didn't move
  // with it, the blueprint is not lying yet, but it is aging in public.
  if (graph.code?.present) {
    // docsPrefix is `relative(repo.root, docsRoot)` (extract/index.mjs). An
    // empty string means the docs root IS the repo root — joining it with
    // "/" would build "/node.f", which never matches a tracked path. And a
    // prefix starting with ".." means docsRoot sits outside the repository
    // entirely — no blueprint file path constructed from it can ever match a
    // commit's file list, so the rule would silently never fire rather than
    // reporting anything wrong.
    if (graph.code.docsPrefix.startsWith("..")) {
      notices.push(
        `docsRoot sits outside the repository at ${cfg.code.root} — stale-blueprint cannot match blueprint files to commits.`
      );
    }
    // A commit that names a work order implementing THIS blueprint is the
    // blueprint being BUILT, not the code drifting from it. The first live
    // run (2026-08-29) fired this rule three times on a fresh product whose
    // every commit was doing exactly what the blueprint ordered — only
    // unplanned motion ages a blueprint, so implementing commits are
    // excluded from the comparison below.
    const implementsByBp = new Map();
    for (const [from, to, rel] of graph.edges) {
      if (rel !== "implements") continue;
      if (!implementsByBp.has(to)) implementsByBp.set(to, new Set());
      implementsByBp.get(to).add(from);
    }
    for (const [bpId, anchor] of Object.entries(graph.code.anchors)) {
      if (!anchor.files.length) continue;
      const node = byId.get(bpId);
      if (!node) continue;
      const ownFile = graph.code.docsPrefix ? `${graph.code.docsPrefix}/${node.f}` : node.f;
      const anchoredSet = new Set(anchor.files);
      const implementingWos = implementsByBp.get(bpId);
      // Commits are newest-first, so the first match is the latest one.
      const bpCommits = graph.code.commits.filter((c) => c.files.includes(ownFile));
      const codeCommits = graph.code.commits.filter((c) =>
        c.files.some((f) => anchoredSet.has(f)) && !c.files.includes(ownFile) &&
        !(implementingWos && c.wo.some((w) => implementingWos.has(w))));
      if (!bpCommits.length || !codeCommits.length) continue;
      const bpLatest = bpCommits[0];
      const codeLatest = codeCommits[0];
      if (codeLatest.d <= bpLatest.d) continue;
      const since = codeCommits.filter((c) => c.d > bpLatest.d);
      add("stale-blueprint",
        `${bpId}: its code changed after the blueprint did`,
        `${since.length} commit(s) under ${anchor.globs.join(", ")} since ${bpLatest.h} (${bpLatest.d}), ` +
        `latest ${codeLatest.h} — which is the source of truth, the code or the blueprint?`,
        bpId);
    }
  }

  // ---- untraced-change (code layer only) ----------------------------------
  // The commit citation is the same declared link this whole console reads
  // everywhere else — so a commit that touches governed code and names no
  // work order is the git-shaped version of an undeclared edge: what did we
  // merge that nothing in the corpus planned for? A commit already flagged
  // by ellipsis-range gets the benefit of the doubt — its citation was
  // refused, not omitted.
  if (graph.code?.present) {
    const governedFiles = new Set(Object.values(graph.code.anchors).flatMap((a) => a.files));
    const rangedShas = new Set(graph.code.ranges.map((r) => r.h));
    for (const c of graph.code.commits) {
      if (c.wo.length || rangedShas.has(c.h)) continue;
      const touched = c.files.filter((f) => governedFiles.has(f));
      if (!touched.length) continue;
      add("untraced-change",
        `${c.h} touched governed code and cites no work order`,
        `"${c.s}" — ${touched.length} governed file(s): ${touched.slice(0, 3).join(", ")}`,
        c.h);
    }
  }

  // ---- done-without-commits (code layer only) -----------------------------
  // done-without-validation asks whether a done work order was ever checked;
  // this asks whether it was ever built. A work order can reach `done` by
  // edit alone — this is the rule that notices when the git history never
  // agreed.
  if (graph.code?.present) {
    const citedWOs = new Set(graph.code.commits.flatMap((c) => c.wo));
    for (const n of graph.nodes) {
      if (n.y === "work-order" && n.s === "done" && !citedWOs.has(n.i)) {
        add("done-without-commits",
          `${n.i} is done and no commit cites it`,
          `no commit message carries \`${n.i}\` — was it merged, or only declared?`,
          n.i);
      }
    }
  }

  // ---- wave-off-record (front-matter grammar only) -------------------------
  // registry/waves.md and a work order's own `wave:` are two declarations of
  // the same fact, and the whole point of a derived index is that the two
  // can disagree — this rule is the check. Four shapes: (a) a WO's `wave:`
  // names a wave the file doesn't have; (b) an *open* wave row names a WO id
  // with no work-order node behind it; (c) an *open* wave row names a WO
  // whose own `wave:` says something else (including nothing at all —
  // absent counts as differing); (d) more than one row is `open` at once.
  // (b) and (c) run only over `open` rows — a closed row is history, and a
  // work order's `wave:` is never expected to still match a wave that has
  // since closed. Can't judge anything with an empty record, so an absent or
  // empty registry/waves.md is `notRun` with a notice, the same posture
  // requirement-off-journey takes for a corpus with no journeys yet.
  if (cfg.grammar === "front-matter") {
    const waves = graph.waves || { list: [], present: false };
    if (!waves.list.length) {
      notices.push(
        waves.present
          ? "registry/waves.md has no wave rows yet — wave-off-record cannot run; /wave propose writes the first wave."
          : "No registry/waves.md — wave-off-record cannot run; /wave propose writes the first wave."
      );
      notRun.push("wave-off-record");
    } else {
      const waveIds = new Set(waves.list.map((w) => w.id));
      for (const n of graph.nodes) {
        if (n.y !== "work-order" || !n.m?.Wave) continue;
        if (!waveIds.has(n.m.Wave)) {
          add("wave-off-record",
            `${n.i}: its wave "${n.m.Wave}" is not in registry/waves.md`,
            `registry/waves.md declares: ${[...waveIds].join(", ") || "(no waves)"}`,
            n.i);
        }
      }
      const openRows = waves.list.filter((row) => row.status === "open");
      for (const row of openRows) {
        for (const woId of row.wos) {
          const woNode = byId.get(woId);
          if (!woNode || woNode.y !== "work-order") {
            add("wave-off-record",
              `${row.id} names ${woId}, which has no work-order artifact`,
              `registry/waves.md's ${row.id} row lists ${woId} — no work-order node exists with that id`,
              woId);
            continue;
          }
          const actual = woNode.m?.Wave ?? null;
          if (actual !== row.id) {
            add("wave-off-record",
              `${woId}: registry/waves.md's ${row.id} row names it, but its own wave: says ${actual ? `"${actual}"` : "nothing"}`,
              `the record and the artifact disagree — fix one to match the other`,
              woId);
          }
        }
      }
      if (openRows.length > 1) {
        add("wave-off-record",
          `registry/waves.md has ${openRows.length} open waves (${openRows.map((row) => row.id).join(", ")}) — close one`,
          `only one wave should be open at a time — close the others before opening the next`,
          openRows.map((row) => row.id).join(", "));
      }
    }
  }

  // ---- altitude (0.11.0) ---------------------------------------------------
  // Four rules born from the second live corpus, measured before any code
  // existed: 253 work orders for 46 approved requirements, 405 open rests-on
  // rows against 58 confirmed, 14,844 live words per approved requirement.
  // Each prints its own coverage line as a notice on every run (rule 5.5),
  // so the ratio is visible whether or not it crosses the threshold, and
  // each is `notRun` — never silently "clean" — where it has no denominator.
  //
  // Head-block nodes carry the uppercase prefix as their type; the semantic
  // name is resolved here only for the two altitude rules that run on both
  // grammars (corpus-volume's counts). Everything else stays front-matter.
  const HB_KIND = { REQ: "requirement", BP: "blueprint", WO: "work-order", ADR: "decision", FB: "feedback", JN: "journey" };
  const kindOf = (n) => (cfg.grammar === "front-matter" ? n.y : HB_KIND[n.y] || n.y);
  const isApprovedNode = (n) => n.s === "approved" || (kindOf(n) === "decision" && n.s === "accepted");
  const quantile = (sorted, p) => (sorted.length ? sorted[Math.floor((sorted.length - 1) * p)] : 0);
  const fmt = (n) => n.toLocaleString("en-US");
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const openRows = (n) => (n.a || []).filter((r) => r.disposition === "open");

  // Work orders per approved requirement: a work order reaches a requirement
  // directly (`implements` → REQ) or through one blueprint (`implements` → BP
  // → `satisfies` → REQ). `covers` is never walked — it is coverage, not
  // ancestry (rule 5.4). Superseded work orders are out; done ones count —
  // they were the cost.
  const fanout = () => {
    const approvedReq = graph.nodes.filter((n) => kindOf(n) === "requirement" && n.s === "approved");
    const wos = graph.nodes.filter((n) => kindOf(n) === "work-order" && n.s !== "superseded");
    const woIds = new Set(wos.map((n) => n.i));
    const sat = new Map();
    for (const [from, to, rel] of graph.edges) {
      if (rel !== "satisfies") continue;
      if (!sat.has(from)) sat.set(from, new Set());
      sat.get(from).add(to);
    }
    const woOf = new Map();
    for (const [from, to, rel] of graph.edges) {
      if (rel !== "implements" || !woIds.has(from)) continue;
      const t = byId.get(to);
      if (!t) continue;
      const k = kindOf(t);
      const reqs = k === "requirement" ? [t.i] : k === "blueprint" ? [...(sat.get(t.i) || [])] : [];
      for (const r of reqs) {
        if (!woOf.has(r)) woOf.set(r, new Set());
        woOf.get(r).add(from);
      }
    }
    const reached = new Set();
    const counts = approvedReq.map((r) => {
      const set = woOf.get(r.i) || new Set();
      for (const w of set) reached.add(w);
      return { id: r.i, ids: [...set].sort(), n: set.size };
    });
    const sorted = counts.map((c) => c.n).sort((a, b) => a - b);
    return {
      approvedReq, wos, counts,
      unreached: wos.filter((w) => !reached.has(w.i)).length,
      median: quantile(sorted, 0.5), p90: quantile(sorted, 0.9),
      perReq: approvedReq.length ? counts.reduce((s, c) => s + c.n, 0) / approvedReq.length : null,
    };
  };

  // ---- work-order-fanout (front-matter grammar only) -----------------------
  // Rule 2.6's floor, read. One finding per approved requirement over
  // `checks.workOrdersPerRequirement`; the coverage notice names how many
  // requirements were measured, how many reach no work order at all (that is
  // `next`'s and /expand-requirement's business, not this rule's), and how
  // many work orders reach no approved requirement through implements/
  // satisfies — outside this measure, and said so.
  if (cfg.grammar === "front-matter") {
    const fo = fanout();
    if (!fo.approvedReq.length || !fo.wos.length) {
      notices.push(`work-order-fanout cannot run — ${!fo.approvedReq.length ? "no approved requirement" : "no work order"} in this corpus yet.`);
      notRun.push("work-order-fanout");
    } else {
      const floor = cfg.checks.workOrdersPerRequirement ?? 6;
      for (const c of fo.counts) {
        if (c.n > floor) {
          add("work-order-fanout",
            `${c.id} has ${c.n} work orders (floor: ${floor}) — rule 2.6`,
            c.ids.join(", "),
            c.id);
        }
      }
      notices.push(
        `work-order-fanout: ${plural(fo.approvedReq.length, "approved requirement")} measured · ` +
        `${fo.counts.filter((c) => c.n === 0).length} reach no work order · ` +
        `${plural(fo.unreached, "work order")} ${fo.unreached === 1 ? "reaches" : "reach"} no approved requirement through implements/satisfies and ${fo.unreached === 1 ? "is" : "are"} outside this measure · ` +
        `median ${fo.median}, p90 ${fo.p90}`
      );
    }
  }

  // ---- corpus-volume (both grammars) --------------------------------------
  // Rule 2.5's shadow, measured: live words (every file-shaped artifact the
  // parser walked — `_`-prefixed files, history/, registry/generated/,
  // design/ and the charter are outside "live" by construction, and the
  // notice says how many files that excluded), words per approved
  // requirement, lines per work order, work orders per approved requirement.
  // Two findings at most — one per breached budget; the lines finding names
  // the count over and the ten largest rather than one finding per order,
  // which on the second live corpus would have been fifty-two lines of noise.
  {
    const fileNodes = graph.nodes.filter((n) => typeof n.w === "number");
    const approvedReq = graph.nodes.filter((n) => kindOf(n) === "requirement" && n.s === "approved").length;
    if (!fileNodes.length) {
      notices.push("corpus-volume cannot run — no file-shaped artifact in this corpus yet.");
      notRun.push("corpus-volume");
    } else {
      const live = fileNodes.reduce((s, n) => s + n.w, 0);
      const woLines = graph.nodes
        .filter((n) => kindOf(n) === "work-order" && typeof n.l === "number")
        .map((n) => ({ id: n.i, l: n.l }));
      const sortedL = woLines.map((x) => x.l).sort((a, b) => a - b);

      // What "live" left out, by directory, so the denominator is stated
      // rather than implied. Only when the project root is known.
      let excluded = "";
      if (root) {
        const declaredDirs = new Set(cfg.types.filter((t) => t.dir).map((t) => t.dir));
        const docsRoot = join(root, cfg.docsRoot);
        const groups = new Map();
        const walk = (dir, rel, filesCount) => {
          let ents;
          try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const e of ents) {
            if (e.name.startsWith("_") || e.name.startsWith(".")) continue;
            const r = rel ? `${rel}/${e.name}` : e.name;
            if (e.isDirectory()) {
              // A declared type directory's own files are the live nodes;
              // only its subdirectories (requirements/history/) are excluded.
              walk(join(dir, e.name), r, !(rel === "" && declaredDirs.has(e.name)));
            } else if (filesCount && e.name.endsWith(".md")) {
              const g = rel || "docs root";
              groups.set(g, (groups.get(g) || 0) + 1);
            }
          }
        };
        walk(docsRoot, "", true);
        if (groups.size) {
          excluded = ` (excluded: ${[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([g, n]) => `${g} ${n}`).join(", ")})`;
        }
      }

      if (!approvedReq) {
        notices.push(`corpus-volume: ${fmt(live)} live words in ${plural(fileNodes.length, "file")}${excluded} · no approved requirement yet, so words per approved requirement has no denominator.`);
        notRun.push("corpus-volume");
      } else {
        const perReq = Math.round(live / approvedReq);
        const wordsCap = cfg.checks.wordsPerApprovedRequirement ?? 6000;
        const linesCap = cfg.checks.linesPerWorkOrder ?? 150;
        if (perReq > wordsCap) {
          add("corpus-volume",
            `${fmt(perReq)} live words per approved requirement (budget: ${fmt(wordsCap)}) — rule 2.5`,
            `${fmt(live)} live words / ${approvedReq} approved requirements`,
            "corpus");
        }
        const over = woLines.filter((x) => x.l > linesCap).sort((a, b) => b.l - a.l);
        if (over.length) {
          add("corpus-volume",
            `${plural(over.length, "work order")} over ${linesCap} lines (checks.linesPerWorkOrder) — rule 2.5`,
            `largest: ${over.slice(0, 10).map((x) => `${x.id} (${x.l})`).join(", ")}`,
            "work-orders");
        }
        const fo = fanout();
        notices.push(
          `corpus-volume: ${fmt(live)} live words in ${plural(fileNodes.length, "file")}${excluded} · ` +
          `${approvedReq} approved REQ · ${fmt(perReq)} words/approved REQ · ` +
          `WO lines median ${quantile(sortedL, 0.5)} / p90 ${quantile(sortedL, 0.9)} / max ${sortedL.at(-1) ?? 0} · ` +
          `${fo.perReq === null ? "—" : fo.perReq.toFixed(1)} WO/approved REQ`
        );
      }
    }
  }

  // ---- assumption-budget (front-matter grammar only) -----------------------
  // Rule 2.3b's ratio: open rests-on rows per approved artifact (approved
  // REQ/BP/WO/JN, accepted ADR). The coverage notice carries the same
  // denominator assumptions.md's own coverage line prints, so the two never
  // disagree; the finding, when the budget is crossed, names the per-type
  // split and the five heaviest carriers so the fix has an address.
  if (cfg.grammar === "front-matter") {
    const carriers = graph.nodes.filter((n) => (n.a || []).length);
    const rows = graph.nodes.flatMap((n) => n.a || []);
    const by = { open: 0, confirmed: 0, refuted: 0, undischargeable: 0 };
    let offGrammar = 0;
    for (const r of rows) {
      if (r.disposition in by) by[r.disposition]++;
      else offGrammar++;
    }
    notices.push(
      `assumption-budget: ${carriers.length} of ${graph.nodes.length} nodes carry rests-on · ${plural(rows.length, "row")} · ` +
      `open ${by.open} / confirmed ${by.confirmed} / refuted ${by.refuted} / undischargeable ${by.undischargeable}` +
      (offGrammar ? ` / off-grammar ${offGrammar}` : "")
    );
    const approved = graph.nodes.filter(isApprovedNode);
    if (!approved.length) {
      notices.push("assumption-budget cannot run — no approved artifact in this corpus yet.");
      notRun.push("assumption-budget");
    } else {
      const budget = cfg.checks.openAssumptionsPerApproved ?? 0.5;
      const openOnApproved = approved.reduce((s, n) => s + openRows(n).length, 0);
      const ratio = openOnApproved / approved.length;
      if (ratio > budget) {
        const perType = {};
        for (const n of approved) perType[kindOf(n)] = (perType[kindOf(n)] || 0) + openRows(n).length;
        const heaviest = approved
          .map((n) => ({ id: n.i, n: openRows(n).length }))
          .filter((x) => x.n)
          .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id))
          .slice(0, 5);
        add("assumption-budget",
          `${openOnApproved} open rests-on rows on ${approved.length} approved artifacts (${ratio.toFixed(2)}; budget ${budget}) — 2.3b`,
          `by type: ${Object.entries(perType).map(([k, v]) => `${k} ${v}`).join(", ")} · heaviest: ${heaviest.map((x) => `${x.id} (${x.n})`).join(", ")}`,
          "rests-on");
      }
    }
  }

  // ---- open-assumption-on-done (front-matter grammar only) -----------------
  // §3's sixth gate: a done work order carries no open rests-on row — its
  // validator dispositioned every one before the verdict (2.3b). `done` is a
  // completion claim, so the shipped severity is error, the same reasoning
  // as done-without-validation. No done work order yet: notRun, with the
  // carrier count as the notice, so the rule's silence reads as "not yet"
  // and never as "clean".
  if (cfg.grammar === "front-matter") {
    const woAll = graph.nodes.filter((n) => n.y === "work-order");
    const carry = woAll.filter((n) => (n.a || []).length).length;
    const done = woAll.filter((n) => n.s === "done");
    if (!done.length) {
      notices.push(`open-assumption-on-done cannot run — no done work order yet (${carry} of ${woAll.length} work orders carry rests-on).`);
      notRun.push("open-assumption-on-done");
    } else {
      for (const n of done) {
        const open = openRows(n);
        if (!open.length) continue;
        add("open-assumption-on-done",
          `${n.i} is done with ${plural(open.length, "open rests-on row")} — 2.3b`,
          open.map((r) => r.claim.slice(0, 80)).join(" · "),
          n.i);
      }
      notices.push(`open-assumption-on-done: ${plural(done.length, "done work order")} measured · ${carry} of ${woAll.length} work orders carry rests-on`);
    }
  }

  // ---- notices -----------------------------------------------------------
  // Not rules: things worth saying that the doctrine has not made rules.
  if (cfg.grammar === "front-matter" && !graph.health.generatedDrift?.present) {
    notices.push(
      `No ${cfg.docsRoot}/registry/generated/graph.json — generated-drift cannot run. ` +
      "Run `factory-console registry` in the target project to derive it, or this notice will keep recurring."
    );
    notRun.push("generated-drift");
  }
  const usedRels = new Set(graph.edges.map((e) => e[2]));
  const unused = Object.entries(cfg.relations).filter(([, rel]) => !usedRels.has(rel));
  // Only worth saying once the corpus declares *some* edges. On a corpus with
  // none, every relation is unused and the notice is pure noise. Head-block
  // only: `relations` maps head-line KEYS, which the front-matter grammar
  // never reads — six of the ten shipped relations structurally cannot be
  // minted there, so under front-matter this notice would fire forever on a
  // perfectly clean corpus.
  if (cfg.grammar !== "front-matter" && unused.length && graph.edges.length) {
    notices.push(
      `${unused.length} declared relation${unused.length > 1 ? "s match" : " matches"} nothing in this corpus: ` +
      unused.map(([k, v]) => `"${k}" → ${v}`).join(", ") +
      ". Harmless if the project genuinely does not use them — a typo in factory.config.json otherwise."
    );
  }
  if (graph.schemaNote) notices.push(graph.schemaNote);
  if (!graph.charter) notices.push(`No charter at ${cfg.docsRoot}/${cfg.charter} — the strategy view will be thin.`);
  const nonApprovedOrphans = graph.health.orphanREQ.length - approvedOrphans.length;
  if (nonApprovedOrphans > 0) {
    notices.push(`${nonApprovedOrphans} further ${cfg.checks.orphanType} have no incoming edge but are not approved, so orphan-requirement does not fire on them.`);
  }

  const bySeverity = { error: 0, warn: 0 };
  for (const f of findings) bySeverity[f.severity]++;

  return { findings, bySeverity, notices, notRun, exitCode: bySeverity.error > 0 ? 1 : 0 };
}

/** Human-readable report for the terminal. */
export function formatReport(result, cfg, { projectName, root } = {}) {
  const out = [];
  const byRule = new Map();
  for (const f of result.findings) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }

  out.push(`\nconformance — ${projectName || root}`);
  out.push("─".repeat(72));

  for (const rule of RULES) {
    const fs = byRule.get(rule) || [];
    const configured = cfg.checks.severity[rule];
    if (configured === "off") {
      out.push(`  ${"off".padEnd(5)}  ${rule.padEnd(24)}  disabled in factory.config.json`);
      continue;
    }
    // A rule that never ran is not "clean" — it just has nothing to report
    // because it was never asked. `notRun` (e.g. requirement-off-journey on
    // a corpus with no journeys yet, generated-drift with no graph.json)
    // says so explicitly rather than looking indistinguishable from a rule
    // that ran and found zero problems.
    if (result.notRun?.includes(rule)) {
      out.push(`  ${"n/a".padEnd(5)}  ${rule.padEnd(24)}  could not run — see notices`);
      continue;
    }
    if (!fs.length) {
      out.push(`  ${"ok".padEnd(5)}  ${rule.padEnd(24)}  clean`);
      continue;
    }
    out.push(`  ${fs[0].severity.toUpperCase().padEnd(5)}  ${rule.padEnd(24)}  ${fs.length} finding${fs.length > 1 ? "s" : ""} — ${RULE_TEXT[rule]}`);
    for (const f of fs) {
      out.push(`         ${f.summary}`);
      if (f.detail) out.push(`           ${f.detail}`);
    }
  }

  if (result.notices.length) {
    out.push("");
    out.push("  notices (not rules)");
    for (const n of result.notices) out.push(`    · ${n}`);
  }

  out.push("─".repeat(72));
  out.push(
    result.bySeverity.error
      ? `  ${result.bySeverity.error} error · ${result.bySeverity.warn} warn — exit 1`
      : `  0 errors · ${result.bySeverity.warn} warn — exit 0`
  );
  return out.join("\n");
}
