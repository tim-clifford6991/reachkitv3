// corpus → graph.
//
// The governing rule, from which everything else follows:
//
//     Declared links are edges. Prose references are not.
//
// A narrative corpus mentions IDs constantly in argument — ReachKit has 1,790
// declared edges against 6,559 prose mentions. Treating mentions as edges
// produces a dense, confident, false graph, so mentions are indexed
// separately and never enter `edges`.
//
// Constructs this parser cannot read — ellipsis ranges such as
// `Implements: BP-001 … BP-096` — are refused and reported, never expanded.
// Expanding that one line would fabricate roughly 140 edges. A fabricated
// edge is worse than a missing one, because the whole value proposition is
// that every claim is checkable.
//
// Artifacts come in two shapes and both are load-bearing: one file per
// artifact (`dir`) and one table row per artifact (`table`). CON and ASM are
// rows. A model assuming artifact = file loses 169 of ReachKit's 458.

import { readFileSync, readdirSync, realpathSync } from "node:fs";

// 0.11.0 — corpus-volume reads these. Whole-file counts, `wc -w` / `wc -l`
// parity: whitespace-split tokens, and newline count. Recorded at parse time
// so the checker never re-reads a file the parser already has in hand.
const countWords = (text) => (text.match(/\S+/g) || []).length;
const countLines = (text) => (text.match(/\n/g) || []).length;
import { join, relative } from "node:path";
import { splitFrontmatter } from "./frontmatter.mjs";
import { readVerdict } from "../registry/index.mjs";
import { readRepo, globToRegExp } from "./git.mjs";
import { scanIndex } from "./code.mjs";

const RANGE_RE = /(…|\.\.\.)/;

const clip = (s, n) => (n && s.length > n ? { text: s.slice(0, n), full: s.length } : { text: s, full: s.length });

// The semantic type name a front-matter artifact's own `type:` field carries,
// keyed by the config's uppercase prefix — matches ReachKit v2's
// scripts/lib/frontmatter.mjs TYPE_BY_DIR exactly (that repo's directories
// and this config's type ids name the same five kinds). Used both to label a
// front-matter node when its own file has no front matter yet (title-only
// fallback) and to translate `checks.orphanType` (declared as "REQ") into the
// semantic key ("requirement") front-matter nodes actually carry.
const SEMANTIC_BY_PREFIX = { REQ: "requirement", BP: "blueprint", WO: "work-order", ADR: "decision", FB: "feedback", JN: "journey" };

/**
 * Title resolution chain, shared by both grammars: front-matter `title:` →
 * first `# ` heading → line 0. A corpus mid-migration to front-matter has
 * files that open with a `---` fence even while the project is still
 * configured for `head-block` — previously read as line 0, i.e. literally
 * "---". `preParsedData` lets the front-matter path skip re-parsing a block
 * it has already read; pass nothing to let this function detect the fence
 * itself.
 */
