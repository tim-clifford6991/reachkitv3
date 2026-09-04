// src/lib/llm/index.ts — WO-026, BP-009's `llm()` seam.
//
// **Risk: high — money, and the customer's own page text leaving the
// process here.** Every model call the product ever makes goes through
// this one function. Three things are non-negotiable and mutation-tested
// (doctrine 0.13.2):
//   1. Every call is ledgered through `CostContext.recordFetch` — no path
//      calls the vendor without going through the cap/reserve/settle/
//      ledger seam BP-007 already owns.
//   2. A tier's model id comes from exactly one place — `tierBinding()`
//      (`tiers.ts`) — and nothing on the caller's `call` object can
//      substitute for it: only `call.tier`, `call.input` and
//      `call.schema` are ever read, by name, never spread.
//   3. `call.input` — the customer's own page text, in whatever shape a
//      caller supplies — reaches the model and nothing else: it is never
//      logged, and neither is the model's response text. The credential
//      (`tierBinding().apiKey`) is read in exactly one place below and
//      handed to the vendor SDK's constructor; it is never interpolated
//      into a log line, a thrown value, or any string this module builds
//      by hand — including an *encoded* form of it (WO-023's sibling
//      order shipped a credential test that only searched for the
//      plaintext secret and missed the header's own base64 encoding;
//      `tests/llm/seam.test.ts` searches for both forms of the fixture
//      key).
//
// **Two gaps this file inherits, flagged once here (rule 4.2) rather than
// blocking a WO-071-blocking, critical-path order:**
//
// - **`call.site` is typed `string`, not BP-009's `LlmCallSite`.** That
//   union is WO-027's own file (`src/lib/llm/call-sites.ts`,
//   `depends-on: [WO-026]` — it comes *after* this order, and its own
//   file plan never lists `index.ts` as a modify row). Every member
//   `LlmCallSite` will ever have is a string literal, so this widening is
//   source-compatible with every caller WO-027 adds: nothing here needs
//   to change when that union lands. Recorded as an open `rests-on` row
//   on WO-026 for the architect: either this stays (no code changes were
//   needed) or WO-027 gains a one-line modify row narrowing the
//   parameter — cheap either way.
// - **The `unparseable` reason BP-009's `## Error & edge behavior` names
//   does not exist on the shipped `Measured<T>`.** `UnmeasuredReason`
//   (`src/lib/measure/measured.ts`, BP-024, WO-277 — outside this file
//   plan) is a closed `'undeterminable' | 'not_attempted'`, with
//   `undeterminable` defined as "nothing returned, unreadable, or a data
//   source did not answer" (BP-024 `## Data model delta`) — language that
//   already covers an unparsed model response without inventing a third
//   member of a type this WO does not own (rule 7.1: one owner per
//   capability). Both a schema-parse failure and model unavailability
//   below resolve to `undeterminable`; `not_attempted` is reserved for
//   the one case BP-024 defines it for — the caller's own cost ceiling
//   stopping the call before it was ever attempted (`recordFetch`'s
//   `{ skipped: "cap" }`). Recorded as an open `rests-on` row on WO-026.
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import type { CostContext } from "@/lib/costs";
import { measured, unmeasured, type Measured } from "@/lib/measure/measured";
import { costCentsFor, tierBinding, type Tier, type TierBinding } from "./tiers";

/** BP-009 `## Error & edge behavior`: "retried at most once" — one retry,
 *  two attempts total. */
const MAX_ATTEMPTS = 2;

/** Bounds both the request's own `max_tokens` and the cost reservation
 *  below (rule 1.1 — parameter: no artifact pins an output-token ceiling
 *  for this seam; chosen generously for a nano/haiku-class prose call,
 *  reversal cost one number, this file only). */
const MAX_OUTPUT_TOKENS = 4096;

type ParseOutcome = "success" | "unparseable" | "unavailable" | "not_attempted";

interface AttemptOutcome {
  parseOutcome: ParseOutcome;
  value: unknown;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
}

/** `~4 chars/token` — a standard, widely-used estimate (not vendor data,
 *  never asserted as measured), used only to size the up-front
 *  **reservation** `recordFetch`'s cap is checked against; the ledgered
 *  figure `settleCents` writes always comes from the vendor's own
 *  reported `usage.input_tokens`. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function extractText(message: Anthropic.Message): string {
  const block = message.content.find(
    (candidate): candidate is Anthropic.TextBlock => candidate.type === "text"
  );
  return block?.text ?? "";
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/** The one place a vendor request is built and issued — `binding.apiKey`
 *  and `binding.modelId` are read here and nowhere else in this module.
 *  Anthropic's own SDK is the transport (`eslint.config.mjs`'s
 *  `no-fetch-outside-egress` carves out `src/lib/vendors/**` and
 *  `src/lib/egress/**` only; this file calls neither `fetch` nor either
 *  boundary — the SDK is the sanctioned path for a vendor client that is
 *  not itself a raw `fetch` call in this tree). */
async function callModel(
  binding: TierBinding,
  inputText: string
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const client = new Anthropic({ apiKey: binding.apiKey, timeout: binding.timeoutMs });
  const message = await client.messages.create({
    model: binding.modelId,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: "Respond with JSON only. No prose, no markdown fences, no commentary.",
    messages: [{ role: "user", content: inputText }],
  });
  return {
    text: extractText(message),
    tokensIn: message.usage.input_tokens,
    tokensOut: message.usage.output_tokens,
  };
}

