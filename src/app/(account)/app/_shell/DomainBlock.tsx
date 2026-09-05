// BUILD §4.4 — "domain block (accent dot, domain, `Week n · re-measured Mon`)".
//
// Two arms, from `WeekCount` (REQ-040 c6 and c7): a counted number of
// measured weeks with the date of the last one, or — where this domain has
// never been measured — no number at all and one written line naming the
// date the first measurement is due. The dot is decoration and carries no
// meaning of its own (BP-018's words-not-colour rule), so it is `aria-hidden`.
//
// The week line and the not-measured line are both owner-owed today, so
// `writtenLine` returns `null` for them and the block renders the domain
// alone rather than throwing. Filling either key in the registry is the
// whole of what turns the line on.
import type React from "react";
import { formatDate } from "./format";
import { writtenLine } from "./written";
import type { ShellModel } from "./model";

export function DomainBlock(p: { shell: ShellModel }): React.JSX.Element {
  const { shell } = p;
  const line =
    shell.weeks.kind === "counted"
      ? writtenLine("shell.domain.measured-weeks", {
          weeks: shell.weeks.weeks,
          on: formatDate(shell.weeks.lastMeasuredOn, shell.timeZone),
        })
      : writtenLine("shell.domain.not-measured", {
          due: formatDate(shell.weeks.firstDueOn, shell.timeZone),
        });

  return (
    <div className="rk-domain">
      <p className="rk-domain-name">
        <span className="rk-dot" aria-hidden="true" />
        {/* §2.3: "Every numeral, date, URL … is JetBrains Mono with
            tabular-nums." A domain is a URL-shaped value. */}
        <span className="num">{shell.domain}</span>
      </p>
      {line === null ? null : <p className="rk-prov">{line}</p>}
    </div>
  );
}
