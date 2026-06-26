import {
  getConfig,
  getGameweek,
  getGameweekTeams,
  getTeamResult,
  findHighestGameweekIdOnChain,
  findLatestResolvedGameweekId,
} from "@/lib/movement";
import {
  CURRENT_SEASON,
  SEASON_POINTS_RULES_VERSION,
  computeSeasonPointsFromSlices,
  getSeasonPointsStatus,
  isSeasonPointsActive,
  seasonEplCap,
  type SeasonPointsStatus,
  type SeasonPointsTotals,
} from "@/lib/season-points-rules";

export type SeasonLeaderboardEntry = {
  owner: string;
  rank: number;
  totalPoints: number;
  registrations: number;
  top10Finishes: number;
  bestRank: number;
  maxStreak: number;
  currentStreak: number;
  breakdown: SeasonPointsTotals["slices"];
};

export type SeasonLeaderboardPayload = {
  seasonId: number;
  seasonLabel: string;
  rulesVersion: number;
  active: boolean;
  status: SeasonPointsStatus;
  /** Unified timeline: WC tours (in order) then EPL GWs. */
  eventIds: number[];
  wcTourIds: readonly number[];
  resolvedWcTourCount: number;
  eplStartGw: number;
  eplEndGw: number;
  resolvedEplThroughGw: number;
  /** @deprecated use eplStartGw */
  startGw: number;
  /** @deprecated use eplEndGw */
  endGw: number;
  /** @deprecated use resolvedEplThroughGw */
  resolvedThroughGw: number;
  generatedAt: string;
  entries: SeasonLeaderboardEntry[];
};

function emptyPayload(
  partial: Pick<
    SeasonLeaderboardPayload,
    "eplStartGw" | "eplEndGw" | "resolvedEplThroughGw" | "status" | "eventIds" | "resolvedWcTourCount"
  >,
): SeasonLeaderboardPayload {
  return {
    seasonId: CURRENT_SEASON.id,
    seasonLabel: CURRENT_SEASON.label,
    rulesVersion: SEASON_POINTS_RULES_VERSION,
    active: isSeasonPointsActive(),
    status: partial.status,
    eventIds: partial.eventIds,
    wcTourIds: CURRENT_SEASON.wcTourIds,
    resolvedWcTourCount: partial.resolvedWcTourCount,
    eplStartGw: partial.eplStartGw,
    eplEndGw: partial.eplEndGw,
    resolvedEplThroughGw: partial.resolvedEplThroughGw,
    startGw: partial.eplStartGw,
    endGw: partial.eplEndGw,
    resolvedThroughGw: partial.resolvedEplThroughGw,
    generatedAt: new Date().toISOString(),
    entries: [],
  };
}

