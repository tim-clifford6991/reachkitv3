// ---- tst-without-regression (front-matter grammar only) ----------------

export default {
  id: "tst-without-regression",
  text: "a done work order whose latest validation records no regression",
  run(ctx) {
    const { graph, cfg, root, add, notices, notRun, byId } = ctx;
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
  },
};
