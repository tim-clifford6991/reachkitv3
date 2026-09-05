// src/lib/vendors/dataforseo/transport.ts — WO-023, BP-008 file-plan row 1.
//
// The one request builder and the one place `env.DATAFORSEO_LOGIN` /
// `env.DATAFORSEO_PASSWORD` are read (risk: high — money, data leaving the
// system). Not exported through `index.ts` — the package's public barrel
// is exactly BP-008's six functions (decision 1); this module is imported
// only from inside `src/lib/vendors/dataforseo/**` (this WO's `index.ts`
// today, WO-024's and WO-025's endpoint modules once they land).
//
// **Credentials never appear in a log, a payload or an error message**
// (BP-008 `## Error & edge behavior`). The only place the raw login and
// password strings are read is `authorizationHeader()` below, and the only
// place that header is placed is a request's own `Authorization` field —
// never logged, never included in a thrown value or a `DataForSeoOutcome`.
//
// **Every call is fixed to `SERP_LOCATION` (Google US / en) and depth 10**
// (BP-008 `## Public interface`, both read from `constants.ts`, never a
// caller argument). `buildRequest` enforces this structurally: the three
// reserved task keys are deleted from whatever the caller supplies and then
// set from the pins, in that order, so a caller cannot shadow them even by
// constructing an object that carries those keys.
import { env } from "@/lib/config/env";
import { SERP_LOCATION } from "@/lib/config/constants";

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com";

/** BP-008 decision 2's pattern, applied here at the transport level too:
 *  every request this module builds states which vendor API surface it
 *  targets — `'live'` (synchronous) or `'std'` (the vendor's cheaper,
 *  queued surface) — and there is no default. A call site that has not
 *  decided is a compile error, not an inherited value. */
export type DataForSeoMode = "live" | "std";

/** The three fields `buildRequest` fixes on every task, never accepted from
 *  a caller (BP-008: "Every call is fixed to SERP_LOCATION … and depth
 *  10"). Named once so the strip-then-set logic below and its test can
 *  both cite the same closed list. */
const RESERVED_TASK_KEYS = ["location_name", "language_code", "depth"] as const;

export interface DataForSeoRequestSpec {
  /** The literal vendor API path, e.g. `/v3/serp/google/organic/live/advanced`
   *  — supplied by the endpoint function that calls this builder (WO-024's,
   *  WO-025's), never derived from a caller-supplied string (decision 1: no
   *  export takes an endpoint name). */
  path: string;
  mode: DataForSeoMode;
  /** Endpoint-specific task fields — everything DataForSEO's own request
   *  body needs beyond the three pinned fields below. A key named among
   *  `RESERVED_TASK_KEYS` is silently dropped, never merged: those three
   *  are this module's alone to set. */
  fields?: Record<string, unknown>;
}

export interface DataForSeoRequest {
  url: string;
  method: "POST";
  headers: Readonly<Record<string, string>>;
  body: string;
}

/** The one place `env.DATAFORSEO_LOGIN` and `env.DATAFORSEO_PASSWORD` are
 *  read. Returns only the finished header value — the raw strings never
 *  leave this function's stack frame. */
function authorizationHeader(): string {
  const token = Buffer.from(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

/** Builds the one shape of request this module ever issues: `POST`, JSON
 *  body of one task, `SERP_LOCATION` and depth 10 fixed, credentials in the
 *  `Authorization` header only. Never exported outside this package. */
export function buildRequest(spec: DataForSeoRequestSpec): DataForSeoRequest {
  const task: Record<string, unknown> = { ...(spec.fields ?? {}) };
  for (const key of RESERVED_TASK_KEYS) delete task[key];
  task.location_name = SERP_LOCATION.location;
  task.language_code = SERP_LOCATION.language;
  task.depth = 10;

  return {
    url: `${DATAFORSEO_BASE_URL}${spec.path}`,
    method: "POST",
    headers: {
      Authorization: authorizationHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([task]),
  };
}

export type DataForSeoOutcome<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: string };

/** Issues one `buildRequest`-built request through the platform's global
 *  `fetch` (the vendor host is one we authored, not a customer- or
 *  dataset-supplied URL — BP-006's `## Module / boundary`: "Vendor API
 *  calls do not [go through `safeFetch`]: they are BP-008's, to hosts we
 *  authored" — and `eslint.config.mjs`'s `no-fetch-outside-egress` rule
 *  carves `src/lib/vendors/**` out for exactly this reason). Never throws:
 *  every failure — a rejected `fetch`, a non-2xx status, an unparseable
 *  body — becomes `{ ok: false, reason }`, and `reason` is built from
 *  nothing but the response's own status/statusText or the caught error's
 *  `message`, never from the request (so never from its `Authorization`
 *  header). */
export async function sendRequest<T>(spec: DataForSeoRequestSpec): Promise<DataForSeoOutcome<T>> {
  const request = buildRequest(spec);
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    if (!response.ok) {
      return { ok: false, reason: `dataforseo: ${response.status} ${response.statusText}` };
    }
    const payload = (await response.json()) as T;
    return { ok: true, payload };
  } catch (error) {
    return {
      ok: false,
      reason: `dataforseo: request failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}
