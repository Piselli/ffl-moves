import type { TeamResult } from "@/lib/types";

const RPC = () =>
  (process.env.NEXT_PUBLIC_MOVEMENT_RPC_URL ?? process.env.NEXT_PUBLIC_APTOS_API ?? "").replace(
    /\/$/,
    "",
  );

export function normTourOwnerAddr(addr: string): string {
  const t = addr.trim().toLowerCase();
  return t.startsWith("0x") ? t : `0x${t}`;
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
    const direct = await fetchOwnersWithClaimPrizeTx(tourId, [owner]);
    return direct.has(normalized);
  }
  return false;
}

type AccountTx = {
  type?: string;
  success?: boolean;
  payload?: { function?: string; arguments?: unknown[] };
};

/** Wallets that successfully called `claim_prize` for this tour (includes pre-recalc claims). */
export async function fetchOwnersWithClaimPrizeTx(
  tourId: number,
  ownerAddresses: string[],
): Promise<Set<string>> {
  const base = RPC();
  if (!base || ownerAddresses.length === 0) return new Set();

  const claimed = new Set<string>();
  const tourArg = String(tourId);

  await mapPool(ownerAddresses, 4, async (owner) => {
    const addr = normTourOwnerAddr(owner);
    try {
      const res = await fetch(`${base}/accounts/${addr}/transactions?limit=100`);
      if (!res.ok) return;
      const txs = (await res.json()) as AccountTx[];
      for (const tx of txs) {
        const fn = tx.payload?.function ?? "";
        if (tx.type !== "user_transaction" || !tx.success || !fn.includes("claim_prize")) continue;
        const args = tx.payload?.arguments ?? [];
        if (String(args[0]) === tourArg) {
          claimed.add(addr);
          break;
        }
      }
    } catch {
      /* ignore per-wallet */
    }
  });

  return claimed;
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

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(fn));
  }
}
