/**
 * Fantasy scoring aligned with public rules (site / rules screen).
 * Stats may come from chain (snake_case) merged with FPL live aux (bonus, goals_conceded, fpl_clean_sheets).
 */

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

  // Minutes: 1–59 +1, 60+ +2 (same as old +1 appearance +1 sixty)
  if (mins >= 60) pts += 2;
  else if (mins >= 1) pts += 1;

  // Goals by position (rules screen)
  if (goals > 0) {
    const pid = player.positionId;
    const perGoal = pid === 0 ? 10 : pid === 1 ? 6 : 5; // MID & FWD +5 per goal
    pts += goals * perGoal;
  }

  // Hat-trick bonus (once per player per GW)
  if (goals >= 3) pts += 3;

  pts += assists * 3;

  // Clean sheets: GK/DEF +4, MID +1 (60+); FWD no CS points in rules
  if (mins >= 60 && hasCs) {
    if (player.positionId <= 1) pts += 4;
    else if (player.positionId === 2) pts += 1;
  }

  if (player.positionId === 0) {
    pts += Math.floor(saves / 3);
  }

  pts += pensSaved * 5;

  // Conceded: -1 per 2 goals (GK/DEF only)
  if (player.positionId <= 1 && gc > 0) {
    pts -= Math.floor(gc / 2);
  }

  // FPL match bonus (BPS tiers) 0–3
  pts += Math.max(0, Math.min(3, Math.floor(bonus)));

  let ded = 0;
  ded += pensMissed * 2;
  ded += ownG * 2;
  ded += yc;
  ded += rc * 3;

  return Math.max(0, pts - ded);
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
  const r = ratingScaledTenths(stats);
  let add = 0;
  if (r >= 90) add = 3;
  else if (r >= 80) add = 2;
  else if (r >= 75) add = 1;
  const sub = mins > 0 && r < 60 ? 1 : 0;
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
