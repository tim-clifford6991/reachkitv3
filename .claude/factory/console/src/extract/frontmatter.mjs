// Zero-dependency reader for the front-matter grammar's YAML subset.
//
// Ported from ReachKit v2's scripts/lib/frontmatter.mjs — not imported across
// repos, this console has no runtime dependency on that project's tree, but
// the grammar itself must match exactly: that repo's `check:registry` gate
// diffs its own generator's output byte-for-byte, and this console only ever
// reads, so it must never be a source of drift pressure on it.
//
// A deliberately small SUBSET of YAML, not a general parser: one
// `---`-fenced document at byte 0, only what the schema ever writes. Anything
// outside it is a MALFORMED front-matter block and throws — a mis-parsed
// corpus is worse than a refused one. The caller decides what "refused"
// means (extract() treats it as not-yet-migrated, the same as no front
// matter at all, rather than crashing the whole run).
//
// Grammar:
//
//   key: value                    scalar — bare token or "double-quoted string"
//   key: [A, B, C]                flow list of scalars
//   key: []                       empty flow list
//   key:                          block list, one item per "  - " line, or
//     - value                       a mapping item (used by `rests-on`):
//     - subkey: "value"               subkeys `claim`, `disposition`,
//       subkey2: value                `accepted-by`
//
// Quoting: only double-quoted strings, with `\"` and `\\` as the only
// escapes. Read-only — this module has no serializer, because the console
// never writes into a corpus.

const OPEN = "---\n";

/** Split `text` into { data, body }. `data` is `null` when the file has no
 *  opening `---` fence at byte 0 (not on this grammar, or not yet migrated).
 *  Throws on a block that opens with `---` but isn't valid subset YAML.
 *  @param {string} text
 *  @returns {{ data: Record<string, any> | null, body: string }} */
export function splitFrontmatter(text) {
  if (!text.startsWith(OPEN)) return { data: null, body: text };

  let close = text.indexOf("\n---\n", OPEN.length - 1);
  let afterLen = 5; // "\n---\n"
  if (close === -1) {
    if (text.endsWith("\n---")) {
      close = text.length - 4;
      afterLen = 4; // "\n---" at EOF, no trailing newline
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
    if (line.trim() === "") {
      i++;
      continue;
    }
    const m = KEY_LINE.exec(line);
    if (!m) throw new Error(`unparseable frontmatter line ${i + 1}: ${JSON.stringify(line)}`);
    const key = m[1];
    const rest = m[2];
    if (rest !== "") {
      data[key] = parseScalarOrFlowList(rest, i + 1);
      i++;
      continue;
    }
    // block form: the value is the run of "  - …" lines that follows.
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
    return t
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return t;
}
