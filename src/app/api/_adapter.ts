// src/app/api/_adapter.ts — BUILD §11
//
// The convention every route handler under `src/app/api/**` is written to,
// as code: read the request, call one exported function on the module that
// owns the work, map the result to a response. A route holds no engine
// logic, no SQL and no rendering.
//
// `adapter()` is the wrapper that makes two of those properties automatic:
//
//   1. **One request log line per call** — `_log.ts`'s four fields and
//      nothing else, emitted whether the handler answered or threw.
//   2. **A thrown error never reaches the response body.** A vendor error
//      payload, a stack, a connection string: none of it is customer-facing
//      and none of it leaves here. The body carries a machine handle from
//      the closed union below and nothing more.
//
// The handle is not copy. It is the same kind of value `POST /api/scan`
// already answers a malformed body with — a token a caller branches on,
// never a sentence the product speaks. Every sentence a *person* reads is a
// key in `src/lib/presentation/copy/`, and this module holds none.
//
// This file imports no engine module, so it cannot become a place logic
// accumulates.
import { recordRequest } from "./_log";

/** The closed set of failure handles a wrapped route can answer with. */
export type FailureHandle = "unavailable";

const FAILURE_STATUS = 500;

export type RouteHandler<TRequest extends Request = Request, TContext = unknown> = (
  request: TRequest,
  context: TContext
) => Promise<Response>;

/** Wraps a route handler. `routeId` is the route's own stable id — the
 *  address as written, not the request's URL, which carries customer data. */
export function adapter<TRequest extends Request, TContext>(
  routeId: string,
  handler: RouteHandler<TRequest, TContext>
): RouteHandler<TRequest, TContext> {
  return async (request, context) => {
    const started = Date.now();
    try {
      const response = await handler(request, context);
      recordRequest({ routeId, status: response.status, durationMs: Date.now() - started });
      return response;
    } catch {
      recordRequest({ routeId, status: FAILURE_STATUS, durationMs: Date.now() - started });
      return Response.json({ error: "unavailable" satisfies FailureHandle }, { status: FAILURE_STATUS });
    }
  };
}
