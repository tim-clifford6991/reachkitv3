// src/app/api/scan/[scanId]/progress/route.ts — BP-022 `## Public
// interface`, WO-281 (consolidates WO-063; see `archive/sdlc-factory-2026-09-04/corpus/docs/
// work-orders/WO-281.md` `## Consolidation`)
//
// "Serve BP-023's stage stream as server-sent events and nothing more —
// one thin adapter" (WO-063's own goal, carried verbatim). This file
// holds no timer, no stage list and no ending logic of its own
// (`structure.md` rule 1): it opens `@/lib/scan/stages`'s `progress(scanId)`,
// serialises each `StageEvent` verbatim as one SSE `data:` frame — no
// renaming and no field this module adds on its own account (WO-281
// `## Steps` step 16) — and closes the response after the single `ending`
// event, releasing the iterator either way (step 17).
//
// **The 404 decision.** `progress()` itself states no HTTP status — it is
// a plain async iterable. An unknown or malformed `scanId` (`stages.ts`'s
// own `scanExists` check) yields an iterable that produces nothing at
// all; this route reads that as "unknown or malformed `scanId` responds
// 404 on this API route" (step 19) by pulling exactly one event before
// deciding which response to build. A known scan that has not yet
// published anything is not this case: `progress()` waits for its first
// live event or heartbeat rather than returning immediately, so this one
// pull never spuriously 404s a scan that is simply early.
//
// **Disconnect.** `ReadableStream`'s own `cancel()` — called by the
// platform when the client goes away, the same mechanism a real browser
// closing the tab triggers — releases the iterator (step 18: "no
// background continuation for a visitor who closes the page"). No other
// handle is held past that point: no interval, no listener registered
// anywhere outside `stages.ts`'s own bus, which removes this iterator's
// listener in its own `finally` block the moment the iterator is
// returned.
import { progress, type StageEvent } from "@/lib/scan/stages";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
} as const;

function sseFrame(event: StageEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scanId: string }> }
): Promise<Response> {
  const { scanId } = await params;
  const iterator = progress(scanId)[Symbol.asyncIterator]();

  const first = await iterator.next();
  if (first.done) {
    return new Response(null, { status: 404, headers: RESPONSE_HEADERS });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sseFrame(first.value)));
      if ("ending" in first.value) {
        controller.close();
        return;
      }
      try {
        while (true) {
          const next = await iterator.next();
          if (next.done) break;
          controller.enqueue(encoder.encode(sseFrame(next.value)));
          if ("ending" in next.value) break;
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      void iterator.return?.();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...RESPONSE_HEADERS,
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    },
  });
}
