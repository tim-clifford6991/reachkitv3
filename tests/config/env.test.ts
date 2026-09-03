// tests/config/env.test.ts
//
// WO-005 `## Test plan` — criteria quoted from BP-005 (`satisfies: []`) and
// `BUILD.md` §15, not from a requirement (BP-005 carries no requirement
// ancestor for `env.ts` — see the work order's test-plan header note).
// `structure.md` rule 4 puts a module's tests at `tests/<module>/**`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_MODULE = "../../src/lib/config/env.ts";

// `BUILD.md` §15, verbatim:
//   "DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE
//   STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID RESEND_API_KEY
//   DATAFORSEO_LOGIN DATAFORSEO_PASSWORD ANTHROPIC_API_KEY NANO_API_KEY
//   IP_HASH_SALT KILL_SWITCH OWNER_EMAILS NEXT_PUBLIC_APP_URL"
// plus `HOSTED_EDGE_CNAME_TARGET` (BP-005 `## Public interface`'s note) —
// the same 17 names `tests/app/env-example.test.ts` asserts against
// `.env.example`.
const BINDING_NAMES = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "RESEND_API_KEY",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "ANTHROPIC_API_KEY",
  "NANO_API_KEY",
  "IP_HASH_SALT",
  "KILL_SWITCH",
  "OWNER_EMAILS",
  "NEXT_PUBLIC_APP_URL",
  "HOSTED_EDGE_CNAME_TARGET",
] as const;

// WO-005 file plan's closed set of server-only bindings.
const SERVER_ONLY_NAMES = [
  "SUPABASE_SERVICE_ROLE",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "DATAFORSEO_PASSWORD",
  "ANTHROPIC_API_KEY",
  "NANO_API_KEY",
  "IP_HASH_SALT",
] as const;

// A complete, validly-shaped set of bindings. Values are fixtures, never
// real credentials — `tests/setup.ts` also refuses any real network call
// from this process.
const VALID_ENV: Record<(typeof BINDING_NAMES)[number], string> = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/reachkit",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-fixture",
  SUPABASE_SERVICE_ROLE: "service-role-fixture",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  STRIPE_PRICE_ID: "price_fixture",
  RESEND_API_KEY: "re_fixture",
  DATAFORSEO_LOGIN: "dfs-login-fixture",
  DATAFORSEO_PASSWORD: "dfs-password-fixture",
  ANTHROPIC_API_KEY: "sk-ant-fixture",
  NANO_API_KEY: "nano-fixture",
  IP_HASH_SALT: "salt-fixture",
  KILL_SWITCH: "false",
  OWNER_EMAILS: "owner@example.com,second-owner@example.com",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  HOSTED_EDGE_CNAME_TARGET: "content.reachkit-edge.example.com",
};

const ORIGINAL_ENV = { ...process.env };

/** Resets the 17 bindings to a complete, valid set, then applies overrides.
 * `undefined` deletes the key — `process.env[k] = undefined` would instead
 * coerce to the string `"undefined"`, which is not what "missing" means. */
function applyEnv(overrides: Partial<Record<string, string | undefined>>) {
  for (const name of BINDING_NAMES) delete process.env[name];
  for (const [key, value] of Object.entries(VALID_ENV)) {
    process.env[key] = value;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** `env.ts` parses at module load (BP-005), so observing a fresh parse
 * requires a fresh module instance — `vi.resetModules()` before every
 * import, per binding under test. */
async function importEnvModule(): Promise<{ env: Record<string, unknown> }> {
  vi.resetModules();
  return import(ENV_MODULE);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('BP-005 error behaviour — "`env` throws at boot on a missing or malformed binding; there is no default and no fallback, so a deployment cannot start half-configured."', () => {
  it.each(BINDING_NAMES)("throws at module load when %s is missing", async (name) => {
    applyEnv({ [name]: undefined });
    await expect(importEnvModule()).rejects.toThrow();
  });

  it("does not throw when every binding is present and valid", async () => {
    applyEnv({});
    await expect(importEnvModule()).resolves.toBeDefined();
  });

  it("throws when KILL_SWITCH is not boolean-ish", async () => {
    applyEnv({ KILL_SWITCH: "not-a-boolean" });
    await expect(importEnvModule()).rejects.toThrow();
  });

  it("throws when OWNER_EMAILS contains a malformed address", async () => {
    applyEnv({ OWNER_EMAILS: "not-an-email" });
    await expect(importEnvModule()).rejects.toThrow();
  });

  it("throws when a URL binding is malformed", async () => {
    applyEnv({ SUPABASE_URL: "not-a-url" });
    await expect(importEnvModule()).rejects.toThrow();
  });

  it("throws when a plain-string binding is empty", async () => {
    applyEnv({ STRIPE_PRICE_ID: "" });
    await expect(importEnvModule()).rejects.toThrow();
  });
});

describe("`BUILD.md` §15's binding list", () => {
  it("env's key set equals §15's list plus HOSTED_EDGE_CNAME_TARGET — an extra binding fails; a missing one fails", async () => {
    applyEnv({});
    const { env } = await importEnvModule();
    expect(Object.keys(env).sort()).toEqual([...BINDING_NAMES].sort());
  });
});

describe('BP-005 `## Public interface` — "`HOSTED_EDGE_CNAME_TARGET` — the hostname a customer points `content.{their-domain}` at … It is one deployment-scoped hostname, so it is a binding rather than a constant"', () => {
  it("is read from env, tracking process.env rather than a fixed constant", async () => {
    applyEnv({ HOSTED_EDGE_CNAME_TARGET: "content.another-deployment.example.com" });
    const { env } = await importEnvModule();
    expect(env.HOSTED_EDGE_CNAME_TARGET).toBe("content.another-deployment.example.com");
  });
});

describe('BP-002 error behaviour, applied to env\'s own secrets — "A `dbAdmin()` import from a client component is a build error, not a runtime one." (WO-011 guards dbAdmin(); this guards env\'s server-only bindings so the same secret cannot leak ahead of it)', () => {
  it.each(SERVER_ONLY_NAMES)("%s throws when read from a client bundle", async (name) => {
    applyEnv({});
    const { env } = await importEnvModule();
    vi.stubGlobal("window", {});
    expect(() => env[name]).toThrow();
  });

  it.each(SERVER_ONLY_NAMES)("%s does not throw outside a client bundle", async (name) => {
    applyEnv({});
    const { env } = await importEnvModule();
    expect(() => env[name]).not.toThrow();
  });

  it("a non-server-only binding does not throw when read from a client bundle", async () => {
    applyEnv({});
    const { env } = await importEnvModule();
    vi.stubGlobal("window", {});
    expect(() => env.NEXT_PUBLIC_APP_URL).not.toThrow();
  });
});
