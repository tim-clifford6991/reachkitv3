// src/lib/scan/admission.ts — BP-023 `## Public interface`, WO-057
//
// `admitFreeScan` answers *may a free scan start* against the free path's
// bounds, in BP-012's fixed order, without side effects and without
// consuming an allowance — every render of a report address can ask the
// question (BP-023 decision 5: this function checks, `claimFreeScanSlot`,
// WO-058, consumes). The order is BP-012's, reproduced here as the step
// list only; the reasoning lives in BP-012's `## Decisions` (rule 2.4):
//
//   removed → cooldown → switched off / daily ceiling → in-flight → hourly
//
// what each step reads and returns is BP-023's `## Error & edge behavior`
// table.
//
// **Two schema gaps, each flagged once here (constitution rule 4.2), not
// fabricated around:**
//
//  1. `domain_blocks` (BP-002's table; the removal address holds it, and
//     WO-012 is its migration) has not landed in this repo — `supabase/
//     migrations/` carries no `domain_blocks` migration, and WO-012 is
//     `status: approved` but not in wave W2's roster (WO-057's own
//     `depends-on` does not name it). The generated `Database` type
//     (`src/lib/db/types.generated.ts`, outside this WO's file plan)
//     therefore carries no entry for it.
//  2. `scans.network_hash` was added to the live schema by WO-056's
//     migration (`supabase/migrations/00000000000005_scans_freepath.sql`),
//     but `types.generated.ts` was not regenerated in that WO's own file
//     plan, so the column is absent from the generated `Database` type
//     too, even though the column itself exists.
//
// Both gaps are worked around the same way: a minimal, locally declared
// row shape and a narrow, explicitly cast query builder (`untyped`,
// below) for exactly the two calls that touch them — `domain_blocks`
// entirely, and `scans.network_hash` on the in-flight and hourly steps.
// Every other query in this file is fully typed against the generated
// `Database`. Neither gap is this WO's to close: `domain_blocks`'s
// migration is WO-012's, and regenerating `types.generated.ts` is outside
// this WO's file plan (touching it would be a WO-267-shaped change, not
// an admission-order one).
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { env } from "@/lib/config/env";
import {
  DAILY_WINDOW_H,
  FAILURE_COOLDOWN_H,
  FREE_BOUNDS,
  HOURLY_WINDOW_H,
} from "@/lib/config/constants";
import { dbAdmin } from "@/lib/db";
import type { CanonicalDomain } from "./domain";

// ── NetworkKey — BP-023 decision 3 ──────────────────────────────────────

/** Opaque, salted, non-reversible. REQ-003 counts by network; no raw address is
 *  stored or logged anywhere in the product. */
export type NetworkKey = string & { readonly __networkKey: unique symbol };

const UNKNOWN_NETWORK_SEED = "unknown";

/** Accepts the first entry of `x-forwarded-for`, truncates an IPv6 address
 *  to its /64 prefix (BP-023 decision 3: a single subscriber routinely
 *  holds a whole /64), and HMACs the result with `IP_HASH_SALT` — never the
 *  raw address itself. A null or unparseable header still yields a key — a
 *  stable one shared for every unparseable input, so a visitor with a
 *  malformed header is still counted rather than crashing the check — and
 *  this function never throws. */
export function networkKeyOf(forwardedFor: string | null): NetworkKey {
  try {
    const entry = firstForwardedEntry(forwardedFor);
    const seed = entry === null ? UNKNOWN_NETWORK_SEED : addressSeed(entry);
    return hashSeed(seed);
  } catch {
    return hashSeed(UNKNOWN_NETWORK_SEED);
  }
}

function firstForwardedEntry(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : null;
}

