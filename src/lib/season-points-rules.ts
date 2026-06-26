import { WC_TOUR_IDS, getWorldCupRound, isWorldCupTour } from "@/lib/worldcup";

/**
 * Season Points (SP) — meta-currency for loyalty, drops, and future rewards.
 * Distinct from fantasy tour points scored on the pitch.
 *
 * One unified season timeline: World Cup tours first (chronologically), then EPL
 * gameweeks. Streaks carry across the WC → EPL handoff automatically.
 *
 * ── Launch / close (commit + push) ─────────────────────────────────────────
 *   enabled: false  → season OFF (empty leaderboard)
 *   enabled: true   → counting starts; WC tours + EPL GWs earn SP as they resolve
 *   eplStartGw: 0   → EPL not in the timeline yet (WC-only phase)
 *   eplStartGw: N    → EPL joins the same season when those GWs resolve
 *   eplEndGw:   0    → open-ended
 *   eplEndGw:   M    → season ends after EPL GW M is resolved
 */
export const SEASON_POINTS_RULES_VERSION = 2;

export const CURRENT_SEASON = {
  id: 1,
  label: "2025/26",
  /** Flip to `true` when launching — until then nothing counts. */
  enabled: false,
  /** WC tours in timeline order (same contract, ids 10001+). */
  wcTourIds: WC_TOUR_IDS,
  /**
   * First EPL gameweek in this season. `0` until EPL phase begins.
   * Set before or when EPL starts — same season, streak continues from WC.
   */
  eplStartGw: 0,
  /** Last EPL GW. `0` = no end date yet. */
  eplEndGw: 0,
} as const;

export type SeasonPointsStatus = "inactive" | "live" | "ended";

export function isSeasonPointsActive(): boolean {
  return CURRENT_SEASON.enabled;
}

export function getSeasonPointsStatus(resolvedEplThroughGw: number): SeasonPointsStatus {
  if (!isSeasonPointsActive()) return "inactive";
  if (CURRENT_SEASON.eplEndGw > 0 && resolvedEplThroughGw >= CURRENT_SEASON.eplEndGw) {
    return "ended";
  }
  return "live";
}

/** EPL upper bound for aggregation. */
export function seasonEplCap(chainHighestGw: number): number {
  if (CURRENT_SEASON.eplEndGw > 0) return CURRENT_SEASON.eplEndGw;
  return chainHighestGw;
}

/** Human label for a timeline event (WC round key or GW number). */
export function formatSeasonEventLabel(eventId: number): string {
  const round = getWorldCupRound(eventId);
  if (round) return `WC ${round.key.toUpperCase()}`;
  return `GW ${eventId}`;
}

export function isSeasonWcEvent(eventId: number): boolean {
  return isWorldCupTour(eventId);
}

/** Awarded once per resolved gameweek where the wallet registered a squad. */
export const SP_REGISTRATION = 25;

/** One-time bonus for the first registration in the season window. */
export const SP_FIRST_REGISTRATION = 50;

/** Bonus for claiming a tour prize (encourages completing the payout loop). */
export const SP_CLAIM_BONUS = 10;

/**
 * Top-10 placement awards — ranks 11+ earn nothing.
 */
export const SP_TOP_RANK: Readonly<Record<number, number>> = {
  1: 200,
  2: 150,
  3: 120,
  4: 100,
  5: 85,
  6: 70,
  7: 55,
  8: 45,
  9: 35,
  10: 25,
};

/**
 * Streak bonus per resolved event (N = consecutive registered events in season order).
 * WC tours and EPL GWs share one streak counter. No tier above 4 — GW 5+ keeps +20.
 */
export const SP_STREAK_TIERS: ReadonlyArray<{ minStreak: number; bonus: number }> = [
  { minStreak: 4, bonus: 20 },
  { minStreak: 3, bonus: 15 },
  { minStreak: 2, bonus: 10 },
];

export const SP_STREAK_CAP = SP_STREAK_TIERS[0].bonus;

export function rankSeasonPoints(rank: number): number {
  if (!Number.isFinite(rank) || rank < 1 || rank > 10) return 0;
  return SP_TOP_RANK[rank] ?? 0;
}

export function streakBonusForLength(streak: number): number {
  if (streak < 2) return 0;
  for (const tier of SP_STREAK_TIERS) {
    if (streak >= tier.minStreak) return tier.bonus;
  }
  return 0;
}

