import { WC_TOUR_ID_BASE } from "@/lib/worldcup";

export type PrizeTier = { rank: number; pct: number };

/** Default grid — top 10, sums to 100%. Used for EPL and most WC rounds. */
export const DEFAULT_PRIZE_TIERS: readonly PrizeTier[] = [
  { rank: 1, pct: 30 },
  { rank: 2, pct: 20 },
  { rank: 3, pct: 15 },
  { rank: 4, pct: 8 },
  { rank: 5, pct: 7 },
  { rank: 6, pct: 6 },
  { rank: 7, pct: 5 },
  { rank: 8, pct: 4 },
  { rank: 9, pct: 3 },
  { rank: 10, pct: 2 },
];

/**
 * WC MD3 (10003): 8 squads — top 3 unchanged; +1% each to ranks 4–8 (ex 9–10 share).
 */
export const WC_MD3_TOUR_ID = WC_TOUR_ID_BASE + 3;
/** WC R32 (10004): same 8-squad split as MD3. */
export const WC_R32_TOUR_ID = WC_TOUR_ID_BASE + 4;
/** WC R16 (10005): 5 squads — top 3 unchanged; ranks 6–10 share redistributed to 4–5. */
export const WC_R16_TOUR_ID = WC_TOUR_ID_BASE + 5;
/** WC QF (10006): 2 squads — ranks 3–10 share redistributed to 1–2 (30:20 → 60:40). */
export const WC_QF_TOUR_ID = WC_TOUR_ID_BASE + 6;

export const WC_MD3_PRIZE_TIERS: readonly PrizeTier[] = [
  { rank: 1, pct: 30 },
  { rank: 2, pct: 20 },
  { rank: 3, pct: 15 },
  { rank: 4, pct: 9 },
  { rank: 5, pct: 8 },
  { rank: 6, pct: 7 },
  { rank: 7, pct: 6 },
  { rank: 8, pct: 5 },
];

/** Top 3 unchanged; merge default ranks 6–10 share (+20%) into ranks 4–5 (8:7 → 19:16). */
export const WC_R16_PRIZE_TIERS: readonly PrizeTier[] = [
  { rank: 1, pct: 30 },
  { rank: 2, pct: 20 },
  { rank: 3, pct: 15 },
  { rank: 4, pct: 19 },
  { rank: 5, pct: 16 },
];

/** Top 2 only; merge default ranks 3–10 share (+50%) into ranks 1–2 (30:20 → 60:40). */
export const WC_QF_PRIZE_TIERS: readonly PrizeTier[] = [
  { rank: 1, pct: 60 },
  { rank: 2, pct: 40 },
];

const TOUR_PRIZE_OVERRIDES: Readonly<Record<number, readonly PrizeTier[]>> = {
  [WC_MD3_TOUR_ID]: WC_MD3_PRIZE_TIERS,
  [WC_R32_TOUR_ID]: WC_MD3_PRIZE_TIERS,
  [WC_R16_TOUR_ID]: WC_R16_PRIZE_TIERS,
  [WC_QF_TOUR_ID]: WC_QF_PRIZE_TIERS,
};

export function getPrizeTiers(gameweekId: number): readonly PrizeTier[] {
  return TOUR_PRIZE_OVERRIDES[gameweekId] ?? DEFAULT_PRIZE_TIERS;
}

export function getPrizeRankCount(gameweekId: number): number {
  return getPrizeTiers(gameweekId).length;
}

export function isRankInPrizeZone(rank: number, gameweekId: number): boolean {
  return rank >= 1 && rank <= getPrizeRankCount(gameweekId);
}

export function getPrizeRecalcArgs(gameweekId: number): {
  prizeRanks: number[];
  prizePercentages: number[];
} {
  const tiers = getPrizeTiers(gameweekId);
  return {
    prizeRanks: tiers.map((t) => t.rank),
    prizePercentages: tiers.map((t) => t.pct),
  };
}

/** Percentage attached to an ordinal finishing slot (1 = first); 0 outside the table. */
function pctForSlot(tiers: readonly PrizeTier[], slot: number): number {
  return tiers.find((t) => t.rank === slot)?.pct ?? 0;
}

export type Standing<Owner = string> = {
  owner: Owner;
  /** Points after every multiplier — the value the leaderboard sorts on. */
  finalPoints: number;
};

export type PrizeAward<Owner = string> = {
  owner: Owner;
  /** Competition rank: 1, 2, 2, 4, … */
  rank: number;
  finalPoints: number;
  /** Smallest unit of the payout asset (USDC micro-units on Solana, octas on Movement). */
  amount: bigint;
};

/**
 * Splits a prize pool across a leaderboard. This is the settlement rule the chain
 * is paid out against, so it lives here rather than in any one chain client.
 *
 * Ties take a competition rank and share the summed percentages of every slot the
 * group occupies (a two-way tie for 4th splits 8% + 7%). The integer remainder of
 * that split is handed out one unit at a time to the earliest members in sort
 * order, matching `fantasy_epl::calculate_results_v3`.
 *
 * Sorting by points is stable, so the caller's own ordering inside a tie decides
 * who receives the extra unit.
 */
export function allocatePrizes<Owner>(
  prizePool: bigint,
  standings: readonly Standing<Owner>[],
  gameweekId: number,
): PrizeAward<Owner>[] {
  const tiers = getPrizeTiers(gameweekId);
  const sorted = [...standings].sort((a, b) => b.finalPoints - a.finalPoints);
  const awards: PrizeAward<Owner>[] = [];

  let index = 0;
  while (index < sorted.length) {
    let end = index;
    while (end + 1 < sorted.length && sorted[end + 1].finalPoints === sorted[index].finalPoints) {
      end += 1;
    }

    const rank = index + 1;
    const tieCount = BigInt(end - index + 1);
    let sumPct = 0;
    for (let slot = rank; slot <= end + 1; slot += 1) sumPct += pctForSlot(tiers, slot);

    const groupTotal = (prizePool * BigInt(sumPct)) / BigInt(100);
    const share = groupTotal / tieCount;
    const remainder = groupTotal % tieCount;

    for (let offset = 0; index + offset <= end; offset += 1) {
      const member = sorted[index + offset];
      awards.push({
        owner: member.owner,
        rank,
        finalPoints: member.finalPoints,
        amount: BigInt(offset) < remainder ? share + BigInt(1) : share,
      });
    }
    index = end + 1;
  }

  return awards;
}

export function sumPrizeAwards<Owner>(awards: readonly PrizeAward<Owner>[]): bigint {
  return awards.reduce((total, award) => total + award.amount, BigInt(0));
}
