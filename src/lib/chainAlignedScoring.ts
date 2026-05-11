/**
 * Mirrors `fantasy_epl::calculate_team_points` + `calculate_results` pre-multiplier logic
 * so the squad UI matches on-chain `TeamResult` / leaderboard scoring.
 *
 * @see move/fantasy-epl-contract/sources/fantasy_epl.move — calculate_team_points, calculate_results
 */

import type { Player } from "@/lib/types";
import { calculateFantasyPoints, ratingTierAdjustment } from "@/lib/scoring";
import { placeholderPlayerFromChain } from "@/lib/fplSquadResolve";

export type ChainAlignedXiSlot = {
  slotIndex: number;
  registeredStarter: Player;
  effectivePlayer: Player;
  substituted: boolean;
  /** Base fantasy points counted toward XI total (sub’s stats when substituted). */
  basePoints: number;
  /** Base points from the registered starter’s own stats — for UI next to their name (0 if DNP). */
  registeredDisplayBase: number;
  ratingAdd: number;
  ratingSub: number;
};

export type ChainAlignedXiBreakdown = {
  slots: ChainAlignedXiSlot[];
  totalBase: number;
  totalRatingAdd: number;
  totalRatingSub: number;
  /** Same as Move `pre_multiplier` before title/guild multiplier */
  preMultiplier: number;
};

function pickStats(
  gameweekStats: Record<string, Record<string, unknown>>,
  playerId: number,
): Record<string, unknown> | null {
  const raw = gameweekStats[playerId] ?? gameweekStats[String(playerId)];
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

function minutesPlayed(stats: Record<string, unknown> | null): number {
  if (!stats) return 0;
  const m = Number(stats.minutes_played ?? stats.minutesPlayed);
  return Number.isFinite(m) ? m : 0;
}

/** Bench search order matches Move `find_substitute` (slots 11 → 13). Each bench player may auto-sub at most once. */
function findSubstitute(
  bench: Player[],
  positionId: number,
  gameweekStats: Record<string, Record<string, unknown>>,
  consumedBenchPlayerIds: Set<number>,
): Player | null {
  for (const p of bench) {
    if (!p || p.positionId !== positionId) continue;
    if (consumedBenchPlayerIds.has(p.id)) continue;
    const st = pickStats(gameweekStats, p.id);
    if (!st) continue;
    if (minutesPlayed(st) > 0) {
      consumedBenchPlayerIds.add(p.id);
      return p;
    }
  }
  return null;
}

/** Move: total_multiplier = 10000 + title_multiplier + guild_multiplier */
export function applyChainMultipliers(
  preMultiplier: number,
  titleMultiplier: number,
  guildMultiplier: number,
): number {
  const total = 10000 + titleMultiplier + guildMultiplier;
  return Math.floor((preMultiplier * total) / 10000);
}

/** Preview / interim leaderboard row — same squad math as the contract before title/guild multipliers. */
export function previewTourPointsFromRegisteredTeam(
  team: { playerIds: number[]; playerPositions: number[] },
  stats: Record<string, Record<string, unknown>>,
): number {
  const { playerIds, playerPositions } = team;
  if (playerIds.length < 14 || playerPositions.length < 14) return 0;
  const starters: Player[] = [];
  for (let j = 0; j < 11; j++) {
    const id = playerIds[j];
    if (!Number.isFinite(id)) return 0;
    const raw = playerPositions[j];
    const posId = Number.isFinite(raw) ? Math.max(0, Math.min(3, Number(raw))) : 2;
    starters.push(placeholderPlayerFromChain(id, posId));
  }
  const bench: Player[] = [];
  for (let k = 0; k < 3; k++) {
    const idx = 11 + k;
    const id = playerIds[idx];
    if (!Number.isFinite(id)) return 0;
    const raw = playerPositions[idx];
    const posId = Number.isFinite(raw) ? Math.max(0, Math.min(3, Number(raw))) : 2;
    bench.push(placeholderPlayerFromChain(id, posId));
  }
  return computeChainAlignedXiBreakdown(starters, bench, stats).preMultiplier;
}

export function computeChainAlignedXiBreakdown(
  starters: Player[],
  bench: Player[],
  gameweekStats: Record<string, Record<string, unknown>>,
): ChainAlignedXiBreakdown {
  const slots: ChainAlignedXiSlot[] = [];
  let totalBase = 0;
  let totalRatingAdd = 0;
  let totalRatingSub = 0;
  const consumedBenchPlayerIds = new Set<number>();

  const xi = Math.min(starters.length, 11);
  for (let i = 0; i < xi; i++) {
    const registeredStarter = starters[i];
    if (!registeredStarter) continue;

    const pushZero = (registeredDisplayBase: number) => {
      slots.push({
        slotIndex: i,
        registeredStarter,
        effectivePlayer: registeredStarter,
        substituted: false,
        basePoints: 0,
        registeredDisplayBase,
        ratingAdd: 0,
        ratingSub: 0,
      });
    };

    const starterStats = pickStats(gameweekStats, registeredStarter.id);
    if (!starterStats) {
      pushZero(0);
      continue;
    }

    const posId = registeredStarter.positionId;
    const starterDisplayBase = calculateFantasyPoints({ positionId: posId }, starterStats);

    if (minutesPlayed(starterStats) === 0) {
      const sub = findSubstitute(bench, posId, gameweekStats, consumedBenchPlayerIds);
      const subStats = sub ? pickStats(gameweekStats, sub.id) : null;
      if (!sub || !subStats || minutesPlayed(subStats) === 0) {
        pushZero(starterDisplayBase);
        continue;
      }
      const basePoints = calculateFantasyPoints({ positionId: posId }, subStats);
      const { add, sub: rs } = ratingTierAdjustment(subStats);
      totalBase += basePoints;
      totalRatingAdd += add;
      totalRatingSub += rs;
      slots.push({
        slotIndex: i,
        registeredStarter,
        effectivePlayer: sub,
        substituted: true,
        basePoints,
        registeredDisplayBase: starterDisplayBase,
        ratingAdd: add,
        ratingSub: rs,
      });
      continue;
    }

    const basePoints = starterDisplayBase;
    const { add, sub: rs } = ratingTierAdjustment(starterStats);
    totalBase += basePoints;
    totalRatingAdd += add;
    totalRatingSub += rs;
    slots.push({
      slotIndex: i,
      registeredStarter,
      effectivePlayer: registeredStarter,
      substituted: false,
      basePoints,
      registeredDisplayBase: starterDisplayBase,
      ratingAdd: add,
      ratingSub: rs,
    });
  }

  let ratingBonus: number;
  let ratingBonusNegative: boolean;
  if (totalRatingAdd >= totalRatingSub) {
    ratingBonus = totalRatingAdd - totalRatingSub;
    ratingBonusNegative = false;
  } else {
    ratingBonus = totalRatingSub - totalRatingAdd;
    ratingBonusNegative = true;
  }

  const preMultiplier = !ratingBonusNegative
    ? totalBase + ratingBonus
    : totalBase > ratingBonus
      ? totalBase - ratingBonus
      : 0;

  return {
    slots,
    totalBase,
    totalRatingAdd,
    totalRatingSub,
    preMultiplier,
  };
}
