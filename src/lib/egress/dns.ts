// BUILD §6.4
// src/lib/egress/dns.ts — `resolvesInDns`, the one meaning of "reachable"
// (BP-006 decision 2, issue #22).
//
// Three requirements define "reachable" as "resolves in DNS" (REQ-021 c9,
// REQ-026 c8, REQ-071 c4–c6); this is the single implementation they all
// cite, so the meaning cannot be widened at a call site. It answers exactly
// one question — does this name resolve to an address our fetcher would be
// allowed to connect to — and exposes no other verdict: no "the site
// responded", no status, no reason arm. A site that is new, thin, unbuilt
// or blocking our fetcher still resolves and is therefore accepted.
//
// "Resolves" carries `safeFetch`'s own SSRF policy (`policy.ts`): a name
// that resolves only to private, loopback, link-local, multicast or
// reserved space is one `safeFetch` would refuse before connecting, so it
// is not reachable in the only sense this product ever uses the word. The
// resolution itself is `safe-fetch.ts`'s `resolveAddress` — the same
// lookup, the same IP-literal short-circuit, the same timeout mechanism —
// so the two can never disagree about what a name resolves to.
//
// Never throws; never opens a socket.
import { DNS_TIMEOUT_MS } from "@/lib/config/constants";
import { checkAddress } from "./policy";
import { resolveAddress } from "./safe-fetch";

/** BP-006 `resolvesInDns(host)`. `host` is a bare hostname (or IP literal),
 *  never a URL. */
export async function resolvesInDns(host: string): Promise<boolean> {
  const name = host.trim();
  if (name === "") return false;

  const resolved = await resolveAddress(name, DNS_TIMEOUT_MS);
  if (resolved.kind !== "resolved") return false;
  return checkAddress(resolved.address).ok;
}
