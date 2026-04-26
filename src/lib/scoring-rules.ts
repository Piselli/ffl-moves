/**
 * Single source of truth for fantasy scoring numbers (homepage #scoring + `calculateFantasyPoints`).
 * Move contract `fantasy_epl::calculate_player_points` must stay numerically in sync — see comment there.
 */

export const SCORING_RULES_VERSION = 1;

/** Minutes: 1–59 min → +partial; 60+ → +full (matches “вихід 1–59 / 60+” on site). */
export const MINUTES_POINTS = { partial: 1, full: 2, minMinutesPartial: 1, minMinutesFull: 60 } as const;

export const GOAL_POINTS = { GK: 10, DEF: 6, MID: 5, FWD: 5 } as const;

export const HAT_TRICK_BONUS = 3;
export const ASSIST_POINTS = 3;

/** Clean sheet (60+ min): GK/DEF +4, MID +1, FWD 0 */
export const CLEAN_SHEET_POINTS = { GK_DEF: 4, MID: 1 } as const;

/** GK: +1 per every `batch` saves */
export const GK_SAVE_BATCH = 3;
export const GK_SAVE_POINTS_PER_BATCH = 1;

export const PENALTY_SAVE_POINTS = 5;

/** GK/DEF: −1 per block of `divisor` goals conceded */
export const GOALS_CONCEDED_DIVISOR = 2;

export const FPL_BONUS_MAX = 3;

export const DEDUCTIONS = {
  yellowCard: 1,
  redCardMultiplier: 3,
  ownGoal: 2,
  penaltyMissed: 2,
} as const;

/** Rating scaled in tenths (e.g. 75 = 7.5): bonus tiers — same as Move */
export const RATING_BONUS_TIERS = [
  { minTenths: 90, points: 3 },
  { minTenths: 80, points: 2 },
  { minTenths: 75, points: 1 },
] as const;

/** Below this (tenths), with minutes played → −1 (same as Move) */
export const RATING_SUB_THRESHOLD_TENTHS = 60;
export const RATING_SUB_POINTS = 1;