export type GwSeasonPointSlice = {
  gameweekId: number;
  registered: boolean;
  rank: number;
  claimed: boolean;
  streakLength: number;
  registration: number;
  rankPoints: number;
  streak: number;
  claim: number;
  firstRegistration: number;
  total: number;
};

export type SeasonPointsTotals = {
  totalPoints: number;
  registrations: number;
  top10Finishes: number;
  bestRank: number;
  maxStreak: number;
  currentStreak: number;
  slices: GwSeasonPointSlice[];
};

/**
 * Pure function: compute season points from per-event participation data.
 * Events must be in season timeline order (WC block, then EPL block).
 */
export function computeSeasonPointsFromSlices(
  gameweeks: ReadonlyArray<{
    gameweekId: number;
    registered: boolean;
    rank: number;
    claimed: boolean;
  }>,
): SeasonPointsTotals {
  let totalPoints = 0;
  let registrations = 0;
  let top10Finishes = 0;
  let bestRank = 0;
  let maxStreak = 0;
  let currentStreak = 0;
  let firstRegistrationAwarded = false;
  const slices: GwSeasonPointSlice[] = [];

  for (const gw of gameweeks) {
    if (!gw.registered) {
      currentStreak = 0;
      slices.push({
        gameweekId: gw.gameweekId,
        registered: false,
        rank: gw.rank,
        claimed: gw.claimed,
        streakLength: 0,
        registration: 0,
        rankPoints: 0,
        streak: 0,
        claim: 0,
        firstRegistration: 0,
        total: 0,
      });
      continue;
    }

    currentStreak += 1;
    maxStreak = Math.max(maxStreak, currentStreak);
    registrations += 1;

    const registration = SP_REGISTRATION;
    const firstRegistration = !firstRegistrationAwarded ? SP_FIRST_REGISTRATION : 0;
    firstRegistrationAwarded = true;

    const rankPts = rankSeasonPoints(gw.rank);
    if (gw.rank >= 1 && gw.rank <= 10) top10Finishes += 1;
    if (gw.rank >= 1 && (bestRank === 0 || gw.rank < bestRank)) bestRank = gw.rank;

    const streak = streakBonusForLength(currentStreak);
    const claim = gw.claimed ? SP_CLAIM_BONUS : 0;
    const gwTotal = registration + firstRegistration + rankPts + streak + claim;
    totalPoints += gwTotal;

    slices.push({
      gameweekId: gw.gameweekId,
      registered: true,
      rank: gw.rank,
      claimed: gw.claimed,
      streakLength: currentStreak,
      registration,
      rankPoints: rankPts,
      streak,
      claim,
      firstRegistration,
      total: gwTotal,
    });
  }

  return {
    totalPoints,
    registrations,
    top10Finishes,
    bestRank,
    maxStreak,
    currentStreak,
    slices,
  };
}

export const SEASON_POINTS_RULE_ROWS = [
  { key: "registration", points: SP_REGISTRATION, labelEn: "Squad registered (per resolved event)", labelUk: "Реєстрація складу (за кожну подію)" },
  { key: "first", points: SP_FIRST_REGISTRATION, labelEn: "First registration in season (one-time)", labelUk: "Перша реєстрація в сезоні (одноразово)" },
  { key: "rank1", points: SP_TOP_RANK[1], labelEn: "1st place finish", labelUk: "1-ше місце" },
  { key: "rank2", points: SP_TOP_RANK[2], labelEn: "2nd place finish", labelUk: "2-ге місце" },
  { key: "rank3", points: SP_TOP_RANK[3], labelEn: "3rd place finish", labelUk: "3-тє місце" },
  { key: "rank4_10", points: null, labelEn: "4th–10th place (25–100 SP by rank)", labelUk: "4–10 місце (25–100 SP залежно від місця)" },
  { key: "streak2", points: SP_STREAK_TIERS[2].bonus, labelEn: "2-event streak (per event)", labelUk: "Стрік 2 події (за кожну)" },
  { key: "streak3", points: SP_STREAK_TIERS[1].bonus, labelEn: "3-event streak (per event)", labelUk: "Стрік 3 події (за кожну)" },
  { key: "streak4", points: SP_STREAK_CAP, labelEn: "4+ event streak — flat cap (per event)", labelUk: "Стрік 4+ події — стеля (за кожну)" },
  { key: "claim", points: SP_CLAIM_BONUS, labelEn: "Prize claimed (per event)", labelUk: "Клейм призу (за подію)" },
] as const;
