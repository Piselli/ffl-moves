/**
 * API-Sports Football Data Integration
 * Fetches real match stats for oracle submission (EPL + World Cup).
 */

import {
  WC_LEAGUE_ID,
  WC_SEASON,
  WC_GOALS_CONCEDED_FROM_TOUR_ID,
  getWorldCupRound,
} from "./worldcup";

const API_BASE_URL = "https://v3.football.api-sports.io";
const EPL_LEAGUE_ID = 39;
const SEASON = 2026; // 2026/2027 EPL season

/**
 * Competition descriptor — lets one fetcher serve both EPL (FPL-id catalog) and the
 * World Cup (API-Sports-id catalog). `rounds` are the API-Sports `round` strings to pull.
 */
interface CompetitionStatsConfig {
  leagueId: number;
  season: number;
  /** Public JSON catalog with an `apiId` -> internal `id` mapping. */
  mappingsUrl: string;
  /** API-Sports round names that make up this tour. */
  rounds: string[];
  /** Tour / gameweek id reported back in the result. */
  resultGameweekId: number;
  /** When true, populate goalsConceded for GK/DEF from API-Sports / fixture score. */
  includeGoalsConceded?: boolean;
}

// Player apiId -> internal mapping, cached per catalog url.
const playerMappingsByUrl = new Map<string, Map<number, { id: number; position: string }>>();

interface ApiFixture {
  fixture: { id: number; status: { short: string } };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number; away: number };
}

interface ApiPlayerStats {
  player: { id: number; name: string };
  statistics: Array<{
    games: { minutes: number | null; position: string; rating: string | null };
    goals: { total: number | null; assists: number | null; saves: number | null; conceded?: number | null };
    penalty: { saved: number | null; missed: number | null };
    cards: { yellow: number | null; red: number | null };
    tackles: { total: number | null; interceptions: number | null };
    dribbles: { success: number | null };
  }>;
}

export interface OraclePlayerStats {
  playerId: number;
  position: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  /** GK/DEF on-chain clean_sheet flag (60+ min, team did not concede). */
  cleanSheet: boolean;
  /**
   * MID clean sheet — stored as `fpl_clean_sheet` on chain (same as FPL `clean_sheets` for midfielders).
   * EPL oracle leaves this 0 for GK/DEF (they use `cleanSheet`); WC/API-Sports sets it for MID only.
   */
  fplCleanSheets?: number;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  tackles: number;
  interceptions: number;
  successfulDribbles: number;
  freeKickGoals: number;
  /** GK/DEF: goals conceded while on pitch (FPL-style −1 per 2). */
  goalsConceded?: number;
}

export interface GameweekStatsResult {
  gameweekId: number;
  players: OraclePlayerStats[];
  fixtures: string[];
  errors: string[];
}

/**
 * API-Sports player id → on-chain / squad catalog id (+ position).
 * EPL squads use FPL element ids; `/api/players` exposes those as `id` with `apiId`.
 */
async function loadPlayerMappings(
  url = "/api/players",
): Promise<Map<number, { id: number; position: string }>> {
  const cached = playerMappingsByUrl.get(url);
  if (cached) return cached;

  const mappings = new Map<number, { id: number; position: string }>();
  try {
    const response = await fetch(url, { cache: "no-store" });
    const players = await response.json();

    if (Array.isArray(players)) {
      for (const player of players) {
        const apiId = Number(player?.apiId);
        const id = Number(player?.id ?? player?.fplId);
        if (!Number.isFinite(apiId) || apiId <= 0) continue;
        if (!Number.isFinite(id) || id <= 0) continue;
        const position = String(player?.position || "MID");
        mappings.set(apiId, { id, position });
      }
    }
  } catch (error) {
    console.error("Failed to load player mappings:", error);
  }

  playerMappingsByUrl.set(url, mappings);
  return mappings;
}

function mapApiPosition(pos: string): number {
  if (pos === "G") return 0;
  if (pos === "D") return 1;
  if (pos === "M") return 2;
  if (pos === "F") return 3;
  return 2;
}

/** API-Sports short statuses where fixture + player stats are final (incl. knockout shootouts). */
function isCompletedFixtureStatus(status: string): boolean {
  return status === "FT" || status === "AET" || status === "PEN";
}