function addressSeed(candidate: string): string {
  const stripped = stripBrackets(candidate.split("%")[0] ?? candidate);
  const kind = isIP(stripped);
  if (kind === 4) return stripped;
  if (kind === 6) return ipv6Prefix64(stripped) ?? UNKNOWN_NETWORK_SEED;
  return UNKNOWN_NETWORK_SEED;
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/** The address's /64 network prefix, as its first four (of eight) 16-bit
 *  groups, fully expanded — `null` when the address does not expand to
 *  eight groups (defence in depth; `isIP` has already validated it). */
function ipv6Prefix64(address: string): string | null {
  const groups = expandIPv6Groups(address);
  if (!groups || groups.length !== 8) return null;
  return groups.slice(0, 4).join(":");
}

function expandIPv6Groups(address: string): string[] | null {
  const halves = address.split("::");
  if (halves.length > 2) return null;
  if (halves.length === 2) {
    const head = halves[0] ? halves[0].split(":") : [];
    const tail = halves[1] ? halves[1].split(":") : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    return [...head, ...Array(missing).fill("0"), ...tail];
  }
  const groups = address.split(":");
  return groups.length === 8 ? groups : null;
}

function hashSeed(seed: string): NetworkKey {
  return createHmac("sha256", env.IP_HASH_SALT).update(seed).digest("hex") as NetworkKey;
}

// ── Admission — BP-012's declared union, reproduced verbatim ────────────

/** Verbatim BP-012's declared union — the refusal reasons and their fields are
 *  that node's contract and are not restated differently here. */
export type Admission =
  | { admit: true }
  | { refuse: "hourly"; retryAfterSeconds: number }
  | { refuse: "in_flight"; sameDomain: boolean; runningScanId?: string }
  | { refuse: "daily"; retryAfterSeconds: number }
  | { refuse: "switched_off" }
  | { refuse: "cooldown"; retryAfterSeconds: number }
  | { refuse: "removed" };

// ── The narrow, explicitly cast escape hatch for the two schema gaps ────

interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/** The subset of the PostgREST filter-builder chain this file calls,
 *  typed against a locally declared row shape rather than the generated
 *  `Database` (see the module header's two gaps). Thenable, matching the
 *  real client's own builder. */
interface MinimalQueryBuilder<T> extends PromiseLike<QueryResult<T>> {
  select(columns: string): MinimalQueryBuilder<T>;
  eq(column: string, value: string): MinimalQueryBuilder<T>;
  gte(column: string, value: string): MinimalQueryBuilder<T>;
  order(column: string, opts: { ascending: boolean }): MinimalQueryBuilder<T>;
  limit(count: number): MinimalQueryBuilder<T>;
}

interface MinimalClient {
  from<T>(table: string): MinimalQueryBuilder<T>;
}

/** Cast boundary for gap 1 and gap 2 (module header). Nothing else in this
 *  file bypasses the generated `Database` type. */
function untyped(client: ReturnType<typeof dbAdmin>): MinimalClient {
  return client as unknown as MinimalClient;
}

interface DomainBlockRow {
  domain: string;
}

interface ScanNetworkRow {
  id: string;
  domain: string;
}

// ── The six-step order — BP-012's, evaluated here ───────────────────────

type Client = ReturnType<typeof dbAdmin>;

async function isRemoved(client: Client, domain: CanonicalDomain): Promise<boolean> {
  const { data, error } = await untyped(client)
    .from<DomainBlockRow>("domain_blocks")
    .select("domain")
    .eq("domain", domain)
    .limit(1);
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

async function checkCooldown(client: Client, domain: CanonicalDomain): Promise<Admission | null> {
  const { data, error } = await client
    .from("scans")
    .select("created_at")
    .eq("domain", domain)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const latest = data?.[0];
  if (!latest) return null;
  const windowMs = FAILURE_COOLDOWN_H * 3_600_000;
  const elapsedMs = Date.now() - new Date(latest.created_at).getTime();
  if (elapsedMs >= windowMs) return null;
  return { refuse: "cooldown", retryAfterSeconds: Math.ceil((windowMs - elapsedMs) / 1000) };
}

async function checkDaily(client: Client): Promise<Admission | null> {
  const windowMs = DAILY_WINDOW_H * 3_600_000;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await client
    .from("scans")
    .select("created_at")
    .eq("tier", "free")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(FREE_BOUNDS.scansPerDay);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length < FREE_BOUNDS.scansPerDay) return null;
  const oldest = rows[rows.length - 1];
  if (!oldest) return null;
  const ageMs = Date.now() - new Date(oldest.created_at).getTime();
  const remainingMs = Math.max(0, windowMs - ageMs);
  return { refuse: "daily", retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

async function checkInFlight(
  client: Client,
  network: NetworkKey,
  domain: CanonicalDomain
): Promise<Admission | null> {
  const { data, error } = await untyped(client)
    .from<ScanNetworkRow>("scans")
    .select("id, domain")
    .eq("network_hash", network)
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const running = data?.[0];
  if (!running) return null;
  return running.domain === domain
    ? { refuse: "in_flight", sameDomain: true, runningScanId: running.id }
    : { refuse: "in_flight", sameDomain: false };
}

async function checkHourly(client: Client, network: NetworkKey): Promise<Admission | null> {
  const windowMs = HOURLY_WINDOW_H * 3_600_000;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await untyped(client)
    .from<{ created_at: string }>("scans")
    .select("created_at")
    .eq("network_hash", network)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(FREE_BOUNDS.scansPerIpPerHour);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length < FREE_BOUNDS.scansPerIpPerHour) return null;
  const oldest = rows[rows.length - 1];
  if (!oldest) return null;
  const ageMs = Date.now() - new Date(oldest.created_at).getTime();
  const remainingMs = Math.max(0, windowMs - ageMs);
  return { refuse: "hourly", retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

type FreeStep = "removed" | "cooldown" | "switched_off" | "daily" | "in_flight" | "hourly" | "none";

/** BP-023 NFR budget: "one line per admission carrying the decision, the
 *  step that produced it, the network key (hashed) and the domain. Never a
 *  raw address." `network` is already the HMAC output — `networkKeyOf`
 *  never returns a raw address. */
function logAdmission(result: Admission, step: FreeStep, network: NetworkKey, domain: CanonicalDomain): void {
  const decision = "admit" in result ? "admit" : result.refuse;
  console.log(
    JSON.stringify({ event: "admission", decision, step, network, domain })
  );
}

function finish<T extends Admission>(
  result: T,
  step: FreeStep,
  network: NetworkKey,
  domain: CanonicalDomain
): T {
  logAdmission(result, step, network, domain);
  return result;
}

/** Idempotent and free of side effects: BP-022 calls it on every render of a
 *  report address, and a render must never consume an allowance. */
export async function admitFreeScan(a: {
  domain: CanonicalDomain;
  network: NetworkKey;
}): Promise<Admission> {
  const client = dbAdmin();

  // Step 1 — removed. Outside the fail-open handler (WO-057 `## Steps`
  // step 4, BP-023 `## Error & edge behavior`): a `domain_blocks` read
  // that errors refuses rather than admits, because failing open there
  // would serve a removed report, which REQ-002 criterion 3 forbids
  // absolutely.
  let removed: boolean;
  try {
    removed = await isRemoved(client, a.domain);
  } catch {
    return finish({ refuse: "removed" }, "removed", a.network, a.domain);
  }
  if (removed) return finish({ refuse: "removed" }, "removed", a.network, a.domain);

  // Steps 2 to 6 — cooldown, switched off, daily, in-flight, hourly — are
  // wrapped in one fail-open handler: any read error here admits (REQ-003
  // c9), and the failure is logged as such (the step that threw is the
  // step the log line names).
  let step: FreeStep = "cooldown";
  try {
    const cooldown = await checkCooldown(client, a.domain);
    if (cooldown) return finish(cooldown, "cooldown", a.network, a.domain);

    step = "switched_off";
    if (env.KILL_SWITCH) return finish({ refuse: "switched_off" }, "switched_off", a.network, a.domain);

    step = "daily";
    const daily = await checkDaily(client);
    if (daily) return finish(daily, "daily", a.network, a.domain);

    step = "in_flight";
    const inFlight = await checkInFlight(client, a.network, a.domain);
    if (inFlight) return finish(inFlight, "in_flight", a.network, a.domain);

    step = "hourly";
    const hourly = await checkHourly(client, a.network);
    if (hourly) return finish(hourly, "hourly", a.network, a.domain);

    return finish({ admit: true }, "none", a.network, a.domain);
  } catch {
    return finish({ admit: true }, step, a.network, a.domain);
  }
}
