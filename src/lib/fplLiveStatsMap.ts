import type { Player } from "@/lib/types";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";

/** One row from GET /api/fpl-live `players`. */
export type FplLiveMappedPlayer = {
  playerId: number;
  position?: number;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  cleanSheet?: boolean;
  saves?: number;
  penaltiesSaved?: number;
  penaltiesMissed?: number;
  ownGoals?: number;
  yellowCards?: number;
  redCards?: number;
  rating?: number;
  bonus?: number;
  goalsConceded?: number;
  fplCleanSheets?: number;
  tackles?: number;
  interceptions?: number;
  successfulDribbles?: number;
  freeKickGoals?: number;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Admin commit shape — same keys `computeChainAlignedXiBreakdown` reads. */
export function fplLivePlayersToStatsMap(
  players: FplLiveMappedPlayer[] | undefined,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  if (!players) return out;
  for (const p of players) {
    const id = n(p.playerId);
    if (id < 1) continue;
    out[String(id)] = {
      position: n(p.position),
      minutes_played: n(p.minutesPlayed),
      goals: n(p.goals),
      assists: n(p.assists),
      clean_sheet: Boolean(p.cleanSheet),
      saves: n(p.saves),
      penalties_saved: n(p.penaltiesSaved),
      penalties_missed: n(p.penaltiesMissed),
      own_goals: n(p.ownGoals),
      yellow_cards: n(p.yellowCards),
      red_cards: n(p.redCards),
      rating: n(p.rating),
      tackles: n(p.tackles),
      interceptions: n(p.interceptions),
      successful_dribbles: n(p.successfulDribbles),
      free_kick_goals: n(p.freeKickGoals),
      goals_conceded: n(p.goalsConceded),
      bonus: Math.max(0, Math.min(3, n(p.bonus))),
      fpl_clean_sheets: n(p.fplCleanSheets) > 0 ? 1 : 0,
    };
  }
  return out;
}

/** Draft vs a stats map. Empty slots skipped. No captain → no double (`-1`). */
export function scoreDraftAgainstGw(
  starters: (Player | null)[],
  bench: (Player | null)[],
  stats: Record<string, Record<string, unknown>>,
  captainIndex: number | null,
): number {
  const xi = starters.slice(0, 11);
  while (xi.length < 11) xi.push(null);
  const b = bench.filter((p): p is Player => p != null);
  return computeChainAlignedXiBreakdown(
    xi as Player[],
    b,
    stats,
    captainIndex ?? -1,
  ).preMultiplier;
}

/** Fallback when FPL live has no finished fixtures — uses catalog `form` as fake GW pts. */
export function sampleDraftScore(
  starters: (Player | null)[],
  captainIndex: number | null,
): number {
  let total = 0;
  starters.forEach((p, i) => {
    if (!p) return;
    const pts = Math.max(0, Math.round(Number(p.form) || 0));
    total += pts;
    if (captainIndex === i) total += pts;
  });
  return total;
}