function resolveTitle(text, lines, preParsedData) {
  let data = preParsedData;
  if (data === undefined && text.startsWith("---\n")) {
    try {
      data = splitFrontmatter(text).data;
    } catch {
      data = null;
    }
  }
  if (data && typeof data.title === "string" && data.title.trim()) return data.title.trim();
  const heading = lines.find((l) => l.startsWith("# "));
  const src = heading ?? (lines[0] || "");
  return src
    .replace(/^#\s*/, "")
    .replace(/^[A-Z]+-\d{3}[a-z]?\s*[—–-]\s*/, "")
    .trim();
}

/** Case-insensitive key lookup after bold markers have been stripped. */
function keyAliasMap(cfg) {
  const keys = [
    ...Object.keys(cfg.relations),
    "Status",
    ...Object.keys(cfg.fields),
    ...cfg.metaFields,
    ...cfg.knownKeys,
  ];
  return Object.fromEntries(keys.map((k) => [k.toLowerCase(), k]));
}

/**
 * The status words the parser recognises in an artifact's head lines.
 * Ordered: declared vocabularies first, in config order, then the words
 * observed in real corpora but not declared. Order is significant — the
 * fallback pass returns the first token found anywhere in the line.
 */
function artifactStatusTokens(cfg) {
  const s = cfg.statuses;
  const out = [];
  for (const list of [s.artifact, s.WO, s.ADR, s.registry, s.observed.artifact]) {
    for (const t of list) if (!out.includes(t)) out.push(t);
  }
  return out;
}

function registryStatusTokens(cfg) {
  const s = cfg.statuses;
  const out = [];
  for (const list of [s.registry, s.observed.registry]) {
    for (const t of list) if (!out.includes(t)) out.push(t);
  }
  return out;
}

function parseStatus(raw, tokens) {
  const c = raw.replace(/[*`_]/g, "").trim().toLowerCase();
  // Clean: the line *is* the status word, or opens with it followed by a
  // separator ("approved — 2026-08-10").
  for (const t of tokens) {
    if (c === t || (c.startsWith(t) && /^[\s—,.\-]/.test(c.slice(t.length)))) {
      return { status: t, clean: true };
    }
  }
  // Dirty: the word appears somewhere inside a sentence. Recorded as the
  // status, but flagged — the corpus is telling us the field is prose.
  for (const t of tokens) if (new RegExp(`\\b${t}\\b`).test(c)) return { status: t, clean: false };
  return { status: null, clean: false };
}

// Canonical field order and upstream-edge map for the front-matter grammar —
// kept in lockstep with ReachKit v2's scripts/lib/frontmatter.mjs FIELD_ORDER
// and build-registry.mjs UPSTREAM_FIELD_BY_TYPE, byte for byte on the field
// names — with one exception: `code` (globs anchoring an artifact to its
// implementation) is this doctrine's own addition, appended after
// `supersedes`; ReachKit's generator has no such field and ignores it.
// `persona`/`steps` (Wave 2 Task 2) are the journey type's own fields —
// `steps` is an array of `{ step, exercises }` rows, read with the same
// block-mapping grammar `rests-on` already uses, and its `exercises` ids
// mint `[journey, requirement, "exercises"]` edges below rather than being
// folded into FM_EDGE_FIELDS (which is scalar-array-of-ids per field; a
// step's own free-text label has no analogue there).
// `wave` (Wave 3 Task 3) is a scalar, not an edge field — it names the row
// in `registry/waves.md` this work order belongs to, read the same way
// `persona` is: a bare string, surfaced in node meta (`Wave`) for the
// client, never itself an edge (there is no node named "W1" for one to
// target). Appended last, after `steps`.
const FM_FIELD_ORDER = [
  "id", "type", "title", "status", "ui", "severity", "origin",
  "satisfies", "covers", "implements", "decides-for", "about",
  "depends-on", "blocked-by", "cites-retired", "rests-on", "supersedes",
  "code", "persona", "steps", "wave",
];
const FM_UPSTREAM_FIELD_BY_TYPE = {
  requirement: null, blueprint: "satisfies", decision: "decides-for",
  "work-order": "implements", feedback: "about",
};
// The array-of-id fields minted as edges. `rests-on` is deliberately absent:
// its entries are `{claim, disposition, accepted-by}` objects (assumption
// rows), not artifact ids — there is no node for an edge to target, so it is
// read (never crashes) but never becomes a graph edge. In FIELD_ORDER's own
// order, so edge order is deterministic rather than object-key order.
const FM_EDGE_FIELDS = FM_FIELD_ORDER.filter((f) =>
  ["satisfies", "covers", "implements", "decides-for", "about", "depends-on", "blocked-by", "cites-retired", "supersedes"].includes(f)
);

// `## TST-###` (and `TST-003-R`, `TST-021-R2`, …) headings inside a
// migrated work order's body become `validation` nodes — mirrors ReachKit
// v2's build-registry.mjs TST_HEADING_RE exactly. TST has no directory of
// its own; containment in a work order's body IS the structure.
const TST_HEADING_RE = /^#{1,3}\s+(TST-\d+(?:-R\d*)?)\s+[—-]\s*(.+?)\s*$/gm;
// Same shape, un-anchored to a stream, for testing one line at a time.
const TST_HEADING_RE_ONE = /^#{1,3}\s+(TST-\d+(?:-R\d*)?)\s+[—-]\s*(.+?)\s*$/;
// A heading whose first token *is* a TST id — the only near-miss worth
// reporting. `### Repairs after TST-042` mentions one; it does not claim to be
// one, and firing on it would bury the two headings that do.
const TST_NEAR_MISS_RE = /^#{1,6}\s+TST-\d+\S*.*$/gm;

// The verdict reader is IMPORTED, not copied. This module used to carry its
// own 4000-char-window copy of ReachKit v2's readVerdict(), with a comment
// ending: "WO-116 already fixed build-registry.mjs's own window to read 'the
// line that declares one' — this port must match that fix, not a fix of its
// own that diverges from it." WO-116 has now landed, and matching it by
// re-typing it would be a third copy of one capability (constitution rule
// 7.1) whose only job is to agree with the other two. The consequence is
// measured, not asserted: with the copy left behind at the old rule, this
// console reported 45 `generated-drift` findings at severity `error` against
// ReachKit v2's own corpus — every one of them this module disagreeing with
// the graph.json it exists to verify.
//
// No import cycle: src/registry/index.mjs reaches only ../extract/
// frontmatter.mjs (a leaf, not this file) and ../config.mjs (node builtins
// only).

/**
 * The "one file per artifact" pass for the front-matter grammar: id / type /
 * status / title and typed edges come from a `---`-fenced YAML block
 * (frontmatter.mjs) rather than bulleted head lines, and a work order's body
 * additionally yields `validation` nodes from `## TST-###` headings.
 *
 * A file with no opening fence is not an error — the same "tolerates partial
 * migration" posture as ReachKit v2's own build-registry.mjs — it simply
 * falls back to the shared title-resolution chain and a filename-derived id,
 * carrying no edges of its own.
 */
function extractFrontMatter({ fileTypes, DOCS, FILE_RE, cfg, nodes, edges, health, noteMention, journeys, fieldVocab }) {
  for (const type of fileTypes) {
    let files;
    try {
      files = readdirSync(join(DOCS, type.dir)).sort();
    } catch {
      continue;
    }
    const dirSemantic = SEMANTIC_BY_PREFIX[type.id] || type.dir;

    for (const f of files) {
      if (!f.endsWith(".md") || f.startsWith("_")) continue;
      const text = readFileSync(join(DOCS, type.dir, f), "utf8");

      let parsed;
      try {
        parsed = splitFrontmatter(text);
      } catch {
        // A fence that opens but never validly closes is treated the same
        // as "not yet migrated" here — never a crash. (frontmatter.mjs still
        // throws on it, by design, for any caller that needs to tell the
        // two cases apart; this one doesn't.)
        parsed = { data: null, body: text };
      }
      const data = parsed.data;

      const idm = f.match(FILE_RE);
      const id = (data && typeof data.id === "string" && data.id) || (idm ? idm[0] : null);
      if (!id) continue;

      const nodeType = (data && typeof data.type === "string" && data.type) || dirSemantic;
      const lines = text.split("\n");
      const title = resolveTitle(text, lines, data);
      const bodyText = data !== null ? parsed.body : text;
      const status = data && typeof data.status === "string" ? data.status : null;

      // Per-type status vocabulary now comes from config (constitution rule
      // 2.2b: "one status vocabulary per artifact type, and each directory
      // keeps its own") rather than a hardcoded table — see
      // factory.config.json's statuses.requirement / .blueprint / etc.
      const vocab = cfg.statuses[nodeType];
      let vocabDrift = !!(status && vocab && !vocab.includes(status));

      const meta = {};
      if (data) {
        if (data.severity) meta.Severity = data.severity;
        // `origin` defaults to "forward" only at the point of use, never in
        // storage — mirrors build-registry.mjs originOf(): silence is never
        // an exemption, only a declared "transcribed" claims it.
        meta.Origin = data.origin === "transcribed" ? "transcribed" : "forward";
        const wantUpstream = FM_UPSTREAM_FIELD_BY_TYPE[nodeType];
        if (wantUpstream && !(wantUpstream in data)) vocabDrift = true;
        // A journey node's meta carries its persona, the same way any other
        // type's meta carries Severity — surfaced for the client, not read
        // back by anything in this module.
        if (typeof data.persona === "string" && data.persona) meta.Persona = data.persona;
        // `wave`: which row of registry/waves.md this artifact belongs to —
        // meta only, read for ANY node type the same way `code` is (a work
        // order is the only type that carries it in practice, but nothing
        // here assumes that). rule wave-off-record is what checks it against
        // the record; this is only the read.
        if (typeof data.wave === "string" && data.wave) meta.Wave = data.wave;
      }
      if (vocabDrift) health.vocab[nodeType] = (health.vocab[nodeType] || 0) + 1;

      // `code`: globs anchoring this artifact to its implementation — read
      // for ANY node type, kept on the node internally (never emitted in the
      // per-node client payload; the derived `code.anchors` map carries it)
      // and tracked in fieldCarriers exactly like an edge field, so rule 5.5
      // sees its adoption.
      const codeGlobs = data && Array.isArray(data.code) ? data.code.filter((v) => typeof v === "string") : [];

      // `ui:` (0.8.0) — the UX-preview gate's field lives in front-matter.
      // Before 0.8.0 the doctrine wrote it as a head bullet this branch never
      // read, so `ui` was hardcoded false and rule 7.3's gate was
      // mechanically unenforceable. The value vocabulary is cfg.fields' own
      // (canonical yes/no); tolerated spellings still resolve, and every
      // observed value is recorded in fieldVocab so `field-vocabulary`
      // reports drift, exactly as the head-block branch always has.
      let ui = false;
      if (data) {
        for (const field of Object.values(cfg.fields)) {
          const rawVal = data[field.key.toLowerCase()];
          if (typeof rawVal !== "string" || !rawVal) continue;
          const w = ((rawVal.replace(/[*`]/g, "").trim().toLowerCase().match(/^[a-z]+/)) || [""])[0];
          if (!fieldVocab.has(field.key)) fieldVocab.set(field.key, new Map());
          const v = fieldVocab.get(field.key);
          v.set(w, (v.get(w) || 0) + 1);
          const truthy = [...field.true, ...(field.tolerate?.true || [])];
          if (field.key === "UI") ui = truthy.includes(w);
        }
      }

      const body = clip(bodyText, cfg.bodyCap);
      nodes.set(id, {
        id, type: nodeType, title, status, ui, meta, code: codeGlobs,
        file: `${type.dir}/${f}`, body: body.text, bytes: body.full,
        words: countWords(text), lines: countLines(text), restsOn: [],
      });
      noteMention(id, bodyText);

      if (codeGlobs.length) {
        if (!health.fieldCarriers.code) health.fieldCarriers.code = new Set();
        health.fieldCarriers.code.add(id);
      }

      if (data) {
        for (const field of FM_EDGE_FIELDS) {
          const vals = data[field];
          if (!Array.isArray(vals)) continue;
          // silent-index (rule 5.5) tracks whether the FIELD is populated at
          // all, independent of whether any of its ids resolve to a node —
          // mirrors build-registry.mjs's coverageStat(), which reads the raw
          // front-matter data rather than the post-resolution edge list.
          if (vals.length) {
            if (!health.fieldCarriers[field]) health.fieldCarriers[field] = new Set();
            health.fieldCarriers[field].add(id);
          }
          for (const t of vals) {
            if (typeof t !== "string" || !t || t === id) continue;
            // A range token is refused HERE, as `ellipsis-range` (warn) —
            // the finding the doctrine promises. Before 0.8.0 it fell
            // through to the dangling-id path (error): the fabrication was
            // equally prevented, but the reported finding and severity were
            // not the ones the WO template and skill name.
            if (RANGE_RE.test(t)) {
              health.rangeLines.push({ id, key: field, line: t.trim().slice(0, 90) });
              continue;
            }
            edges.push({ from: id, to: t, rel: field });
          }
        }
        // `rests-on` mints no edge (its entries are claim/disposition rows,
        // not artifact ids — see FM_EDGE_FIELDS's own comment) but it is
        // still an edge-shaped field for rule 5.5's purposes, so it is
        // tracked the same way.
        const rests = data["rests-on"];
        if (Array.isArray(rests) && rests.length) {
          if (!health.fieldCarriers["rests-on"]) health.fieldCarriers["rests-on"] = new Set();
          health.fieldCarriers["rests-on"].add(id);
          // 0.11.0 — the rows themselves ride on the node (claim and
          // disposition only; `accepted-by` and the argument stay in the
          // file) so assumption-budget and open-assumption-on-done read
          // them without a second parse. A row that is not a mapping is
          // dropped here and stays visible to `assumptions.md`'s own
          // off-grammar bucket — this projection never adjudicates.
          nodes.get(id).restsOn = rests
            .filter((r) => r && typeof r === "object" && !Array.isArray(r))
            .map((r) => ({
              claim: typeof r.claim === "string" ? r.claim : "",
              disposition: r.disposition == null ? null : String(r.disposition),
            }));
        }

        // Journeys: `steps:` is a block list of `{ step, exercises }` rows —
        // read with the same grammar rests-on already uses. A non-array
        // `steps`, or a row missing a `step` string, is not this parser's
        // problem to adjudicate: it is dropped silently (a step that hasn't
        // been written yet is not a defect), never a crash. Every kept row's
        // `exercises` mints one `[journey, requirement, "exercises"]` edge
        // per id — deduped downstream like every other edge — and always
        // carries an `exercises` array in `graph.journeys`, `[]` when a step
        // exercises nothing yet, so the shape is explicit rather than
        // conditional.
        if (nodeType === "journey") {
          const rawSteps = Array.isArray(data.steps) ? data.steps : [];
          const stepList = [];
          let anyExercises = false;
          for (const row of rawSteps) {
            if (!row || typeof row !== "object" || typeof row.step !== "string" || !row.step) continue;
            const exercises = Array.isArray(row.exercises)
              ? row.exercises.filter((v) => typeof v === "string" && v)
              : [];
            if (exercises.length) anyExercises = true;
            stepList.push({ step: row.step, exercises });
            for (const t of exercises) edges.push({ from: id, to: t, rel: "exercises" });
          }
          journeys.set(id, {
            persona: typeof data.persona === "string" ? data.persona : null,
            steps: stepList,
          });
          if (anyExercises) {
            if (!health.fieldCarriers.exercises) health.fieldCarriers.exercises = new Set();
            health.fieldCarriers.exercises.add(id);
          }
        }
      }

      // Validation nodes: `## TST-###` headings inside a work order's body.
      if (nodeType === "work-order") {
        // Headings are pre-scanned so each section is bounded by the NEXT
        // one's start rather than running to EOF — the same bound
        // build-registry.mjs computes, and a prerequisite of readVerdict's
        // last-declaration rule rather than a tidy-up.
        TST_HEADING_RE.lastIndex = 0;
        const tstHeadings = [];
        let m;
        while ((m = TST_HEADING_RE.exec(bodyText))) {
          tstHeadings.push({ id: m[1], title: m[2].trim(), start: m.index, end: m.index + m[0].length });
        }
        for (let i = 0; i < tstHeadings.length; i++) {
          const h = tstHeadings[i];
          if (nodes.has(h.id)) continue; // first declaration wins; never a crash
          const section = bodyText.slice(h.end, i + 1 < tstHeadings.length ? tstHeadings[i + 1].start : bodyText.length);
          nodes.set(h.id, {
            id: h.id, type: "validation", title: h.title, status: readVerdict(section),
            ui: false, meta: {}, file: `${type.dir}/${f}`, body: "", bytes: 0,
          });
          edges.push({ from: h.id, to: id, rel: "validates" });
        }

        // A heading that opens with a TST id but misses the grammar is not a
        // validation report to this parser, and it says so nowhere: WO-084's
        // `### TST-045 (validator, …)` — a parenthesis where the grammar
        // wants a dash — left a done work order looking unvalidated for a
        // week while its PASS WITH FINDINGS report sat in the file. Silence
        // is the defect; the near-miss is reported so a human can adjudicate.
        // Headings that merely *mention* a TST mid-sentence are not candidates.
        TST_NEAR_MISS_RE.lastIndex = 0;
        let nm;
        while ((nm = TST_NEAR_MISS_RE.exec(bodyText))) {
          if (TST_HEADING_RE_ONE.test(nm[0])) continue;
          health.tstHeadings.push({ id, line: nm[0].trim().slice(0, 90) });
        }
      }
    }
  }
}

/**
 * Parse a corpus into nodes, declared edges, a mention index, health
 * findings, the schema and the strategy layer.
 *
 * @param {string} projectRoot
 * @param {object} cfg  a validated factory.config.json
 */
export function extract(projectRoot, cfg) {
  const DOCS = join(projectRoot, cfg.docsRoot);

  const typeIds = cfg.types.map((t) => t.id);
  const allPrefixes = [...typeIds, ...cfg.externalIdPrefixes];
  const external = new Set(cfg.externalIdPrefixes);
  if (cfg.grammar === "front-matter") {
    // TST is a real node type under this grammar (derived from `## TST-###`
    // headings), not a cited-but-nodeless external prefix — a dangling TST
    // id is now a genuine defect. CON/ASM are the opposite: constitution
    // rule 2.3 retired them as node types, so a `cites-retired` entry naming
    // one is history, not a defect — mirrors ReachKit v2's build-registry.mjs
    // classifyUnresolvedEdges() split between "retired" and "defect".
    external.delete("TST");
    external.add("CON");
    external.add("ASM");
  }
  const ID_RE = new RegExp(`\\b(${allPrefixes.join("|")})-(\\d{3})([a-z])?\\b`, "g");

  const fileTypes = cfg.types.filter((t) => t.dir);
  const tableTypes = cfg.types.filter((t) => t.table);
  // The seed applies one combined prefix regex in every directory, so a
  // mis-filed BP inside requirements/ keeps its own ID and takes the
  // directory's type — which is exactly how you notice it.
  const FILE_RE = new RegExp(`^(${fileTypes.map((t) => t.id).join("|")})-(\\d{3})([a-z])?`);

  const KEY_ALIAS = keyAliasMap(cfg);
  const STATUS_TOKENS = artifactStatusTokens(cfg);
  const ROW_TOKENS = registryStatusTokens(cfg);
  const metaCapture = new Set(cfg.metaFields);
  const uiFields = Object.values(cfg.fields);

  const nodes = new Map();
  const edges = [];
  const journeys = new Map();
  const isFrontMatter = cfg.grammar === "front-matter";
  const mentions = new Map();
  const fieldVocab = new Map();   // field name → Map(value → count)
  const keyCase = new Map();      // as-written key → count
  const health = { rangeLines: [], dangling: new Map(), orphans: [], vocab: {}, fieldCarriers: {}, tstHeadings: [] };

  const idsOn = (s) => {
    const o = [];
    let m;
    ID_RE.lastIndex = 0;
    while ((m = ID_RE.exec(s))) o.push(m[0]);
    return o;
  };
  const noteMention = (from, text) => {
    for (const t of new Set(idsOn(text))) {
      if (t === from) continue;
      if (!mentions.has(t)) mentions.set(t, new Set());
      mentions.get(t).add(from);
    }
  };

  // ---- one file per artifact ---------------------------------------------
  if (isFrontMatter) {
    // Front-matter grammar: id/type/status/title and typed edges come from a
    // `---`-fenced YAML block, not bulleted head lines. CON/ASM are not
    // scraped here at all (see the "one table row" section below) — under
    // this grammar they are `rests-on`/`blocked-by` states on the owning
    // artifact, not standalone nodes (constitution rule 2.3).
    extractFrontMatter({ fileTypes, DOCS, FILE_RE, cfg, nodes, edges, health, noteMention, journeys, fieldVocab });
  } else {
  for (const type of fileTypes) {
    let files;
    try {
      files = readdirSync(join(DOCS, type.dir)).sort();
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".md") || f.startsWith("_")) continue;
      const idm = f.match(FILE_RE);
      if (!idm) continue;
      const id = idm[0];

      const text = readFileSync(join(DOCS, type.dir, f), "utf8");
      const lines = text.split("\n");
      const title = resolveTitle(text, lines);
      const headEnd = lines.findIndex((l) => l.startsWith("## "));
      const head = lines.slice(0, headEnd === -1 ? lines.length : headEnd);

      let status = null;
      let clean = false;
      let ui = false;
      const meta = {};

      for (const raw of head) {
        const line = raw.replace(/\*\*/g, "");
        const lm = line.match(/^-\s+([A-Za-z][A-Za-z /-]+):\s*(.*)$/);
        if (!lm) continue;
        const rawKey = lm[1].trim();
        const val = lm[2];
        const key = KEY_ALIAS[rawKey.toLowerCase()] || rawKey;
        keyCase.set(rawKey, (keyCase.get(rawKey) || 0) + 1);

        if (key === "Status") {
          const p = parseStatus(val, STATUS_TOKENS);
          status = p.status;
          clean = p.clean;
          meta.Status = val.trim();
          continue;
        }

        const field = uiFields.find((x) => x.key === key);
        if (field) {
          const w = ((val.replace(/[*`]/g, "").trim().toLowerCase().match(/^[a-z]+/)) || [""])[0];
          if (!fieldVocab.has(field.key)) fieldVocab.set(field.key, new Map());
          const v = fieldVocab.get(field.key);
          v.set(w, (v.get(w) || 0) + 1);
          // Read the corpus as it is: `tolerate` spellings still resolve
          // correctly, and field-vocabulary reports them as drift.
          const truthy = [...field.true, ...(field.tolerate?.true || [])];
          ui = truthy.includes(w);
          meta[field.key] = val.trim();
          continue;
        }

        if (metaCapture.has(key)) meta[key] = val.trim();

        const rel = cfg.relations[key];
        if (!rel) continue;
        if (RANGE_RE.test(val)) {
          health.rangeLines.push({ id, key, line: val.trim().slice(0, 90) });
          continue;
        }
        for (const t of idsOn(val)) if (t !== id) edges.push({ from: id, to: t, rel });
      }

      if (!clean && status) health.vocab[type.id] = (health.vocab[type.id] || 0) + 1;
      noteMention(id, text);

      const body = clip(text, cfg.bodyCap);
      nodes.set(id, {
        id, type: type.id, title, status, ui, meta,
        file: `${type.dir}/${f}`, body: body.text, bytes: body.full,
        words: countWords(text), lines: countLines(text),
      });
    }
  }
  } // end head-block "one file per artifact"

  // ---- one table row per artifact ---------------------------------------
  // The registry files hold several differently-shaped tables, so the status
  // is found by scanning the row for a recognised word rather than by column
  // position. What counts as "recognised" is config, and the gap between
  // `statuses.registry` and `statuses.observed.registry` is precisely what
  // `status-off-grammar` reports.
  //
  // Front-matter grammar does not scrape this at all: constitution rule 2.3
  // retired CON/ASM as standalone artifacts — they live as `rests-on` and
  // `blocked-by` states on the artifact that declares them, not as rows in a
  // registry table.
  const ROW_STATUS_RE = new RegExp(`\\b(${ROW_TOKENS.join("|")})\\b`, "i");

  for (const type of isFrontMatter ? [] : tableTypes) {
    let txt;
    try {
      txt = readFileSync(join(DOCS, type.table), "utf8");
    } catch {
      continue;
    }
    const idHead = new RegExp(`^${type.id}-\\d{3}`);
    let header = [];
    for (const line of txt.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("|")) continue;
      const cells = t.split("|").slice(1, -1).map((c) => c.trim());
      if (/^-+$/.test(cells[0]?.replace(/[: ]/g, "")) || cells.every((c) => /^:?-+:?$/.test(c))) continue;
      const idm = cells[0]?.replace(/[*`]/g, "").match(idHead);
      if (!idm) {
        if (/^ID$/i.test(cells[0])) header = cells;
        continue;
      }
      const id = idm[0];
      if (nodes.has(id)) continue;

      const rest = cells.slice(1);
      const detail = header.length
        ? rest.map((c, i) => `**${header[i + 1] || `Field ${i + 2}`}**\n\n${c}`).join("\n\n")
        : rest.join("\n\n");
      const flat = detail.replace(/[*`]/g, "");
      const st = (flat.match(ROW_STATUS_RE) || [])[1];
      const title = flat.replace(/\s+/g, " ").slice(0, 110).trim();
      const body = clip(`# ${id}\n\n${detail}`, cfg.rowCap);

      nodes.set(id, {
        id, type: type.id, title,
        status: st ? st.toLowerCase() : null,
        ui: false,
        meta: { Source: type.table },
        file: type.table, body: body.text, bytes: body.full,
      });
      noteMention(id, cells.join(" "));
    }
  }

  // ---- declared edges ----------------------------------------------------
  const seen = new Set();
  const declared = [];
  for (const e of edges) {
    const k = `${e.from}>${e.to}>${e.rel}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!nodes.has(e.to)) {
      // An external prefix (TST) is cited by design and has no artifact
      // behind it — that is not a dangling ID.
      if (external.has(e.to.split("-")[0])) continue;
      if (!health.dangling.has(e.to)) health.dangling.set(e.to, []);
      health.dangling.get(e.to).push(e.from);
      continue;
    }
    declared.push(e);
  }

  // `checks.orphanType` is always declared in the config's uppercase prefix
  // ("REQ"); front-matter nodes carry the semantic name ("requirement") as
  // their `type` instead, so the comparison has to go through the same map
  // used to derive that name from a file's directory.
  const orphanType = isFrontMatter ? (SEMANTIC_BY_PREFIX[cfg.checks.orphanType] || cfg.checks.orphanType) : cfg.checks.orphanType;
  // Under the front-matter grammar, only a `satisfies` edge FROM a blueprint
  // discharges a requirement orphan — rule 5.4: `covers` is derivation's
  // sibling, "true and useful, but not an authorising ancestor", and a
  // `depends-on`/`about`/`cites-retired` mention is weaker still. The
  // head-block grammar's `cited` set stays "any declared edge" unchanged
  // (gate.mjs pins its exact numbers against the legacy prototype).
  const citedForOrphan = isFrontMatter
    ? new Set(declared.filter((e) => e.rel === "satisfies" && nodes.get(e.from)?.type === "blueprint").map((e) => e.to))
    : new Set(declared.map((e) => e.to));
  for (const n of nodes.values()) {
    if (n.type === orphanType && !citedForOrphan.has(n.id)) health.orphans.push(n.id);
  }

  // ---- registry contradiction (head-block grammar only) ------------------
  // Rule 1 settles it: the artifact file wins, the registry is the copy, so
  // the registry is reported as the thing to fix. Under the front-matter
  // grammar this stops reading the archived hand registry entirely — see
  // "generated drift" below, which cross-checks against the DERIVED registry
  // instead (docs/registry/generated/graph.json), the only one this grammar
  // still authors.
  const registryDisagree = [];
  if (!isFrontMatter) {
    const PIPE_TOKENS = cfg.statuses.WO;
    try {
      const tr = readFileSync(join(DOCS, cfg.traceability.file), "utf8");
      const cellIsId = new RegExp(`^\\*{0,2}\`?(${cfg.traceability.types.join("|")})-\\d{3}[a-z]?\`?\\*{0,2}$`);
      for (const line of tr.split("\n")) {
        if (!line.trim().startsWith("|")) continue;
        const cells = line.split("|").map((c) => c.trim());
        const idCell = cells.find((c) => cellIsId.test(c));
        if (!idCell) continue;
        const id = idCell.replace(/[*`]/g, "");
        const n = nodes.get(id);
        if (!n || !n.status) continue;
        const row = cells
          .map((c) => c.replace(/[*`]/g, "").toLowerCase().trim())
          .find((c) => PIPE_TOKENS.includes(c));
        if (row && row !== n.status) registryDisagree.push({ id, file: n.status, registry: row });
      }
    } catch { /* no traceability registry — reported by the checker, not here */ }
  }
  const uniqReg = [...new Map(registryDisagree.map((r) => [r.id, r])).values()];

  // ---- generated drift (front-matter grammar only) -----------------------
  // Cross-checks this console's own parse against
  // docs/registry/generated/graph.json — the file scripts/build-registry.mjs
  // projects from the same front-matter this parser reads. Not configurable:
  // that path is build-registry.mjs's own fixed convention, the same way
  // `registry/generated` is not a config choice for the generator itself.
  // Only ids present in BOTH sides are compared (a node absent from one side
  // is a migration/staleness question the drift check does not adjudicate);
  // an absent generated/graph.json is a notice, not a defect — plenty of
  // front-matter corpora will never run `npm run registry`.
  let generatedDrift = { present: false, mismatches: [] };
  if (isFrontMatter) {
    try {
      const gen = JSON.parse(readFileSync(join(DOCS, "registry/generated/graph.json"), "utf8"));
      const genNodes = gen.nodes || {};
      const mismatches = [];
      for (const [id, n] of nodes) {
        const g = genNodes[id];
        if (!g || g.status === undefined) continue;
        if (g.status !== n.status) mismatches.push({ id, parsed: n.status, generated: g.status });
      }
      generatedDrift = { present: true, mismatches };
    } catch { /* no generated/graph.json yet — reported by the checker as a notice, not here */ }
  }

  // ---- schema ------------------------------------------------------------
  const { tables, schemaNote } = readSchema(projectRoot, cfg.schema);

  // ---- strategy layer ----------------------------------------------------
  let charter = "";
  try {
    charter = clip(readFileSync(join(DOCS, cfg.charter), "utf8"), cfg.charterCap).text;
  } catch { /* no charter yet */ }

  const modules = [];
  try {
    const sm = readFileSync(join(DOCS, cfg.structureMap), "utf8");
    for (const line of sm.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("|") || t.includes("---")) continue;
      const c = t.split("|").slice(1, -1).map((x) => x.trim());
      if (c.length < 3 || /^Module/i.test(c[0])) continue;
      if (!/`/.test(c[0])) continue;
      modules.push({ path: c[0].replace(/`/g, ""), resp: c[1].replace(/<!--.*?-->/g, "").trim(), bp: c[2] });
    }
  } catch { /* no structure map yet */ }

  // ---- waves (front-matter grammar convention: registry/waves.md) --------
  // Not itself an artifact type — no node, no edges. A markdown table naming
  // which work orders belong to which wave and whether it is still open:
  // `| Wave | Goal | Work orders | Status |`. The current wave is the last
  // `open` row in file order (a WO's own `wave:` meta is the per-node half
  // of this; wave-off-record is what checks the two agree). Not a config
  // key — same fixed-convention posture as `registry/generated/graph.json`
  // above: a corpus without the file is a real, quiet zero.
  //
  // The Work orders cell may carry a MoSCoW annotation per id —
  // `WO-001 (Must), WO-002 (Should)` — because `/wave propose` writes the
  // cell that way (`commands/wave.md`, `skills/wave-planning/SKILL.md`).
  // Each comma-separated entry is read as one WO id (`WO-\d{3}[a-z]?`) plus
  // an optional trailing `(Must|Should|Could|Won't)`; `wos` stays bare ids
  // (wave-off-record and everything else reads it unannotated), the
  // annotations land separately in `priorities` (`{}` when none appear).
  const WAVE_WO_ID_RE = /\b(WO-\d{3}[a-z]?)\b/;
  const WAVE_PRIORITY_RE = /\((Must|Should|Could|Won't)\)/;
  // `present` distinguishes the file not existing yet from it existing with
  // zero data rows — both produce `list: []` here, but wave-off-record's
  // notice reads different words for the two (dogfood finding 1: "no file"
  // and "file with nothing in it yet" are not the same fact for an owner).
  let waves = { current: null, list: [], present: false };
  if (isFrontMatter) {
    try {
      const wtxt = readFileSync(join(DOCS, "registry/waves.md"), "utf8");
      const rows = [];
      for (const line of wtxt.split("\n")) {
        const t = line.trim();
        // The separator row (`|---|:--|--:|`) is pipes, colons, dashes and
        // whitespace only — a data row that merely contains "---" in a cell
        // (a goal like "Ship the A --- B bridge") also has letters, so this
        // guard doesn't drop it the way a bare `.includes("---")` would.
        if (!t.startsWith("|") || /^[\s|:-]+$/.test(t)) continue;
        const c = t.split("|").slice(1, -1).map((x) => x.trim());
        if (c.length < 4 || /^Wave$/i.test(c[0])) continue;
        const wos = [];
        const priorities = {};
        if (c[2]) {
          for (const entry of c[2].split(",")) {
            const idm = entry.trim().match(WAVE_WO_ID_RE);
            if (!idm) continue;
            wos.push(idm[1]);
            const pm = entry.match(WAVE_PRIORITY_RE);
            if (pm) priorities[idm[1]] = pm[1];
          }
        }
        rows.push({ id: c[0], goal: c[1], wos, priorities, status: c[3].toLowerCase() });
      }
      const openRows = rows.filter((r) => r.status === "open");
      waves = { current: openRows.length ? openRows[openRows.length - 1].id : null, list: rows, present: true };
    } catch { /* no registry/waves.md yet */ }
  }

  // ---- code layer (derived, never declared by hand) ----------------------
  // git is the event stream 8090 gets from a webhook. Commit messages citing
  // WO-### are declared links (the doctrine mandates them) — prose in a
  // commit body is no more an edge than prose in a document; only the id
  // token is read. Ranges are refused, as everywhere else.
  let code = { present: false };
  if (cfg.code) {
    const repo = readRepo(join(projectRoot, cfg.code.root));
    if (repo) {
      // `repo.root` comes back from `git rev-parse --show-toplevel`, which
      // resolves symlinks (macOS's /tmp → /private/tmp among them); realpath
      // DOCS the same way before computing the relative path, or a project
      // rooted under a symlinked tmp dir gets a docsPrefix full of "../".
      let realDocs;
      try {
        realDocs = realpathSync(DOCS);
      } catch {
        realDocs = DOCS;
      }
      const docsPrefix = relative(repo.root, realDocs).replace(/\\/g, "/");
      const commits = [];
      const unresolved = {};
      const ranges = [];
      for (const c of repo.commits) {
        const wo = [];
        for (const ref of c.refs) {
          if (nodes.has(ref)) wo.push(ref);
          else unresolved[ref] = (unresolved[ref] || 0) + 1;
        }
        commits.push({ h: c.short, d: c.date, s: clip(c.subject, 120).text, wo, files: c.files });
        for (const text of c.ranges) ranges.push({ h: c.short, text });
      }

      const anchors = {};
      const anchoredFiles = new Set();
      for (const n of nodes.values()) {
        if (!n.code || !n.code.length) continue;
        // Compiled once per node rather than once per (node, tracked file)
        // pair — globToRegExp is pure per glob string, so re-running it
        // inside the filter recompiled the same regex for every tracked
        // file on every anchored node.
        const res = n.code.map(globToRegExp);
        const files = repo.tracked.filter((f) => res.some((re) => re.test(f))).sort();
        anchors[n.id] = { globs: n.code, files };
        for (const f of files) anchoredFiles.add(f);
      }

      // The code index: imports and routes over the same tracked-file list,
      // scanned once and shared by every anchor below. Blast radius is
      // deliberately shallow — the controller's ruling: direct importers
      // only, one hop, and a file that is itself anchored never counts
      // towards its own blast radius even when it imports another anchored
      // file. `anchors[id].routes` uses the identical one-hop rule in the
      // other direction: a route's page file counts if it IS an anchored
      // file, or if it directly imports one.
      const idx = scanIndex(repo.root, repo.tracked);
      const importsByFrom = new Map(); // file → Set(files it imports)
      const importsByTo = new Map();   // file → Set(files that import it)
      for (const [from, to] of idx.imports) {
        if (!importsByFrom.has(from)) importsByFrom.set(from, new Set());
        importsByFrom.get(from).add(to);
        if (!importsByTo.has(to)) importsByTo.set(to, new Set());
        importsByTo.get(to).add(from);
      }
      for (const [id, a] of Object.entries(anchors)) {
        const anchoredSet = new Set(a.files);
        const importers = new Set();
        for (const f of a.files) {
          for (const from of importsByTo.get(f) || []) {
            if (!anchoredSet.has(from)) importers.add(from);
          }
        }
        a.blast = importers.size;
        const routeSet = new Set();
        for (const r of idx.routes) {
          const imports = importsByFrom.get(r.file);
          const reaches = anchoredSet.has(r.file) || (imports && [...imports].some((t) => anchoredSet.has(t)));
          if (reaches) routeSet.add(r.route);
        }
        a.routes = [...routeSet].sort();
      }

      code = {
        present: true,
        head: repo.head,
        root: cfg.code.root,
        docsPrefix,
        commits,
        unresolved,
        ranges,
        anchors,
        index: idx,
        counts: {
          commits: commits.length,
          cited: commits.filter((c) => c.wo.length > 0).length,
          anchored: anchoredFiles.size,
        },
      };
    }
  }

  // ---- assemble ----------------------------------------------------------
  const statusCounts = (t) => {
    const c = {};
    for (const n of nodes.values()) if (n.type === t) c[n.status || "unset"] = (c[n.status || "unset"] || 0) + 1;
    return c;
  };

  // Front-matter nodes carry semantic type names ("requirement", "validation",
  // …) rather than the config's uppercase prefixes, and `validation` has no
  // entry in `cfg.types` at all — it exists only as struct derived from a
  // work order's own body. Keys for per-type counts and statuses are drawn
  // from the nodes actually produced, not from the config, whenever this
  // grammar is in play.
  const countKeys = isFrontMatter ? [...new Set([...nodes.values()].map((n) => n.type))].sort() : typeIds;

  const counts = {
    total: nodes.size,
    declaredEdges: declared.length,
    mentionPairs: [...mentions.values()].reduce((a, s) => a + s.size, 0),
  };
  for (const t of countKeys) counts[t] = [...nodes.values()].filter((n) => n.type === t).length;

  const primaryField = uiFields[0]?.key;

  // silent-index (rule 5.5) coverage: for every edge-shaped field, how many
  // of ALL nodes in the corpus carry it — the same "whole graph" denominator
  // build-registry.mjs's own computeGraphCoverage() uses for graph.json's
  // `coverage` block, deliberately including types (e.g. `validation`) that
  // structurally can never carry the field, because that dilution is exactly
  // what makes a near-zero fraction visible as near-zero.
  const fieldCoverage = {};
  if (isFrontMatter) {
    for (const field of [...FM_EDGE_FIELDS, "rests-on", "code", "exercises"]) {
      fieldCoverage[field] = { carrying: health.fieldCarriers[field]?.size || 0, total: nodes.size };
    }
  }

  return {
    counts,
    status: Object.fromEntries(countKeys.map((t) => [t, statusCounts(t)])),
    nodes: [...nodes.values()].map((n) => ({
      i: n.id, y: n.type, t: n.title, s: n.status, u: n.ui ? 1 : 0,
      m: n.meta, f: n.file, b: n.body, z: n.bytes,
      // 0.11.0 — whole-file words and lines (file-shaped nodes only; a
      // table row or a TST section has neither) and the node's rests-on
      // rows (front-matter grammar only; `[]` elsewhere).
      ...(typeof n.words === "number" ? { w: n.words, l: n.lines } : {}),
      a: n.restsOn ?? [],
    })),
    edges: declared.map((e) => [e.from, e.to, e.rel]),
    journeys: Object.fromEntries(journeys),
    waves,
    tables, schemaNote, charter, modules, code,
    uiVocab: Object.fromEntries(fieldVocab.get(primaryField) || []),
    fieldVocab: Object.fromEntries([...fieldVocab].map(([k, v]) => [k, Object.fromEntries(v)])),
    keyCase: Object.fromEntries([...keyCase].filter(([k]) => KEY_ALIAS[k.toLowerCase()])),
    // Front-matter nodes carry a semantic type name ("requirement", …)
    // rather than the config's uppercase prefix (`t.id`) — SEMANTIC_BY_PREFIX
    // above is the only place that knows the two name the same thing. `key`
    // exposes that mapping so any consumer (this console's own client script
    // included) can index G.counts / G.status / a node's own `y` field
    // correctly regardless of grammar, rather than re-deriving or
    // duplicating the mapping client-side. `null` when a declared type has
    // no front-matter representation at all — CON/ASM are retired as node
    // types under this grammar (constitution rule 2.3): a corpus can still
    // list them in `types` for a legacy tile, but zero nodes will ever carry
    // that key, which is a real zero, not an unresolved lookup.
    types: cfg.types.map((t) => ({
      id: t.id, label: t.label, shape: t.dir ? "dir" : "table",
      key: isFrontMatter ? (SEMANTIC_BY_PREFIX[t.id] || null) : t.id,
    })),
    externalIdPrefixes: cfg.externalIdPrefixes,
    health: {
      dangling: Object.fromEntries(health.dangling),
      orphanREQ: health.orphans,
      registry: uniqReg,
      ranges: health.rangeLines,
      tstHeadings: health.tstHeadings,
      vocab: health.vocab,
      generatedDrift,
      fieldCoverage,
    },
    mc: Object.fromEntries([...mentions].map(([k, v]) => [k, v.size])),
  };
}

function readSchema(projectRoot, schema) {
  if (!schema) return { tables: [], schemaNote: null };
  if (schema.kind !== "supabase") {
    return {
      tables: [],
      schemaNote: `No adapter for schema.kind "${schema.kind}" yet — the data-model view is empty. Only "supabase" is implemented.`,
    };
  }
  const tables = [];
  try {
    for (const f of readdirSync(join(projectRoot, schema.path)).sort()) {
      if (!f.endsWith(".sql")) continue;
      const sql = readFileSync(join(projectRoot, schema.path, f), "utf8");
      const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_.]+)\s*\(([\s\S]*?)\n\)/gi;
      let m;
      while ((m = re.exec(sql))) {
        const name = m[1].replace(/^public\./, "");
        const cols = m[2]
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("--"))
          .map((l) => {
            const cm = l.match(/^([a-z_]+)\s+([a-z0-9 ()]+)/i);
            if (!cm) return null;
            const r = l.match(/references\s+([a-z_.]+)/i);
            return {
              n: cm[1], t: cm[2].trim(),
              p: /primary key/i.test(l) ? 1 : 0,
              f: r ? r[1].replace(/^public\./, "") : null,
            };
          })
          .filter(Boolean);
        tables.push({ n: name, c: cols, mig: f });
      }
    }
  } catch {
    return { tables: [], schemaNote: `schema.path "${schema.path}" not found — the data-model view is empty.` };
  }
  return { tables, schemaNote: null };
}