/** GK/DEF goals conceded for knockout tours (fixture score is RT+ET, excludes shootout). */
function resolveGoalsConceded(
  positionId: number,
  minutesPlayed: number,
  apiConceded: number | null | undefined,
  teamGoalsAgainst: number,
  includeGoalsConceded: boolean,
): number {
  if (!includeGoalsConceded || positionId > 1 || minutesPlayed <= 0) return 0;

  const teamGc = Math.max(0, teamGoalsAgainst);
  const apiGc =
    apiConceded != null && Number.isFinite(apiConceded) && apiConceded > 0
      ? Math.floor(apiConceded)
      : 0;

  // GK: API-Sports reliably reports goals.conceded for the full match.
  if (positionId === 0) {
    if (apiConceded != null && Number.isFinite(apiConceded) && apiConceded >= 0) {
      return Math.floor(apiConceded);
    }
    return teamGc;
  }

  // DEF: API often leaves goals.conceded at 0 for outfield players. Team goals against
  // (RT+ET) applies for 60+ min; shorter subs only get a positive API value.
  if (minutesPlayed >= 60) return apiGc > 0 ? apiGc : teamGc;
  return apiGc;
}

/**
 * Generic API-Sports stats fetcher. Pulls every completed fixture across `cfg.rounds`,
 * then per-player stats per fixture, mapping API-Sports ids to internal ids via the
 * competition catalog. Works for any league/season (EPL regular season, World Cup, ...).
 */
