import type { TeamResult } from "@/lib/types";
import { getClaimedOwners } from "@/lib/chainClient";

/**
 * Solana addresses are base58 and case-sensitive, so the canonical form is the
 * string itself. Running them through the Move normalizer would lowercase them
 * and bolt on an `0x`, which can collide two distinct wallets.
 */
export function normTourOwnerAddr(addr: string): string {
  return addr.trim();
}

export function tourOwnersMatch(a: string, b: string): boolean {
  return normTourOwnerAddr(a) === normTourOwnerAddr(b);
}

/** Fetch claim history via server cache (preferred in browser). */
export async function fetchTourClaimHistoryFromApi(tourId: number): Promise<Set<string>> {
  try {
    const res = await fetch(`/api/tour-claim-history?tour=${tourId}`, { cache: "no-store" });
    if (!res.ok) return new Set();
    const data = (await res.json()) as { owners?: string[] };
    return new Set((data.owners ?? []).map(normTourOwnerAddr));
  } catch {
    return new Set();
  }
}

export async function ownerHasPriorClaimPrize(
  tourId: number,
  owner: string,
  registeredAddresses?: string[],
): Promise<boolean> {
  const normalized = normTourOwnerAddr(owner);
  const fromApi = await fetchTourClaimHistoryFromApi(tourId);
  if (fromApi.has(normalized)) return true;
  if (registeredAddresses?.length) {
    const direct = await fetchOwnersWithClaimedPrize(tourId, [owner]);
    return direct.has(normalized);
  }
  return false;
}

/** Wallets already paid for this tour, read from their `ClaimReceipt` accounts. */
export async function fetchOwnersWithClaimedPrize(
  tourId: number,
  ownerAddresses: string[],
): Promise<Set<string>> {
  if (ownerAddresses.length === 0) return new Set();
  const claimed = await getClaimedOwners(tourId, ownerAddresses.map(normTourOwnerAddr));
  return new Set(claimed);
}

export function mergePriorClaimsIntoResults(
  results: TeamResult[],
  priorClaimedOwners: Set<string>,
): TeamResult[] {
  if (priorClaimedOwners.size === 0) return results;
  return results.map((r) => {
    if (r.claimed) return r;
    if (!priorClaimedOwners.has(normTourOwnerAddr(r.owner))) return r;
    return { ...r, claimed: true };
  });
}
