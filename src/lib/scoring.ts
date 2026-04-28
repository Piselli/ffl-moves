/**
 * Fantasy scoring — numbers come only from `scoring-rules.ts` (same as homepage + on-chain Move).
 */

import {
  ASSIST_POINTS,
  CLEAN_SHEET_POINTS,
  DEDUCTIONS,
  FPL_BONUS_MAX,
  GK_SAVE_BATCH,
  GK_SAVE_POINTS_PER_BATCH,
  GOAL_POINTS,
  GOALS_CONCEDED_DIVISOR,
  HAT_TRICK_BONUS,
  MINUTES_POINTS,
  PENALTY_SAVE_POINTS,
  RATING_BONUS_TIERS,
  RATING_SUB_POINTS,
  RATING_SUB_THRESHOLD_TENTHS,
} from "./scoring-rules";

export type ScoringPlayer = { positionId: number };

function num(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function bool(v: unknown): boolean {
  return Boolean(v);
}

/**
 * @param player — positionId: 0 GK, 1 DEF, 2 MID, 3 FWD
 * @param stats — chain view and/or merged FPL fields (bonus, goals_conceded, fpl_clean_sheets)
 */
export function calculateFantasyPoints(player: ScoringPlayer, stats: Record<string, unknown> | null | undefined): number {
  if (!stats) return 0;

  const mins = num(stats.minutes_played ?? stats.minutesPlayed);
  const goals = num(stats.goals);
  const assists = num(stats.assists);
  const saves = num(stats.saves);
  const pensSaved = num(stats.penalties_saved ?? stats.penaltiesSaved);
  const pensMissed = num(stats.penalties_missed ?? stats.penaltiesMissed);
  const ownG = num(stats.own_goals ?? stats.ownGoals);
  const yc = num(stats.yellow_cards ?? stats.yellowCards);
  const rc = num(stats.red_cards ?? stats.redCards);

  const fplCs = num(stats.fpl_clean_sheets ?? stats.fplCleanSheets) > 0;
  const chainCs = bool(stats.clean_sheet ?? stats.cleanSheet);
  const hasCs = chainCs || fplCs;

  const gc = num(stats.goals_conceded ?? stats.goalsConceded);
  const bonus = num(stats.bonus ?? stats.fpl_bonus);

  let pts = 0;

  if (mins >= MINUTES_POINTS.minMinutesFull) pts += MINUTES_POINTS.full;
  else if (mins >= MINUTES_POINTS.minMinutesPartial) pts += MINUTES_POINTS.partial;

  if (goals > 0) {
    const pid = player.positionId;
    const perGoal =
      pid === 0 ? GOAL_POINTS.GK : pid === 1 ? GOAL_POINTS.DEF : pid === 2 ? GOAL_POINTS.MID : GOAL_POINTS.FWD;
    pts += goals * perGoal;
  }

  if (goals >= 3) pts += HAT_TRICK_BONUS;

  pts += assists * ASSIST_POINTS;

  if (mins >= MINUTES_POINTS.minMinutesFull && hasCs) {
    if (player.positionId <= 1) pts += CLEAN_SHEET_POINTS.GK_DEF;
    else if (player.positionId === 2) pts += CLEAN_SHEET_POINTS.MID;
  }

  if (player.positionId === 0) {
    pts += Math.floor(saves / GK_SAVE_BATCH) * GK_SAVE_POINTS_PER_BATCH;
  }

  pts += pensSaved * PENALTY_SAVE_POINTS;

  // Move uses saturating subtraction here (u64 can't go negative), so a GK with very few minutes
  // and many goals conceded clamps to 0 *before* bonus is added. Mirror that exactly so the TS
  // preview never disagrees with what the contract publishes (e.g. mins=1, gc=6, bonus=2 → 2 in
  // Move, but would be 0 if we let `pts` go negative here in JS).
  if (player.positionId <= 1 && gc > 0) {
    const gcPen = Math.floor(gc / GOALS_CONCEDED_DIVISOR);
    pts = pts >= gcPen ? pts - gcPen : 0;
  }

  pts += Math.max(0, Math.min(FPL_BONUS_MAX, Math.floor(bonus)));

  let ded = 0;
  ded += pensMissed * DEDUCTIONS.penaltyMissed;
  ded += ownG * DEDUCTIONS.ownGoal;
  ded += yc * DEDUCTIONS.yellowCard;
  ded += rc * DEDUCTIONS.redCardMultiplier;

  return pts >= ded ? pts - ded : 0;
}

/**
 * Move stores `rating` as tenths (9.0 → 90, 7.5 → 75). JSON may use decimals 0–10.
 */
export function ratingScaledTenths(stats: Record<string, unknown> | null | undefined): number {
  if (!stats) return 0;
  const raw = num(stats.rating ?? stats.ratingScaled);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 20) return Math.round(raw * 10);
  return Math.floor(raw);
}

