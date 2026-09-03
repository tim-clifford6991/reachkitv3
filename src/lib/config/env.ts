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
// No `.default(...)` and no `.optional()` anywhere in this schema (WO-005
// step 2 / file plan: "No default, no fallback.") — a missing or malformed
// binding fails `safeParse` and `parseEnv()` below throws.
const schema = z.object({
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  DATAFORSEO_LOGIN: z.string().min(1),
  DATAFORSEO_PASSWORD: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  NANO_API_KEY: z.string().min(1),
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

export type Env = z.infer<typeof schema>;

// WO-005 file plan: "`SUPABASE_SERVICE_ROLE`, `STRIPE_SECRET_KEY`,
// `RESEND_API_KEY`, `DATAFORSEO_PASSWORD`, `ANTHROPIC_API_KEY`,
// `NANO_API_KEY` and `IP_HASH_SALT` are marked server-only and their access
// throws if the module is evaluated in a client bundle." — the closed set;
// nothing outside it is guarded, and BP-002's `dbAdmin()` (WO-011) carries
// the analogous build-time guard for its own secret.
const SERVER_ONLY_KEYS = [
  "SUPABASE_SERVICE_ROLE",
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
  return result.data;
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
