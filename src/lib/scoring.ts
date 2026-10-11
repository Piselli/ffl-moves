/**
 * Fantasy scoring — numbers come only from `scoring-rules.ts` (same as homepage + on-chain Move).
 */

import {
  ASSIST_POINTS,
  CLEAN_SHEET_POINTS,
  DEDUCTIONS,
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
 * @param stats — chain view and/or merged FPL fields (goals_conceded, fpl_clean_sheets).
 *   FPL BPS `bonus` is ignored — MoveMatch does not use it.
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

  // Move uses saturating subtraction here (u64 can't go negative). Mirror that so the TS
  // preview never disagrees with what the contract publishes.
  if (player.positionId <= 1 && gc > 0) {
    const gcPen = Math.floor(gc / GOALS_CONCEDED_DIVISOR);
    pts = pts >= gcPen ? pts - gcPen : 0;
  }

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

export type PointsBreakdownLineKind =
  | "minutes60"
  | "minutesPartial"
  | "goal"
  | "hattrick"
  | "assist"
  | "cleanSheet"
  | "savesBatch"
  | "penSave"
  | "concededGoal"
  | "rating90"
  | "rating80"
  | "rating75"
  | "lowRating"
  | "yellowCard"
  | "redCard"
  | "ownGoal"
  | "penMiss";

export type PointsBreakdownLine = {
  kind: PointsBreakdownLineKind;
  points: number;
  /** Event count when label is shown as “×N” (goals, assists, cards, …). */
  count?: number;
};

/**
 * Per-event lines that sum to `calculateFantasyPointsWithRating` (same rules as `calculateFantasyPoints` + rating).
 */
export function computeFantasyPointsBreakdown(
  player: ScoringPlayer,
  stats: Record<string, unknown> | null | undefined,
): PointsBreakdownLine[] {
  if (!stats) return [];

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

  const lines: PointsBreakdownLine[] = [];

  if (mins >= MINUTES_POINTS.minMinutesFull) {
    lines.push({ kind: "minutes60", points: MINUTES_POINTS.full });
  } else if (mins >= MINUTES_POINTS.minMinutesPartial) {
    lines.push({ kind: "minutesPartial", points: MINUTES_POINTS.partial });
  }

  if (goals > 0) {
    const pid = player.positionId;
    const perGoal =
      pid === 0 ? GOAL_POINTS.GK : pid === 1 ? GOAL_POINTS.DEF : pid === 2 ? GOAL_POINTS.MID : GOAL_POINTS.FWD;
    lines.push({ kind: "goal", points: goals * perGoal, count: goals });
  }

  if (goals >= 3) {
    lines.push({ kind: "hattrick", points: HAT_TRICK_BONUS });
  }

  if (assists > 0) {
    lines.push({ kind: "assist", points: assists * ASSIST_POINTS, count: assists });
  }

  if (mins >= MINUTES_POINTS.minMinutesFull && hasCs) {
    if (player.positionId <= 1) {
      lines.push({ kind: "cleanSheet", points: CLEAN_SHEET_POINTS.GK_DEF });
    } else if (player.positionId === 2) {
      lines.push({ kind: "cleanSheet", points: CLEAN_SHEET_POINTS.MID });
    }
  }

  if (player.positionId === 0) {
    const savePts = Math.floor(saves / GK_SAVE_BATCH) * GK_SAVE_POINTS_PER_BATCH;
    if (savePts > 0) {
      lines.push({
        kind: "savesBatch",
        points: savePts,
        count: Math.floor(saves / GK_SAVE_BATCH),
      });
    }
  }

  if (pensSaved > 0) {
    lines.push({ kind: "penSave", points: pensSaved * PENALTY_SAVE_POINTS, count: pensSaved });
  }

  if (player.positionId <= 1 && gc > 0) {
    const gcPen = Math.floor(gc / GOALS_CONCEDED_DIVISOR);
    if (gcPen > 0) {
      lines.push({ kind: "concededGoal", points: -gcPen, count: gcPen });
    }
  }

  const { add, sub } = ratingTierAdjustment(stats);
  if (add > 0) {
    const r = ratingScaledTenths(stats);
    const kind: PointsBreakdownLineKind = r >= 90 ? "rating90" : r >= 80 ? "rating80" : "rating75";
    lines.push({ kind, points: add });
  }
  if (sub > 0) {
    lines.push({ kind: "lowRating", points: -sub });
  }

  if (pensMissed > 0) {
    lines.push({ kind: "penMiss", points: -pensMissed * DEDUCTIONS.penaltyMissed, count: pensMissed });
  }
  if (ownG > 0) {
    lines.push({ kind: "ownGoal", points: -ownG * DEDUCTIONS.ownGoal, count: ownG });
  }
  if (yc > 0) {
    lines.push({ kind: "yellowCard", points: -yc * DEDUCTIONS.yellowCard, count: yc });
  }
  if (rc > 0) {
    lines.push({ kind: "redCard", points: -rc * DEDUCTIONS.redCardMultiplier, count: rc });
  }

  return lines;
}
