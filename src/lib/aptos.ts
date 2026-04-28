import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { NETWORK, MODULE_ADDRESS, MODULE_NAME, MOVEMENT_RPC_URL } from "./constants";

const config = new AptosConfig({
  network: NETWORK,
  fullnode: MOVEMENT_RPC_URL,
});
export const aptos = new Aptos(config);

// Helper to build module function name
export const moduleFunction = (functionName: string): `${string}::${string}::${string}` => {
  return `${MODULE_ADDRESS}::${MODULE_NAME}::${functionName}` as `${string}::${string}::${string}`;
};

// View function helpers
export async function getConfig() {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_config"),
        typeArguments: [],
        functionArguments: [],
      },
    });
    return {
      admins: result[0] as string[],  // Now returns array of admins
      oracle: result[1] as string,
      entryFee: Number(result[2]),
      titleFee: Number(result[3]),
      guildFee: Number(result[4]),
      prizePoolPercent: Number(result[5]),
      currentGameweek: Number(result[6]),
    };
  } catch (e) {
    console.error("Failed to get config:", e);
    return null;
  }
}

export async function isAdmin(address: string) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("is_admin_address"),
        typeArguments: [],
        functionArguments: [address],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

/** Normalize Move u8 / u64 returned from view (number, bigint, decimal string, 0x hex). */
function viewNum(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("0x") || t.startsWith("0X")) return parseInt(t, 16);
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

export type GameweekSummary = {
  id: number;
  status: "open" | "closed" | "resolved";
  prizePool: number;
  totalEntries: number;
};

export async function getGameweek(gameweekId: number): Promise<GameweekSummary | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_gameweek"),
        typeArguments: [],
        functionArguments: [gameweekId.toString()],
      },
    });
    const st = viewNum(result[1]);
    const status: GameweekSummary["status"] =
      st === 0 ? "open" : st === 1 ? "closed" : "resolved";
    return {
      id: viewNum(result[0]),
      status,
      prizePool: viewNum(result[2]),
      totalEntries: viewNum(result[3]),
    };
  } catch (e) {
    console.error("Failed to get gameweek:", e);
    return null;
  }
}

/**
 * Resolves the gameweek players should use for registration (first OPEN week).
 * Uses `config.current_gameweek` as a hint, then scans forward/backward so we
 * still find an open week if the pointer lags, a view fails once, or `current_gameweek` is 0.
 */
export async function findOpenGameweekFromChain(
  configData: Awaited<ReturnType<typeof getConfig>>,
): Promise<GameweekSummary | null> {
  if (!configData) return null;
  const c = Number(configData.currentGameweek);
  if (!Number.isFinite(c) || c < 0) return null;

  if (c === 0) {
    for (let i = 1; i <= 80; i++) {
      const g = await getGameweek(i);
      if (g?.status === "open") return g;
    }
    return null;
  }

  for (let i = c; i <= c + 60; i++) {
    const g = await getGameweek(i);
    if (g?.status === "open") return g;
  }
  for (let i = c - 1; i >= 1; i--) {
    const g = await getGameweek(i);
    if (g?.status === "open") return g;
  }
  return null;
}

/**
 * Highest gameweek id that exists on-chain.
 *
 * Important: do **not** stop at the first missing id — `Table` ids may be non-contiguous
 * (e.g. GW 34 exists while GW 33 was never stored), and a single RPC failure would also
 * truncate the range incorrectly.
 */
export async function findHighestGameweekIdOnChain(
  configData: Awaited<ReturnType<typeof getConfig>>,
): Promise<number> {
  if (!configData) return 0;
  const hint = Number(configData.currentGameweek);
  const maxScan =
    Number.isFinite(hint) && hint >= 1 ? Math.min(Math.max(hint + 80, 120), 200) : 120;
  let maxId = 0;
  for (let id = 1; id <= maxScan; id++) {
    const g = await getGameweek(id);
    if (g) maxId = id;
  }
  return maxId;
}

/** Latest resolved GW at or below `highestId` — best default for the leaderboard after publishing results. */
export async function findLatestResolvedGameweekId(highestId: number): Promise<number> {
  if (highestId < 1) return 0;
  for (let id = highestId; id >= 1; id--) {
    const g = await getGameweek(id);
    if (g?.status === "resolved") return id;
  }
  return 0;
}

