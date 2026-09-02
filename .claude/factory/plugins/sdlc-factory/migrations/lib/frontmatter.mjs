// Front-matter parser/serializer shared by the migrations.
//
// Ported from ReachKit v2's scripts/lib/frontmatter.mjs, which is the
// reference this grammar was ORIGINALLY ported from — not a copy kept in
// lockstep. ReachKit's copy is frozen at the commit it was ported from and
// diverges starting with `code` (0.3.0): that field exists here and in
// console/src/extract/frontmatter.mjs's FM_FIELD_ORDER, and will never be
// backported to ReachKit's own script.
//
// What DOES stay in lockstep is the pair that ships together in this
// repo's own release: this module (write) and console/src/extract/
// frontmatter.mjs + its FM_FIELD_ORDER (read). Both travel in the same
// distributable and neither may depend on the other at runtime, so getting
// them out of sync would make a migrated file unreadable by the console
// that is supposed to grade it. Any future field is added to both shipped
// copies in the same commit.
//
// NOT a general YAML parser — a deliberately small subset. The generator
// (this module, via the migrations that import it) controls both ends of the
// round trip, so the grammar only needs to cover what the schema uses:
//
//   key: value                    scalar — bare token or "double-quoted string"
//   key: [A, B, C]                flow list of scalars
//   key: []                       empty flow list
//   key:                          block list, one item per "  - " line, or
//     - value                       a mapping item (used by `rests-on`):
//     - subkey: "value"               subkeys `claim`, `disposition`,
//       subkey2: value                `accepted-by`
//
// Quoting: only double-quoted strings, `\"` and `\\` as the only escapes.

const OPEN = "---\n";

/** @param {string} text
 *  @returns {{ data: Record<string, any> | null, body: string }} */
export function splitFrontmatter(text) {
  if (!text.startsWith(OPEN)) return { data: null, body: text };

  let close = text.indexOf("\n---\n", OPEN.length - 1);
  let afterLen = 5;
  if (close === -1) {
    if (text.endsWith("\n---")) {
      close = text.length - 4;
      afterLen = 4;
    } else {
      throw new Error("frontmatter fence opened with '---' but never closed with a line containing only '---'");
    }
  }
  const yamlBlock = text.slice(OPEN.length, close);
  const body = text.slice(close + afterLen);
  const data = parseYamlSubset(yamlBlock);
  return { data, body };
}

const KEY_LINE = /^([a-zA-Z][a-zA-Z0-9_-]*):[ \t]?(.*)$/;
const BLOCK_ITEM_MAPPING_START = /^  - ([a-zA-Z][a-zA-Z0-9_-]*):[ \t]?(.*)$/;
const BLOCK_ITEM_SCALAR = /^  - (.*)$/;
const BLOCK_MAPPING_CONT = /^    ([a-zA-Z][a-zA-Z0-9_-]*):[ \t]?(.*)$/;

function parseYamlSubset(block) {
  const lines = block.split("\n");
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    const m = KEY_LINE.exec(line);
    if (!m) throw new Error(`unparseable frontmatter line ${i + 1}: ${JSON.stringify(line)}`);
    const key = m[1];
    const rest = m[2];
    if (rest !== "") {
      data[key] = parseScalarOrFlowList(rest, i + 1);
      i++;
      continue;
    }
    i++;
    const items = [];
    while (i < lines.length && BLOCK_ITEM_SCALAR.test(lines[i])) {
      const mapStart = BLOCK_ITEM_MAPPING_START.exec(lines[i]);
      if (mapStart) {
        const obj = {};
        obj[mapStart[1]] = parseScalarOrFlowList(mapStart[2], i + 1);
        i++;
        while (i < lines.length && BLOCK_MAPPING_CONT.test(lines[i])) {
          const mm = BLOCK_MAPPING_CONT.exec(lines[i]);
          obj[mm[1]] = parseScalarOrFlowList(mm[2], i + 1);
          i++;
        }
        items.push(obj);
      } else {
        const sm = BLOCK_ITEM_SCALAR.exec(lines[i]);
        items.push(parseScalarOrFlowList(sm[1], i + 1));
        i++;
      }
    }
    data[key] = items;
  }
  return data;
}

function parseScalarOrFlowList(raw, lineNo) {
  const t = raw.trim();
  if (t === "[]") return [];
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((s) => parseScalarOrFlowList(s.trim(), lineNo));
  }
  if (t.startsWith('"')) {
    if (!t.endsWith('"') || t.length < 2) {
      throw new Error(`unterminated quoted string on frontmatter line ${lineNo}: ${JSON.stringify(raw)}`);
    }
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return t;
}

// Fixed field order every write uses, regardless of the input object's key
// order — matches console/src/extract/index.mjs's FM_FIELD_ORDER exactly, so
// a file this migration writes parses back with the identical shape the
// console already grades. Keys absent from `data` are omitted.
const FIELD_ORDER = [
  "id", "type", "title", "status", "severity", "origin",
  "satisfies", "covers", "implements", "decides-for", "about",
  "depends-on", "blocked-by", "cites-retired", "rests-on", "supersedes",
  "code", "persona", "steps", "wave", // matches console's FM_FIELD_ORDER
];

const QUOTED_SCALAR_FIELDS = new Set(["title", "persona"]);

function quote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** @param {Record<string, any>} data
 *  @returns {string} */
export function serializeFrontmatter(data) {
  // Refuse rather than guess (repo convention — a migration that silently
  // drops a key is a wrong rewrite, and a wrong rewrite silently opens or
  // closes a gate). FIELD_ORDER is the fixed, exhaustive key list every
  // write uses; a key outside it would otherwise vanish from the file with
  // no trace, because the loop below only ever visits FIELD_ORDER's own
  // keys.
  for (const k of Object.keys(data)) {
    if (!FIELD_ORDER.includes(k)) {
      throw new Error(`frontmatter key "${k}" is not in FIELD_ORDER — refusing to serialise (it would be dropped)`);
    }
  }
  const lines = ["---"];
  for (const key of FIELD_ORDER) {
    if (!(key in data)) continue;
    const val = data[key];
    if (key === "rests-on") {
      const rows = val;
      if (!Array.isArray(rows)) throw new Error("rests-on must be an array");
      if (rows.length === 0) { lines.push("rests-on: []"); continue; }
      lines.push("rests-on:");
      for (const row of rows) {
        lines.push(`  - claim: ${quote(row.claim)}`);
        lines.push(`    disposition: ${row.disposition}`);
        lines.push(`    accepted-by: ${quote(row["accepted-by"])}`);
      }
      continue;
    }
    if (key === "steps") {
      const rows = val;
      if (!Array.isArray(rows)) throw new Error("steps must be an array");
      if (rows.length === 0) { lines.push("steps: []"); continue; }
      lines.push("steps:");
      for (const row of rows) {
        lines.push(`  - step: ${quote(row.step)}`);
        // Always written, `exercises: []` when empty — a step that
        // exercises nothing yet is a fact worth stating explicitly, not
        // omitting (the same posture `rests-on: []` takes above).
        lines.push(`    exercises: [${(row.exercises || []).join(", ")}]`);
      }
      continue;
    }
    if (Array.isArray(val)) { lines.push(`${key}: [${val.join(", ")}]`); continue; }
    lines.push(QUOTED_SCALAR_FIELDS.has(key) ? `${key}: ${quote(val)}` : `${key}: ${val}`);
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}
