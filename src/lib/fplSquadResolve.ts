import type { Player } from "./types";
import { TEAM_NOT_IN_SITE_CATALOG } from "@/lib/catalog-placeholders";

const POS: readonly ("GK" | "DEF" | "MID" | "FWD")[] = ["GK", "DEF", "MID", "FWD"];

export function positionFromChainU8(u: number): "GK" | "DEF" | "MID" | "FWD" {
  if (u >= 0 && u <= 3) return POS[u];
  return "MID";
}

/** When FPL bootstrap omits a player (not can_select / loaned), still show the on-chain id + position. */
export function placeholderPlayerFromChain(id: number, positionId: number): Player {
  const position = positionFromChainU8(positionId);
  return {
    id,
    fplId: id,
    name: `FPL #${id}`,
    webName: `Player #${id}`,
    team: TEAM_NOT_IN_SITE_CATALOG,
    teamId: 0,
    position,
    positionId: Math.max(0, Math.min(3, positionId)),
  };
}

export type ChainSquad = { playerIds: number[]; playerPositions: number[] };

/** One entry per chain slot, same order as `register_team` (11 + bench). */
export function squadPlayersFromChain(
  chain: ChainSquad,
  catalogById: Map<number, Player>,
): Player[] {
  const { playerIds, playerPositions } = chain;
  return playerIds.map((id, i) => {
    const fromApi = catalogById.get(id);
    if (fromApi) return fromApi;
    const posId = Number.isFinite(playerPositions[i]) ? playerPositions[i]! : 2;
    return placeholderPlayerFromChain(id, posId);
  });
}