async function fetchStatsForCompetition(
  apiKey: string,
  cfg: CompetitionStatsConfig,
): Promise<GameweekStatsResult> {
  const result: GameweekStatsResult = {
    gameweekId: cfg.resultGameweekId,
    players: [],
    fixtures: [],
    errors: [],
  };

  if (!apiKey) {
    result.errors.push("API key is required");
    return result;
  }

  const headers = { "x-apisports-key": apiKey };
  const mappings = await loadPlayerMappings(cfg.mappingsUrl);
  if (mappings.size === 0) {
    result.errors.push(
      `No API-Sports→catalog mappings loaded from ${cfg.mappingsUrl}. Cannot attach stats to squads.`,
    );
    return result;
  }
  let unmappedWithMinutes = 0;

  try {
    // 1. Collect completed fixtures across every round in this tour.
    const completedFixtures: ApiFixture[] = [];
    for (const round of cfg.rounds) {
      const fixturesUrl = `${API_BASE_URL}/fixtures?league=${cfg.leagueId}&season=${cfg.season}&round=${encodeURIComponent(round)}`;
      const fixturesRes = await fetch(fixturesUrl, { headers });

      if (fixturesRes.status === 429) {
        result.errors.push("API rate limit exceeded. Free tier allows 100 requests/day. Try again tomorrow.");
        return result;
      }
      if (!fixturesRes.ok) {
        result.errors.push(`API request failed for round "${round}": ${fixturesRes.status} ${fixturesRes.statusText}`);
        continue;
      }

      const fixturesData = await fixturesRes.json();
      if (fixturesData.errors && Object.keys(fixturesData.errors).length > 0) {
        const errorMessages = Object.entries(fixturesData.errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ");
        if (errorMessages.toLowerCase().includes("rate") || errorMessages.toLowerCase().includes("limit")) {
          result.errors.push(`Rate limit exceeded: ${errorMessages}. Free tier allows 100 requests/day.`);
          return result;
        }
        result.errors.push(`API Error (round "${round}"): ${errorMessages}`);
        continue;
      }

      const fixtures: ApiFixture[] = fixturesData.response || [];
      for (const f of fixtures) {
        if (isCompletedFixtureStatus(f.fixture.status.short)) {
          completedFixtures.push(f);
        }
      }
      // Be gentle with the rate limit between round queries.
      if (cfg.rounds.length > 1) await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (completedFixtures.length === 0) {
      result.errors.push(`No completed fixtures found for tour ${cfg.resultGameweekId}`);
      return result;
    }

    // Track clean sheets across all fixtures in the tour.
    const cleanSheetTeams = new Set<number>();
    for (const fixture of completedFixtures) {
      result.fixtures.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
      if (fixture.goals.home === 0) cleanSheetTeams.add(fixture.teams.away.id);
      if (fixture.goals.away === 0) cleanSheetTeams.add(fixture.teams.home.id);
    }

    // 2. Per-player stats per fixture.
    // Minutes: API-Sports `games.minutes` only. The feed does not publish per-half added time
    // after the match; reconstructing stoppage from events is incomplete — edit JSON manually
    // in admin when a knockout score needs correction before oracle submit.
    for (const fixture of completedFixtures) {
      try {
        const statsUrl = `${API_BASE_URL}/fixtures/players?fixture=${fixture.fixture.id}`;
        const statsRes = await fetch(statsUrl, { headers });
        const statsData = await statsRes.json();

        if (!statsData.response) continue;

        for (const teamData of statsData.response) {
          const teamId = teamData.team.id;
          const hadCleanSheet = cleanSheetTeams.has(teamId);
          const isHome = teamId === fixture.teams.home.id;
          const teamGoalsAgainst = isHome
            ? (fixture.goals.away ?? 0)
            : (fixture.goals.home ?? 0);

          for (const playerData of teamData.players as ApiPlayerStats[]) {
            const stats = playerData.statistics[0];
            if (!stats) continue;

            const mapping = mappings.get(playerData.player.id);
            const minsRaw = stats.games.minutes ?? 0;
            if (!mapping) {
              if (minsRaw > 0) unmappedWithMinutes += 1;
              continue;
            }

            const positionId =
              mapping.position === "GK" ? 0 :
              mapping.position === "DEF" ? 1 :
              mapping.position === "MID" ? 2 : 3;

            const mins = minsRaw;
            const teamCsEligible = hadCleanSheet && mins >= 60;

            const cleanSheet = teamCsEligible && (positionId === 0 || positionId === 1);
            const fplCleanSheets = teamCsEligible && positionId === 2 ? 1 : 0;

            result.players.push({
              playerId: mapping.id,
              position: positionId,
              minutesPlayed: mins,
              goals: stats.goals?.total || 0,
              assists: stats.goals?.assists || 0,
              cleanSheet,
              fplCleanSheets,
              saves: stats.goals?.saves || 0,
              penaltiesSaved: stats.penalty?.saved || 0,
              penaltiesMissed: stats.penalty?.missed || 0,
              ownGoals: 0,
              yellowCards: stats.cards?.yellow || 0,
              redCards: stats.cards?.red || 0,
              // 0 minutes → rating 0 so contract treats as no rating tier (matches FPL live path).
              rating: mins > 0 ? Math.round(parseFloat(stats.games.rating || "6.0") * 10) : 0,
              tackles: stats.tackles?.total || 0,
              interceptions: stats.tackles?.interceptions || 0,
              successfulDribbles: stats.dribbles?.success || 0,
              freeKickGoals: 0,
              goalsConceded: resolveGoalsConceded(
                positionId,
                mins,
                stats.goals?.conceded,
                teamGoalsAgainst,
                cfg.includeGoalsConceded === true,
              ),
            });
          }
        }

        // Rate limiting - wait between fixture requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        result.errors.push(`Error fetching fixture ${fixture.fixture.id}: ${err}`);
      }
    }
  } catch (error) {
    result.errors.push(`Failed to fetch stats: ${error}`);
  }

  // One row per squad player id (FPL id for EPL). Merge if a player appears twice.
  if (result.players.length > 0) {
    const byId = new Map<number, OraclePlayerStats>();
    for (const row of result.players) {
      const prev = byId.get(row.playerId);
      if (!prev) {
        byId.set(row.playerId, { ...row });
        continue;
      }
      byId.set(row.playerId, {
        ...prev,
        minutesPlayed: prev.minutesPlayed + row.minutesPlayed,
        goals: prev.goals + row.goals,
        assists: prev.assists + row.assists,
        cleanSheet: prev.cleanSheet || row.cleanSheet,
        fplCleanSheets: Math.max(prev.fplCleanSheets ?? 0, row.fplCleanSheets ?? 0),
        saves: prev.saves + row.saves,
        penaltiesSaved: prev.penaltiesSaved + row.penaltiesSaved,
        penaltiesMissed: prev.penaltiesMissed + row.penaltiesMissed,
        ownGoals: prev.ownGoals + row.ownGoals,
        yellowCards: prev.yellowCards + row.yellowCards,
        redCards: prev.redCards + row.redCards,
        rating: Math.max(prev.rating, row.rating),
        tackles: prev.tackles + row.tackles,
        interceptions: prev.interceptions + row.interceptions,
        successfulDribbles: prev.successfulDribbles + row.successfulDribbles,
        freeKickGoals: prev.freeKickGoals + row.freeKickGoals,
        goalsConceded: (prev.goalsConceded ?? 0) + (row.goalsConceded ?? 0),
      });
    }
    result.players = [...byId.values()];
  }

  if (unmappedWithMinutes > 0) {
    result.errors.push(
      `${unmappedWithMinutes} API-Sports player(s) with minutes had no FPL/catalog apiId mapping and were skipped.`,
    );
  }

  return result;
}

export async function fetchGameweekStats(
  apiKey: string,
  gameweekNumber: number
): Promise<GameweekStatsResult> {
  return fetchStatsForCompetition(apiKey, {
    leagueId: EPL_LEAGUE_ID,
    season: SEASON,
    // FPL element ids (same as register_team) + apiId bridge for API-Sports.
    mappingsUrl: "/api/players",
    rounds: [`Regular Season - ${gameweekNumber}`],
    resultGameweekId: gameweekNumber,
  });
}

/**
 * World Cup oracle stats for one tour id (group matchday or knockout round).
 * Uses the API-Sports World Cup league/season and the WC catalog (apiId mapping).
 * From R32 onward, goalsConceded is populated for GK/DEF (MD1–MD3 were settled without it).
 * FPL bonus is still not produced here — admin submit defaults bonus to 0 for WC.
 */
export async function fetchWorldCupRoundStats(
  apiKey: string,
  tourId: number,
): Promise<GameweekStatsResult> {
  const round = getWorldCupRound(tourId);
  if (!round) {
    return {
      gameweekId: tourId,
      players: [],
      fixtures: [],
      errors: [`Unknown World Cup tour id ${tourId}.`],
    };
  }
  return fetchStatsForCompetition(apiKey, {
    leagueId: WC_LEAGUE_ID,
    season: WC_SEASON,
    mappingsUrl: "/data/wc-players.json",
    rounds: round.apiRounds,
    resultGameweekId: tourId,
    includeGoalsConceded: tourId >= WC_GOALS_CONCEDED_FROM_TOUR_ID,
  });
}

/**
 * Fetch gameweek stats from the official FPL Live API (free, no key needed).
 * Proxied through /api/fpl-live to bypass CORS.
 * Covers: goals, assists, saves, clean sheets, cards, penalties, own goals, BPS.
 * Does NOT provide: tackles, interceptions, dribbles (set to 0).
 */
export async function fetchGameweekStatsFPL(
  gameweekNumber: number,
): Promise<GameweekStatsResult> {
  try {
    const res = await fetch(`/api/fpl-live?gw=${gameweekNumber}`);
    const data = await res.json();

    return {
      gameweekId: data.gameweekId ?? gameweekNumber,
      players: data.players ?? [],
      fixtures: data.fixtures ?? [],
      errors: data.errors ?? [],
    };
  } catch (error) {
    return {
      gameweekId: gameweekNumber,
      players: [],
      fixtures: [],
      errors: [`Failed to fetch FPL stats: ${error}`],
    };
  }
}

export async function checkApiStatus(apiKey: string): Promise<{
  valid: boolean;
  requestsUsed: number;
  requestsLimit: number;
  requestsRemaining: number;
  warning?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/status`, {
      headers: { "x-apisports-key": apiKey },
    });

    if (res.status === 429) {
      return {
        valid: false,
        requestsUsed: 0,
        requestsLimit: 100,
        requestsRemaining: 0,
        error: "Rate limit exceeded. Try again tomorrow.",
      };
    }

    const data = await res.json();

    if (data.response) {
      const used = data.response.requests?.current || 0;
      const limit = data.response.requests?.limit_day || 100;
      const remaining = limit - used;

      let warning: string | undefined;
      if (remaining < 15) {
        warning = `Low on API requests! Only ${remaining} remaining today. Fetching 1 gameweek uses ~11 requests.`;
      }

      return {
        valid: true,
        requestsUsed: used,
        requestsLimit: limit,
        requestsRemaining: remaining,
        warning,
      };
    }

    return {
      valid: false,
      requestsUsed: 0,
      requestsLimit: 0,
      requestsRemaining: 0,
      error: "Invalid API key or response",
    };
  } catch (error) {
    return {
      valid: false,
      requestsUsed: 0,
      requestsLimit: 0,
      requestsRemaining: 0,
      error: String(error),
    };
  }
}
