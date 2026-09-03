// src/app/(public)/page.tsx — BP-022 `## Public interface`, WO-070
//
// The landing page (REQ-001 c1): one text input, one submit control, and
// nothing else. No select, toggle, checkbox, radio or second text field;
// no sign-in, no payment, no email field; no session read and no cookie
// set (`## Steps` step 6).
//
// **A single file carries both the no-JavaScript and the JavaScript
// path** (`## File plan`): this is a Client Component ("use client") so
// one `onSubmit` handler can intercept a real, submittable `<form
// method="post" action="/api/scan">`. Next.js still renders that same
// tree on the server for the first response, so with no client runtime
// the browser's own native form submission — `action`/`method`, and the
// one named field `Input` renders (`name="value"`, WO-070's own addition
// to that component; see its header) — reaches `POST /api/scan` exactly
// as WO-062 describes: a form submission with no JavaScript gets a 303,
// forward on success or back here, carrying `problem` and `value`, on a
// malformed domain. With a client runtime, `onSubmit` calls
// `preventDefault()` before that native submission happens and drives the
// same request as JSON instead, per `## Steps` step 4.
//
// **`searchParams` is read defensively** (constitution rule 1.1 — an
// internal reading convenience, not a customer promise): Next.js's own
// contract passes it as a `Promise` to every page, client components
// included, unwrapped with `React.use()`. This file's own test suite
// calls the exported component directly with a plain, already-resolved
// object — the same direct-call convention `tests/app/layout.test.ts`
// already uses for `RootLayout` — so `useLandingSearchParams` accepts
// either shape: a real `Promise` (production, unwrapped with `use()`) or
// a plain object (tests, read synchronously, with no `Suspense` boundary
// needed).
//
// **The field label is also the placeholder** (rule 1.1): `Input` requires
// both props with no default (BP-018 decision 2), and WO-070's own
// `rests-on` row and file plan name one field-copy key, not two. Reusing
// `landing.field.label` for both keeps this WO's copy-registry footprint
// at exactly what its plan anticipated; the owner may split the sentence
// into a second key later without a mechanism change here.
"use client";

import { use, useState, type FormEvent } from "react";
import { Input } from "@/ui/components/Input";
import { Btn } from "@/ui/components/Btn";
import { copy } from "@/lib/presentation/copy";
import type { DomainProblem } from "@/lib/scan/domain";
import type { StartScanResponse } from "@/app/api/scan/route";

type LandingSearchParams = { problem?: string; value?: string };

// The five `DomainProblem` handles (`src/lib/scan/domain.ts`, WO-051) and
// the one landing-copy key each names, per this WO's `rests-on` row: "one
// written line per DomainProblem." No sixth or fourth value exists; a
// value outside this list is treated as no problem at all (Step 4/5: only
// a value this page recognises re-renders the line).
const PROBLEM_COPY_KEY = {
  empty: "landing.problem.empty",
  not_a_hostname: "landing.problem.not-a-hostname",
  ip_literal: "landing.problem.ip-literal",
  no_public_suffix: "landing.problem.no-public-suffix",
  too_long: "landing.problem.too-long",
} as const satisfies Record<DomainProblem, string>;

function isDomainProblem(value: string | undefined): value is DomainProblem {
  return value !== undefined && Object.prototype.hasOwnProperty.call(PROBLEM_COPY_KEY, value);
}

function isPromise<T>(value: Promise<T> | T | undefined): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Accepts a real `searchParams` Promise (production) or an already-plain
 *  object (this file's own tests, and every no-JS SSR pass) without
 *  suspending either caller. Named `use…` (not `readSearchParams`) because
 *  it calls the `use()` hook conditionally on the caller's own shape —
 *  `eslint-plugin-react-hooks` requires a hook-calling function's name to
 *  say so. */
function useLandingSearchParams(
  searchParams: Promise<LandingSearchParams> | LandingSearchParams | undefined
): LandingSearchParams {
  if (isPromise(searchParams)) return use(searchParams);
  return searchParams ?? {};
}

export default function LandingPage(props: {
  searchParams?: Promise<LandingSearchParams> | LandingSearchParams;
}): React.JSX.Element {
  const initial = useLandingSearchParams(props.searchParams);
  const initialProblem = isDomainProblem(initial.problem) ? initial.problem : undefined;

  const [value, setValue] = useState(initial.value ?? "");
  const [problem, setProblem] = useState<DomainProblem | undefined>(initialProblem);
  const [submitting, setSubmitting] = useState(false);

  // `## Steps` step 4: with JavaScript, post JSON and navigate to
  // `location` on `ok: true`; on `ok: false`, re-render in place with the
  // value intact and the problem's written line. `preventDefault()` is
  // what keeps the browser from also doing its own native submission —
  // without it (no client runtime at all), this handler never runs and
  // the plain `<form>` below carries the no-JS path instead (Step 5).
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const body = (await response.json()) as StartScanResponse;
      if (body.ok) {
        window.location.assign(body.location);
        return;
      }
      setProblem(body.problem);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>{copy("landing.headline")}</h1>
      <form action="/api/scan" method="post" onSubmit={handleSubmit}>
        {problem ? (
          <Input
            label={copy("landing.field.label")}
            placeholder={copy("landing.field.label")}
            name="value"
            value={value}
            onChange={setValue}
            invalid
            invalidMessage={copy(PROBLEM_COPY_KEY[problem])}
          />
        ) : (
          <Input
            label={copy("landing.field.label")}
            placeholder={copy("landing.field.label")}
            name="value"
            value={value}
            onChange={setValue}
          />
        )}
        <Btn type="submit" label={copy("landing.submit.label")} variant="primary" inFlight={submitting} />
      </form>
    </main>
  );
}
