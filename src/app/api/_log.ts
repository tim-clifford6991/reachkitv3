// src/app/api/_log.ts — BUILD §11
//
// The one structured request log line every `src/app/api/**` route emits:
// route id, status, duration and — where one exists — scan id. Never a
// payload, never a request body, never a header value. The allow-list below
// is the whole line; a field that is not one of these five cannot be added
// without editing this file, and `tests/app/api-adapter.test.ts` fails on
// one that is.
//
// `console.log` is the channel, the same one `src/lib/scan/admission.ts`
// uses. Reversal cost if a logging seam lands: one call site.

export interface RequestLine {
  readonly routeId: string;
  readonly status: number;
  readonly durationMs: number;
  /** Present only where the route has one. */
  readonly scanId?: string;
}

export const LINE_FIELDS = Object.freeze(["event", "routeId", "status", "durationMs", "scanId"] as const);

export function lineFor(line: RequestLine): Record<string, unknown> {
  const out: Record<string, unknown> = {
    event: "request",
    routeId: line.routeId,
    status: line.status,
    durationMs: line.durationMs,
  };
  if (line.scanId !== undefined) out.scanId = line.scanId;
  return out;
}

export function recordRequest(line: RequestLine): void {
  console.log(JSON.stringify(lineFor(line)));
}
