/**
 * Ensures every player id that appears in any registered squad for a gameweek
 * has an oracle row (at least 0 minutes). Missing keys on-chain skip auto-sub;
 * a 0-minute row triggers `find_substitute` per `fantasy_epl::calculate_team_points`.
 */

export type OracleStatJson = Record<string, unknown>;

/** Same shape as FPL/API fetch → admin `submit_player_stats` JSON. */
export function emptyOracleStatRow(playerId: number, position: number): OracleStatJson {
  return {
    playerId,
    position,
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    cleanSheet: false,
    saves: 0,
    penaltiesSaved: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 0,
    tackles: 0,
    interceptions: 0,
    successfulDribbles: 0,
    freeKickGoals: 0,
    goalsConceded: 0,
    bonus: 0,
    fplCleanSheets: 0,
  };
}

/**
 * @param players — rows from FPL/API (or pasted JSON)
 * @param idToPosition — player id → on-chain squad position (0–3), e.g. from `getRegisteredSquadCoverage`
 */
export function mergePlayersWithRegisteredCoverage(
  players: OracleStatJson[],
  idToPosition: Map<number, number>,
): { merged: OracleStatJson[]; addedIds: number[] } {
  const byId = new Map<number, OracleStatJson>();

  for (const raw of players) {
    const id = Number(raw.playerId);
    if (!Number.isFinite(id) || id < 1) continue;
    const pos = Number(raw.position);
    const position =
      Number.isFinite(pos) && pos >= 0 && pos <= 3 ? pos : (idToPosition.get(id) ?? 2);
    byId.set(id, { ...raw, playerId: id, position });
  }

  const addedIds: number[] = [];
  idToPosition.forEach((pos: number, id: number) => {
    if (id < 1 || byId.has(id)) return;
    byId.set(id, emptyOracleStatRow(id, pos));
    addedIds.push(id);
  });

  const merged = Array.from(byId.values()).sort((a, b) => Number(a.playerId) - Number(b.playerId));
  return { merged, addedIds };
}
