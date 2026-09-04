// src/lib/config/env.ts
//
// BP-005 `## Public interface`:
//   "export const env: Readonly<Env>   // parsed and validated at module
//   load; a missing binding is a boot failure, not a runtime undefined"
// BP-005 `## Error & edge behavior`:
//   "`env` throws at boot on a missing or malformed binding; there is no
//   default and no fallback, so a deployment cannot start half-configured."
// BP-005 "imports nothing" — this module imports only `zod`.
import { z } from "zod";

// `BUILD.md` §15, verbatim:
//   "DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE
//   STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID RESEND_API_KEY
//   DATAFORSEO_LOGIN DATAFORSEO_PASSWORD ANTHROPIC_API_KEY NANO_API_KEY
//   IP_HASH_SALT KILL_SWITCH OWNER_EMAILS NEXT_PUBLIC_APP_URL"
// plus `HOSTED_EDGE_CNAME_TARGET`, the one binding BP-005's `## Public
// interface` adds and states the derivation for: "the hostname a customer
// points `content.{their-domain}` at … It is one deployment-scoped
// hostname, so it is a binding rather than a constant."
//
// BP-005 decision 6: three of §15's rows above are bound differently, because
// the deployment target is the existing Vercel project `reachkit` and its
// secrets are write-only. §15 itself is upstream source text and stays cited,
// not edited — this schema is what actually binds. 6a:
// `SUPABASE_SERVICE_ROLE` is retired; the schema's (and the platform's) only
// name is `SUPABASE_SERVICE_ROLE_KEY`, no alias. 6b: `NANO_API_KEY` is the
// schema's one optional member, resolved to `ANTHROPIC_API_KEY` when absent
// inside `parseEnv()` below, before `env` is constructed — see `type Env`
// two lines down for how the member's type stays a required `string` either
// way. 6c: `DATABASE_URL` is not a member of this schema at all — no module
// under `src/` reads it; it is the migration and test tooling's binding.
//
// No `.default(...)` and no other `.optional()` anywhere in this schema
// (WO-005 step 2 / file plan: "No default, no fallback.") — a missing or
// malformed binding fails `safeParse` and `parseEnv()` below throws.
// `NANO_API_KEY` above is the decision 6b exception: optional at the schema
// level only, resolved to a required member before any caller sees it.
const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  DATAFORSEO_LOGIN: z.string().min(1),
  DATAFORSEO_PASSWORD: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  NANO_API_KEY: z.string().min(1).optional(),
  IP_HASH_SALT: z.string().min(1),
  // "boolean-ish for KILL_SWITCH" (WO-005 step 1).
  KILL_SWITCH: z.stringbool(),
  // "comma-separated list for OWNER_EMAILS" (WO-005 step 1).
  OWNER_EMAILS: z
    .string()
    .min(1)
    .transform((value) => value.split(",").map((entry) => entry.trim()))
    .pipe(z.array(z.email()).min(1)),
  NEXT_PUBLIC_APP_URL: z.url(),
  HOSTED_EDGE_CNAME_TARGET: z.string().min(1),
});

// BP-005 decision 6b: "the member's type is a required `string` either
// way — no caller can observe which key it received, and none is asked to
// choose." `z.infer` alone would make `NANO_API_KEY` `string | undefined`
// (the schema's own `.optional()`); this type is what every reader of `Env`
// actually sees, once `parseEnv()` has resolved the fallback.
type ParsedEnv = z.infer<typeof schema>;
export type Env = Omit<ParsedEnv, "NANO_API_KEY"> & { NANO_API_KEY: string };

// WO-005 file plan: "`SUPABASE_SERVICE_ROLE`, `STRIPE_SECRET_KEY`,
// `RESEND_API_KEY`, `DATAFORSEO_PASSWORD`, `ANTHROPIC_API_KEY`,
// `NANO_API_KEY` and `IP_HASH_SALT` are marked server-only and their access
// throws if the module is evaluated in a client bundle." — the closed set;
// nothing outside it is guarded, and BP-002's `dbAdmin()` (WO-011) carries
// the analogous build-time guard for its own secret. BP-005 decision 6a:
// one name end to end, not an alias — this reader moves with the rename.
const SERVER_ONLY_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "DATAFORSEO_PASSWORD",
  "ANTHROPIC_API_KEY",
  "NANO_API_KEY",
  "IP_HASH_SALT",
] as const satisfies readonly (keyof Env)[];

const serverOnlyKeySet: ReadonlySet<string> = new Set(SERVER_ONLY_KEYS);

function isClientBundle(): boolean {
  // The lexical property a bundler-free runtime can observe: `window`
  // exists in a browser (or a browser-like test environment) and never in
  // a Node.js process. This is a runtime guard on *access*, independent of
  // BP-002's build-time guard on `dbAdmin()`'s own import.
  return typeof window !== "undefined";
}

function parseEnv(): Env {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `src/lib/config/env.ts: invalid or missing environment binding(s):\n${result.error.message}`
    );
  }
  // BP-005 decision 6b: the resolution happens here, before any caller reads
  // `env` — `ANTHROPIC_API_KEY` is itself a required member this same parse
  // has already validated, never a fabricated or hard-coded literal.
  return {
    ...result.data,
    NANO_API_KEY: result.data.NANO_API_KEY ?? result.data.ANTHROPIC_API_KEY,
  };
}

function freezeWithGuards(parsed: Env): Readonly<Env> {
  const target = {} as Env;
  for (const key of Object.keys(parsed) as (keyof Env)[]) {
    const isServerOnly = serverOnlyKeySet.has(key);
    Object.defineProperty(target, key, {
      enumerable: true,
      configurable: false,
      get(): Env[typeof key] {
        if (isServerOnly && isClientBundle()) {
          throw new Error(
            `src/lib/config/env.ts: "${key}" is server-only and cannot be read from a client bundle.`
          );
        }
        return parsed[key];
      },
    });
  }
  return Object.freeze(target);
}

export const env: Readonly<Env> = freezeWithGuards(parseEnv());
