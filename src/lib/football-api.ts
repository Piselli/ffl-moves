/**
 * API-Sports Football Data Integration
 * Fetches real match stats for oracle submission (EPL + World Cup).
 */

import { WC_LEAGUE_ID, WC_SEASON, getWorldCupRound } from "./worldcup";

const API_BASE_URL = "https://v3.football.api-sports.io";
const EPL_LEAGUE_ID = 39;
const SEASON = 2025; // 2025/2026 EPL season

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
    goals: { total: number | null; assists: number | null; saves: number | null };
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
  cleanSheet: boolean;
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
}

export interface GameweekStatsResult {
  gameweekId: number;
  players: OraclePlayerStats[];
  fixtures: string[];
  errors: string[];
}

async function loadPlayerMappings(
  url = "/data/players.json",
): Promise<Map<number, { id: number; position: string }>> {
  const cached = playerMappingsByUrl.get(url);
  if (cached) return cached;

  const mappings = new Map<number, { id: number; position: string }>();
  try {
    const response = await fetch(url);
    const players = await response.json();

    for (const player of players) {
      if (player.apiId) {
        // We only need the original position string here; downstream code converts to a positionId.
        mappings.set(player.apiId, { id: player.id, position: player.position });
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
        if (f.fixture.status.short === "FT" || f.fixture.status.short === "AET") {
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
    for (const fixture of completedFixtures) {
      try {
        const statsUrl = `${API_BASE_URL}/fixtures/players?fixture=${fixture.fixture.id}`;
        const statsRes = await fetch(statsUrl, { headers });
        const statsData = await statsRes.json();

        if (!statsData.response) continue;

        for (const teamData of statsData.response) {
          const teamId = teamData.team.id;
          const hadCleanSheet = cleanSheetTeams.has(teamId);

          for (const playerData of teamData.players as ApiPlayerStats[]) {
            const stats = playerData.statistics[0];
            if (!stats || !stats.games.minutes) continue;

            const mapping = mappings.get(playerData.player.id);
            if (!mapping) continue; // Skip players not in our catalog

            const positionId =
              mapping.position === "GK" ? 0 :
              mapping.position === "DEF" ? 1 :
              mapping.position === "MID" ? 2 : 3;

            const cleanSheet =
              hadCleanSheet &&
              stats.games.minutes >= 60 &&
              (positionId === 0 || positionId === 1);

            result.players.push({
              playerId: mapping.id,
              position: positionId,
              minutesPlayed: stats.games.minutes || 0,
              goals: stats.goals?.total || 0,
              assists: stats.goals?.assists || 0,
              cleanSheet,
              saves: stats.goals?.saves || 0,
              penaltiesSaved: stats.penalty?.saved || 0,
              penaltiesMissed: stats.penalty?.missed || 0,
              ownGoals: 0,
              yellowCards: stats.cards?.yellow || 0,
              redCards: stats.cards?.red || 0,
              rating: Math.round(parseFloat(stats.games.rating || "6.0") * 10),
              tackles: stats.tackles?.total || 0,
              interceptions: stats.tackles?.interceptions || 0,
              successfulDribbles: stats.dribbles?.success || 0,
              freeKickGoals: 0,
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

  return result;
}

export async function fetchGameweekStats(
  apiKey: string,
  gameweekNumber: number
): Promise<GameweekStatsResult> {
  return fetchStatsForCompetition(apiKey, {
    leagueId: EPL_LEAGUE_ID,
    season: SEASON,
    mappingsUrl: "/data/players.json",
    rounds: [`Regular Season - ${gameweekNumber}`],
    resultGameweekId: gameweekNumber,
  });
}

/**
 * World Cup oracle stats for one tour id (group matchday or knockout round).
 * Uses the API-Sports World Cup league/season and the WC catalog (apiId mapping).
 * FPL-only fields (bonus, goals_conceded) are not produced here — the admin submit
 * defaults them to 0 for WC; match ratings from API-Sports are real (better than EPL/FPL).
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