export async function getUserTitle(owner: string) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_user_title"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return {
      titleType: Number(result[0]),
      multiplier: Number(result[1]),
      season: Number(result[2]),
    };
  } catch (e) {
    return null;
  }
}

export async function getUserGuild(owner: string) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_user_guild"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return {
      multiplier: Number(result[0]),
      season: Number(result[1]),
    };
  } catch (e) {
    return null;
  }
}

export async function hasTitle(owner: string): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("has_title"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function hasGuild(owner: string): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("has_guild"),
        typeArguments: [],
        functionArguments: [owner],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function hasRegisteredTeam(owner: string, gameweekId: number): Promise<boolean> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("has_registered_team"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    return result[0] as boolean;
  } catch (e) {
    return false;
  }
}

export async function getTeamResult(owner: string, gameweekId: number) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_team_result"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    const ratingBonus = Number(result[1]);
    const ratingBonusNegative = result[2] as boolean;
    return {
      owner,
      basePoints: Number(result[0]),
      ratingBonus: ratingBonusNegative ? -ratingBonus : ratingBonus,
      titleTriggered: result[3] as boolean,
      titleMultiplier: Number(result[4]),
      guildTriggered: result[5] as boolean,
      guildMultiplier: Number(result[6]),
      finalPoints: Number(result[7]),
      rank: Number(result[8]),
      prizeAmount: Number(result[9]),
      claimed: result[10] as boolean,
    };
  } catch (e) {
    return null;
  }
}

/** Normalize Move `vector<u8>` from view (array or Uint8Array). */
function viewU8Vector(raw: unknown): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => viewNum(x));
  if (raw instanceof Uint8Array) return Array.from(raw);
  return [];
}

export async function getUserTeam(
  owner: string,
  gameweekId: number,
): Promise<{ playerIds: number[]; playerPositions: number[] } | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_user_team"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    const rawIds = result[0] as unknown[];
    const posArr = viewU8Vector(result[1]);
    // Must stay index-aligned with on-chain vectors (14 slots: 11 + bench). Filtering
    // ids dropped entries and paired wrong positions — squads looked short/wrong.
    const n = rawIds.length;
    const playerIds: number[] = new Array(n);
    const playerPositions: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const id = viewNum(rawIds[i]);
      playerIds[i] = Number.isFinite(id) ? id : 0;
      const v = posArr[i];
      playerPositions[i] = Number.isFinite(v) && v >= 0 && v <= 3 ? v : 2;
    }
    return { playerIds, playerPositions };
  } catch (e) {
    console.error("getUserTeam error:", e);
    return null;
  }
}

export async function getGameweekTeams(gameweekId: number): Promise<string[]> {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_gameweek_teams"),
        typeArguments: [],
        functionArguments: [gameweekId.toString()],
      },
    });
    return (result[0] as string[]).map(addr => addr.toString());
  } catch (e) {
    console.error("Failed to get gameweek teams:", e);
    return [];
  }
}

export async function getPlayerStats(gameweekId: number, playerId: number) {
  try {
    const result = await aptos.view({
      payload: {
        function: moduleFunction("get_player_stats"),
        typeArguments: [],
        functionArguments: [gameweekId.toString(), playerId.toString()],
      },
    });
    return {
      position: Number(result[0]),
      minutes_played: Number(result[1]),
      goals: Number(result[2]),
      assists: Number(result[3]),
      clean_sheet: result[4] as boolean,
      saves: Number(result[5]),
      penalties_saved: Number(result[6]),
      penalties_missed: Number(result[7]),
      own_goals: Number(result[8]),
      yellow_cards: Number(result[9]),
      red_cards: Number(result[10]),
      rating: Number(result[11]),
      tackles: Number(result[12]),
      interceptions: Number(result[13]),
      successful_dribbles: Number(result[14]),
      free_kick_goals: Number(result[15]),
      goals_conceded: Number(result[16]),
      bonus: Number(result[17]),
      fpl_clean_sheets: (result[18] as boolean) ? 1 : 0,
    };
  } catch {
    return null;
  }
}

export async function getGameweekStats(gameweekId: number, playerIds: number[]): Promise<Record<number, any>> {
  const results = await Promise.allSettled(
    playerIds.map((id) => getPlayerStats(gameweekId, id))
  );
  const stats: Record<number, any> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      stats[playerIds[i]] = r.value;
    }
  });
  return stats;
}