async function mapInBatches<T, R>(
  ids: T[],
  concurrency: number,
  fn: (id: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(ids.length);
  for (let start = 0; start < ids.length; start += concurrency) {
    const slice = ids.slice(start, start + concurrency);
    const results = await Promise.all(slice.map((id) => fn(id)));
    for (let i = 0; i < results.length; i++) out[start + i] = results[i];
  }
  return out;
}

/**
 * Resolved season events in timeline order: WC tours first, then EPL gameweeks.
 * Skipped resolved events stay in the list so streaks break correctly.
 */
export async function getSeasonEventIds(): Promise<{
  eplStartGw: number;
  eplEndGw: number;
  resolvedEplThroughGw: number;
  resolvedWcTourCount: number;
  status: SeasonPointsStatus;
  eventIds: number[];
}> {
  const eplStartGw = CURRENT_SEASON.eplStartGw;
  const eplEndGw = CURRENT_SEASON.eplEndGw;

  if (!isSeasonPointsActive()) {
    return {
      eplStartGw: 0,
      eplEndGw,
      resolvedEplThroughGw: 0,
      resolvedWcTourCount: 0,
      status: "inactive",
      eventIds: [],
    };
  }

  const wcResolved: number[] = [];
  for (const tourId of CURRENT_SEASON.wcTourIds) {
    const g = await getGameweek(tourId);
    if (g?.status === "resolved") wcResolved.push(tourId);
  }

  let eplResolved: number[] = [];
  let resolvedEplThroughGw = 0;

  if (eplStartGw > 0) {
    const config = await getConfig();
    if (config) {
      const highest = await findHighestGameweekIdOnChain(config);
      const cap = seasonEplCap(highest);
      const latestResolved = await findLatestResolvedGameweekId(cap);
      resolvedEplThroughGw =
        eplEndGw > 0 ? Math.min(latestResolved, eplEndGw) : latestResolved;

      if (resolvedEplThroughGw >= eplStartGw) {
        for (let gw = eplStartGw; gw <= resolvedEplThroughGw; gw++) {
          const g = await getGameweek(gw);
          if (g?.status === "resolved") eplResolved.push(gw);
        }
      }
    }
  }

  const eventIds = [...wcResolved, ...eplResolved];
  const status = getSeasonPointsStatus(resolvedEplThroughGw);

  return {
    eplStartGw,
    eplEndGw,
    resolvedEplThroughGw,
    resolvedWcTourCount: wcResolved.length,
    status,
    eventIds,
  };
}

/** @deprecated use getSeasonEventIds */
export const getSeasonGameweekIds = getSeasonEventIds;

type OwnerGwData = {
  registered: boolean;
  rank: number;
  claimed: boolean;
};

async function loadOwnerDataForEvents(
  owner: string,
  eventIds: number[],
): Promise<OwnerGwData[]> {
  return mapInBatches(eventIds, 8, async (eventId) => {
    const result = await getTeamResult(owner, eventId);
    if (!result) return { registered: false, rank: 0, claimed: false };
    return {
      registered: true,
      rank: result.rank,
      claimed: result.claimed,
    };
  });
}

/** Build the full season leaderboard from on-chain data. */
export async function buildSeasonLeaderboard(): Promise<SeasonLeaderboardPayload> {
  const {
    eplStartGw,
    eplEndGw,
    resolvedEplThroughGw,
    resolvedWcTourCount,
    status,
    eventIds,
  } = await getSeasonEventIds();

  if (!isSeasonPointsActive()) {
    return emptyPayload({
      eplStartGw: 0,
      eplEndGw,
      resolvedEplThroughGw: 0,
      resolvedWcTourCount: 0,
      status: "inactive",
      eventIds: [],
    });
  }

  if (eventIds.length === 0) {
    return emptyPayload({
      eplStartGw,
      eplEndGw,
      resolvedEplThroughGw,
      resolvedWcTourCount,
      status,
      eventIds: [],
    });
  }

  const ownerCanonical = new Map<string, string>();
  const teamsByEvent = await mapInBatches(eventIds, 4, async (eventId) => {
    const teams = await getGameweekTeams(eventId);
    for (const addr of teams) {
      const key = addr.toLowerCase();
      if (!ownerCanonical.has(key)) ownerCanonical.set(key, addr);
    }
    return { eventId, teams };
  });

  const owners = Array.from(ownerCanonical.values());

  const entries: SeasonLeaderboardEntry[] = await mapInBatches(owners, 6, async (owner) => {
    const eventData = await loadOwnerDataForEvents(owner, eventIds);
    const slices = eventIds.map((eventId, i) => ({
      gameweekId: eventId,
      registered: eventData[i].registered,
      rank: eventData[i].rank,
      claimed: eventData[i].claimed,
    }));
    const totals = computeSeasonPointsFromSlices(slices);
    return {
      owner,
      rank: 0,
      totalPoints: totals.totalPoints,
      registrations: totals.registrations,
      top10Finishes: totals.top10Finishes,
      bestRank: totals.bestRank,
      maxStreak: totals.maxStreak,
      currentStreak: totals.currentStreak,
      breakdown: totals.slices,
    };
  });

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.top10Finishes !== a.top10Finishes) return b.top10Finishes - a.top10Finishes;
    if (a.bestRank !== b.bestRank) {
      if (a.bestRank === 0) return 1;
      if (b.bestRank === 0) return -1;
      return a.bestRank - b.bestRank;
    }
    return a.owner.localeCompare(b.owner);
  });

  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  void teamsByEvent;

  return {
    seasonId: CURRENT_SEASON.id,
    seasonLabel: CURRENT_SEASON.label,
    rulesVersion: SEASON_POINTS_RULES_VERSION,
    active: true,
    status,
    eventIds,
    wcTourIds: CURRENT_SEASON.wcTourIds,
    resolvedWcTourCount,
    eplStartGw,
    eplEndGw,
    resolvedEplThroughGw,
    startGw: eplStartGw,
    endGw: eplEndGw,
    resolvedThroughGw: resolvedEplThroughGw,
    generatedAt: new Date().toISOString(),
    entries,
  };
}

export async function getSeasonPointsForOwner(owner: string): Promise<SeasonLeaderboardEntry | null> {
  const board = await buildSeasonLeaderboard();
  const norm = owner.toLowerCase();
  return board.entries.find((e) => e.owner.toLowerCase() === norm) ?? null;
}
