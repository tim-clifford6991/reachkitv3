import Link from "next/link";
import { ROUTES } from "@/components/chrome/routes";
import { Mono, Note, P, ScrollX, SheetHead, Stop } from "@/components/chrome/sheet";
import { OUTSTANDING } from "@/mock/data";

export default function Index() {
  const sheets = ROUTES.filter((r) => r.kind === "sheet");
  const walks = ROUTES.filter((r) => r.kind === "walk");
  return (
    <main className="pv-wrap">
      <SheetHead
        title="ReachKit — preview app"
        carries="preview artifact · design-system skill step 2 · not production code"
      >
        <P>
          The same four specimens the HTML sheets carry, on the exact stack the charter fixes —
          Next.js App Router, TypeScript, Tailwind CSS 4 + daisyUI 5, Plus Jakarta Sans and
          JetBrains Mono self-hosted through <Mono>@fontsource</Mono>, lucide-react — plus five
          walkthrough routes the sheets could not carry at all. No network call, no vendor SDK,
          no database: every value on every screen comes from <Mono>src/mock/data.ts</Mono>.
        </P>
      </SheetHead>

      <Stop>
        <p style={{ margin: 0, fontWeight: 700 }}>Nothing here is signed.</p>
        <p style={{ margin: "var(--s-2) 0 0" }}>
          Every row in <Mono>components.md</Mono> is <Mono>proposed</Mono>. This app moves none of
          them, and no <Mono>Signed-off:</Mono> date follows from reading it. A row flips on a
          signature, not on a drawing — and a running drawing is still a drawing.
        </p>
      </Stop>

      <Note>
        <p style={{ margin: 0 }}>
          <strong>This app supersedes no sheet.</strong> The four HTML sheets under{" "}
          <Mono>previews/</Mono> stay exactly where they are: they are the record of what was drawn
          and why, and they carry argument this app has no place for. Whether the running app
          should <em>replace</em> them as the medium rule 7.3 is satisfied by is a change to how
          the gate works here — the owner&rsquo;s ruling via <Mono>/decide</Mono>, not the
          design-guardian&rsquo;s.
        </p>
      </Note>

      <h2 className="pv-h2">Specimen sheets — the four, as live code</h2>
      <RouteList routes={sheets} />

      <h2 className="pv-h2">Walkthroughs — the experience as a user meets it</h2>
      <P>
        These are the thing a sheet cannot give you: the screens the journeys describe, assembled
        from registered components, at a real viewport, in a real theme, with the interaction
        working. Each one says so on itself. None of them is a gate anyone has passed.
      </P>
      <RouteList routes={walks} />

      <h2 className="pv-h2">Still outstanding — strings nobody may write but you</h2>
      <P>
        Six customer-visible strings are still unwritten and are used nowhere in this app. Where a
        screen needs one, it renders the bracketed label instead and the screen is honest about
        the hole.
      </P>
      <ScrollX>
        <table className="pv-table">
          <thead>
            <tr>
              <th>Placeholder</th>
              <th>Named by</th>
            </tr>
          </thead>
          <tbody>
            {OUTSTANDING.map((o) => (
              <tr key={o.label}>
                <td className="m">{o.label}</td>
                <td>{o.named}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </main>
  );
}

function RouteList({ routes }: { routes: readonly (typeof ROUTES)[number][] }) {
  return (
    <div className="stack-3">
      {routes.map((r) => (
        <div className="pv-stage" key={r.href} style={{ marginBottom: 0 }}>
          <Link href={r.href} className="pv-mono" style={{ fontWeight: 700 }}>
            {r.href}
          </Link>
          <p className="pv-p" style={{ margin: "var(--s-2) 0 0" }}>
            {r.shows}
          </p>
          <p className="pv-p" style={{ margin: "var(--s-1) 0 0", color: "var(--pv-stop)" }}>
            <strong>Unsigned:</strong> {r.unsigned}
          </p>
        </div>
      ))}
    </div>
  );
}