/** Same thresholds as Move `calculate_player_points` rating_add / rating_sub. */
export function ratingTierAdjustment(stats: Record<string, unknown> | null | undefined): {
  add: number;
  sub: number;
} {
  if (!stats) return { add: 0, sub: 0 };
  const mins = num(stats.minutes_played ?? stats.minutesPlayed);
  const rawRating = num(stats.rating ?? stats.ratingScaled);
  const hasMatchRating = Number.isFinite(rawRating) && rawRating !== 0;
  const r = ratingScaledTenths(stats);
  let add = 0;
  if (hasMatchRating) {
    for (const tier of RATING_BONUS_TIERS) {
      if (r >= tier.minTenths) {
        add = tier.points;
        break;
      }
    }
  }
  const sub =
    hasMatchRating && mins > 0 && r < RATING_SUB_THRESHOLD_TENTHS ? RATING_SUB_POINTS : 0;
  return { add, sub };
}

/** Rules base points + rating tiers (matches Move per-player base+rating before team multipliers). */
export function calculateFantasyPointsWithRating(
  player: ScoringPlayer,
  stats: Record<string, unknown> | null | undefined,
): number {
  const base = calculateFantasyPoints(player, stats);
  const { add, sub } = ratingTierAdjustment(stats);
  return Math.max(0, base + add - sub);
}

/** Merge FPL live aux fields (from /api/fpl-live players[]) into chain-shaped stats. */
export function mergeFplAuxIntoStats(
  chainStats: Record<string, unknown> | null | undefined,
  aux: { bonus?: number; goalsConceded?: number; fplCleanSheets?: number } | undefined,
): Record<string, unknown> {
  const base = { ...(chainStats || {}) };
  if (!aux) return base;
  if (aux.bonus !== undefined) base.bonus = aux.bonus;
  if (aux.goalsConceded !== undefined) base.goals_conceded = aux.goalsConceded;
  if (aux.fplCleanSheets !== undefined) base.fpl_clean_sheets = aux.fplCleanSheets;
  return base;
}

export type FplLivePlayerRow = {
  playerId: number;
  bonus?: number;
  goalsConceded?: number;
  fplCleanSheets?: number;
};

/** Build internal playerId -> aux from /api/fpl-live JSON `players`. */
export function auxMapFromFplLivePlayers(players: FplLivePlayerRow[] | undefined): Map<number, { bonus: number; goalsConceded: number; fplCleanSheets: number }> {
  const m = new Map<number, { bonus: number; goalsConceded: number; fplCleanSheets: number }>();
  if (!players) return m;
  for (const p of players) {
    m.set(p.playerId, {
      bonus: Math.max(0, num(p.bonus)),
      goalsConceded: Math.max(0, num(p.goalsConceded)),
      fplCleanSheets: num(p.fplCleanSheets) > 0 ? 1 : 0,
    });
  }
  return m;
}

/** Merge FPL live `players[]` into a map of chain stats (keys: player id as string or number). */
export function enrichStatsMapWithFplPlayers(
  chainStatsMap: Record<string, unknown>,
  fplPlayers: FplLivePlayerRow[] | undefined,
): Record<string, unknown> {
  const aux = auxMapFromFplLivePlayers(fplPlayers);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(chainStatsMap)) {
    const id = Number(k);
    out[k] = mergeFplAuxIntoStats(v as Record<string, unknown>, aux.get(id));
  }
  return out;
}
