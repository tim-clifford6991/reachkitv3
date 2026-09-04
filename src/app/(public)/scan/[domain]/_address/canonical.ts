// src/app/(public)/scan/[domain]/_address/canonical.ts — BP-022 `## Public
// interface`, WO-061
//
// 308s any non-canonical written form of a domain to the one address for it
// (REQ-001 c2). The parse itself is WO-051's `parseDomain` (BP-023); this
// is the redirect policy that keeps one address per domain, and it holds
// no parse logic of its own.
import { parseDomain } from "@/lib/scan/domain";

/** `null` when the segment does not parse (row 1 of the resolution table
 *  handles that, not this function) or already is the canonical form.
 *  Otherwise the one address every other written form of the same domain
 *  redirects to. */
export function canonicalRedirect(rawSegment: string): { redirectTo: string } | null {
  const parsed = parseDomain(rawSegment);
  if (!parsed.ok) return null;
  if (rawSegment === parsed.domain) return null;
  return { redirectTo: `/scan/${parsed.domain}` };
}