/** Up to `MAX_ATTEMPTS` calls against one schema. A transport failure on
 *  any attempt returns `unavailable` immediately — BP-009's "Model
 *  unavailability degrades the caller" is distinct from, and does not
 *  extend, the schema-parse retry allowance. A response that comes back
 *  but does not parse against `schema` is retried once; a second failure
 *  returns `unparseable`, and the raw payload is never coerced or
 *  returned in its place (the mutation this WO's `## Steps` names:
 *  falling back to the raw string here is exactly the bug the "never
 *  silently coerced" test exists to kill). */
async function runAttempts<T>(
  binding: TierBinding,
  schema: ZodType<T>,
  inputText: string
): Promise<AttemptOutcome> {
  const startedAt = Date.now();
  let tokensIn = 0;
  let tokensOut = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: { text: string; tokensIn: number; tokensOut: number };
    try {
      response = await callModel(binding, inputText);
    } catch {
      return {
        parseOutcome: "unavailable",
        value: undefined,
        tokensIn,
        tokensOut,
        durationMs: Date.now() - startedAt,
      };
    }
    tokensIn += response.tokensIn;
    tokensOut += response.tokensOut;

    const asJson = parseJson(response.text);
    if (asJson.ok) {
      const parsed = schema.safeParse(asJson.value);
      if (parsed.success) {
        return {
          parseOutcome: "success",
          value: parsed.data,
          tokensIn,
          tokensOut,
          durationMs: Date.now() - startedAt,
        };
      }
    }
    // Falls through to the next attempt (if any is left) — never
    // returns `response.text` itself as the value.
  }

  return {
    parseOutcome: "unparseable",
    value: undefined,
    tokensIn,
    tokensOut,
    durationMs: Date.now() - startedAt,
  };
}

interface LogRecord {
  site: string;
  tier: Tier;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  durationMs: number;
  parseOutcome: ParseOutcome;
}

/** BP-009 `## NFR budget`, verbatim: "call site, tier, tokens in and out,
 *  cost, duration, parse outcome; never the prompt or the completion in a
 *  log." This is the one place `llm()` writes to a log, and `LogRecord`
 *  is the whole field set — there is no path from `call.input` or a
 *  model's response text into this function, and none from
 *  `binding.apiKey` either. */
function logCall(record: LogRecord): void {
  console.log(JSON.stringify(record));
}

/** BP-009 `## Public interface`, verbatim signature (`site`'s type is the
 *  one declared deviation — see file header). Runs inside the caller's
 *  `CostContext` via `recordFetch`, with the call site as the ledger
 *  row's `source` (BP-009 `## Data model delta`). Never throws — a
 *  transport failure, an exhausted parse retry, and the caller's own cost
 *  ceiling all resolve to `unmeasured`, not a rejection. */
export async function llm<T>(
  c: CostContext,
  call: {
    site: string;
    input: unknown;
    schema: ZodType<T>;
    tier: Tier;
  }
): Promise<Measured<T>> {
  const at = new Date();
  const binding = tierBinding(call.tier);
  const inputText = JSON.stringify(call.input);
  const cacheKey = createHash("sha256").update(`${call.site}:${call.tier}:${inputText}`).digest("hex");
  const reservedCents = costCentsFor(
    call.tier,
    estimateTokens(inputText) * MAX_ATTEMPTS,
    MAX_OUTPUT_TOKENS * MAX_ATTEMPTS
  );

  const result = await c.recordFetch<AttemptOutcome>({
    source: call.site,
    cacheKey,
    // BP-009 states no caching policy for this seam (unlike BP-008's own
    // per-vendor `CACHE_WINDOWS_D`). `freshnessDays: 0` keeps
    // `recordFetch`'s cache-first/ledger-always shape (BP-007) while
    // never actually serving a stale model response back (rule 1.1 —
    // parameter, reversal cost one number, this file only).
    freshnessDays: 0,
    costCents: reservedCents,
    settleCents: (outcome) => costCentsFor(call.tier, outcome.tokensIn, outcome.tokensOut),
    run: () => runAttempts(binding, call.schema, inputText),
  });

  if ("skipped" in result) {
    logCall({
      site: call.site,
      tier: call.tier,
      tokensIn: 0,
      tokensOut: 0,
      costCents: 0,
      durationMs: 0,
      parseOutcome: "not_attempted",
    });
    return unmeasured("not_attempted", at);
  }

  const outcome = result.payload;
  logCall({
    site: call.site,
    tier: call.tier,
    tokensIn: outcome.tokensIn,
    tokensOut: outcome.tokensOut,
    costCents: result.costCents,
    durationMs: outcome.durationMs,
    parseOutcome: outcome.parseOutcome,
  });

  if (outcome.parseOutcome === "success") {
    return measured(outcome.value as T, at);
  }
  // "unparseable" and "unavailable" both degrade the caller into the
  // same `UnmeasuredReason` — see file header for why this is
  // `undeterminable`, not the `unparseable` BP-009's prose names.
  return unmeasured("undeterminable", at);
}
