// src/lib/egress/policy.ts — WO-018, BP-006 `## Error & edge behavior`:
// "Refuses by policy, before any connection: private, loopback, link-local,
// multicast and reserved address space; non-http(s) schemes; redirects that
// leave the policy (each hop re-checked); ports other than 80/443."
//
// Every function here is pure and needs no network access: `checkSchemeAndPort`
// decides from the URL alone (no DNS needed, so it runs before any lookup),
// and `checkAddress` decides from an already-resolved IP literal. `safe-fetch.ts`
// calls both, once per hop, and never connects when either refuses.
//
// **Address-class boundaries are chosen here as a parameter (rule 1.1).**
// BP-006 names five classes by name — "private, loopback, link-local,
// multicast and reserved" — without enumerating CIDR ranges, so the exact
// numeric edges are an implementation choice, not a customer promise.
// IPv4 ranges below are IANA's special-purpose address registry (RFC 6890);
// IPv6 ranges are RFC 4291 (loopback/link-local/multicast), RFC 4193
// (unique-local, classed here as "private"), RFC 3849 (documentation) and
// RFC 6052 (NAT64 well-known prefix). Built on `node:net`'s `BlockList`
// (stable since Node 15) rather than hand-rolled CIDR arithmetic — a
// narrower, already-audited primitive for exactly this membership question.
// Reversal cost: low — every range lives in the two tables below, in this
// file only, with no customer-visible consequence; only the set of
// addresses refused moves, never a promise this product makes.
//
// IPv4-mapped IPv6 literals (`::ffff:a.b.c.d`) are unwrapped and
// reclassified against the IPv4 tables too — a known SSRF bypass (an
// attacker-controlled URL spelling a private IPv4 address inside a
// technically-distinct IPv6 literal) that a naive per-family check misses.
import { BlockList, isIP } from "node:net";

export type AddressClass = "private" | "loopback" | "link_local" | "multicast" | "reserved" | "public";

type Cidr = { net: string; prefix: number; family: 4 | 6 };

const RANGES: Record<Exclude<AddressClass, "public">, Cidr[]> = {
  loopback: [
    { net: "127.0.0.0", prefix: 8, family: 4 },
    { net: "::1", prefix: 128, family: 6 },
  ],
  link_local: [
    { net: "169.254.0.0", prefix: 16, family: 4 },
    { net: "fe80::", prefix: 10, family: 6 },
  ],
  multicast: [
    { net: "224.0.0.0", prefix: 4, family: 4 },
    { net: "ff00::", prefix: 8, family: 6 },
  ],
  private: [
    { net: "10.0.0.0", prefix: 8, family: 4 },
    { net: "172.16.0.0", prefix: 12, family: 4 },
    { net: "192.168.0.0", prefix: 16, family: 4 },
    { net: "fc00::", prefix: 7, family: 6 }, // RFC 4193 unique-local
  ],
  reserved: [
    { net: "0.0.0.0", prefix: 8, family: 4 }, // "this network"
    { net: "100.64.0.0", prefix: 10, family: 4 }, // carrier-grade NAT
    { net: "192.0.0.0", prefix: 24, family: 4 }, // IETF protocol assignments
    { net: "192.0.2.0", prefix: 24, family: 4 }, // TEST-NET-1
    { net: "198.18.0.0", prefix: 15, family: 4 }, // benchmarking
    { net: "198.51.100.0", prefix: 24, family: 4 }, // TEST-NET-2
    { net: "203.0.113.0", prefix: 24, family: 4 }, // TEST-NET-3
    { net: "240.0.0.0", prefix: 4, family: 4 }, // reserved for future use
    { net: "255.255.255.255", prefix: 32, family: 4 }, // limited broadcast
    { net: "::", prefix: 128, family: 6 }, // unspecified address
    { net: "64:ff9b::", prefix: 96, family: 6 }, // NAT64 well-known prefix
    { net: "100::", prefix: 64, family: 6 }, // discard-only
    { net: "2001:db8::", prefix: 32, family: 6 }, // documentation
  ],
};

const BLOCK_LISTS: Record<Exclude<AddressClass, "public">, BlockList> = (() => {
  const lists = {} as Record<Exclude<AddressClass, "public">, BlockList>;
  for (const cls of Object.keys(RANGES) as Array<Exclude<AddressClass, "public">>) {
    const bl = new BlockList();
    for (const r of RANGES[cls]) bl.addSubnet(r.net, r.prefix, r.family === 4 ? "ipv4" : "ipv6");
    lists[cls] = bl;
  }
  return lists;
})();

const CLASS_ORDER: Array<Exclude<AddressClass, "public">> = [
  "loopback",
  "link_local",
  "multicast",
  "private",
  "reserved",
];

const IPV4_MAPPED_RE = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

/** Classifies one already-resolved IP literal. Never throws; an input that
 *  is not a valid IPv4/IPv6 literal is treated as `"reserved"` (refused) —
 *  a resolver returning garbage is refused, never silently let through. */
export function classifyAddress(ip: string): AddressClass {
  const family = isIP(ip);
  if (family === 0) return "reserved";

  const mapped = family === 6 ? IPV4_MAPPED_RE.exec(ip) : null;
  const embeddedIpv4 = mapped?.[1];
  if (embeddedIpv4 && isIP(embeddedIpv4) === 4) {
    const embeddedClass = classifyAddress(embeddedIpv4);
    if (embeddedClass !== "public") return embeddedClass;
  }

  for (const cls of CLASS_ORDER) {
    if (BLOCK_LISTS[cls].check(ip, family === 4 ? "ipv4" : "ipv6")) return cls;
  }
  return "public";
}

export function isBlockedAddress(ip: string): boolean {
  return classifyAddress(ip) !== "public";
}

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set([80, 443]);

export type PolicyVerdict = { ok: true } | { ok: false; reason: string };

/** BP-006: "non-http(s) schemes; ... ports other than 80/443." Decided from
 *  the URL alone, before any DNS lookup or connection. */
export function checkSchemeAndPort(url: URL): PolicyVerdict {
  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { ok: false, reason: `scheme '${url.protocol}' is not http: or https:` };
  }
  const effectivePort = url.port !== "" ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!ALLOWED_PORTS.has(effectivePort)) {
    return { ok: false, reason: `port ${effectivePort} is not 80 or 443` };
  }
  return { ok: true };
}

/** BP-006: "private, loopback, link-local, multicast and reserved address
 *  space" refused. Decided from an already-resolved IP literal — this is
 *  the check `safe-fetch.ts` runs on the address it is about to pin to and
 *  connect to, never on the hostname. */
export function checkAddress(ip: string): PolicyVerdict {
  const cls = classifyAddress(ip);
  if (cls === "public") return { ok: true };
  return { ok: false, reason: `address '${ip}' classifies as '${cls}'` };
}
