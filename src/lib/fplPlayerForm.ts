/**
 * Last-N FPL gameweek appearance strip for squad pick.
 * start = from XI · sub = came off the bench · out = 0 minutes.
 */

export type PlayerFormStatus = "start" | "sub" | "out";

export type PlayerFormPayload = {
  /** Finished FPL events, oldest → newest (left → right in the UI). */
  gameweeks: number[];
  /** FPL element id → status per gameweek (same order as `gameweeks`). */
  byPlayer: Record<string, PlayerFormStatus[]>;
};

export const PLAYER_FORM_LEN = 5;

export function statusFromLiveStats(stats: {
  minutes?: number;
  starts?: number;
} | null | undefined): PlayerFormStatus {
  const mins = Number(stats?.minutes ?? 0) || 0;
  if (mins <= 0) return "out";
  const starts = Number(stats?.starts ?? 0) || 0;
  return starts > 0 ? "start" : "sub";
}
