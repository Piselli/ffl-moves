/**
 * API-Sports Football Data Integration
 * Fetches real match stats for oracle submission (EPL + World Cup).
 */

import fplApiIdMapFile from "@/data/fpl-apiid-map.json";
import {
  WC_LEAGUE_ID,
  WC_SEASON,
  WC_GOALS_CONCEDED_FROM_TOUR_ID,
  getWorldCupRound,
} from "./worldcup";

const API_BASE_URL = "https://v3.football.api-sports.io";
export const EPL_LEAGUE_ID = 39;
export const SEASON = 2026; // 2026/2027 EPL season

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
  /** EPL: add 0-minute DNP rows for catalog players of played clubs missing from API-Sports. */
  padDnpForPlayedClubs?: boolean;
}

type PlayerMapping = { id: number; position: string; team: string; hasApiId?: boolean };

// Player apiId -> candidate FPL rows (name collisions like Palmer/Chelsea vs Palmer/Ipswich).
const playerMappingsByUrl = new Map<string, Map<number, PlayerMapping[]>>();
// Every catalog player (even without an apiId) — used to add 0-minute DNP rows.
const playerCatalogByUrl = new Map<string, PlayerMapping[]>();

function normTeamName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Pick the catalog row(s) for this API-Sports player on this fixture team.
 *
 * Clubs are compared through `clubKey` so API-Sports names ("Nottingham Forest") match
 * catalog names ("Nott'm Forest") — plain normalised comparison missed those and silently
 * fell back to the first candidate, i.e. a same-named player at another club.
 *
 * Several catalog rows at the SAME club sharing one apiId are duplicate FPL entries of one
 * human (e.g. Fletcher / J.Fletcher), so all of them get the stats.
 */
export function resolveMappings(
  candidates: PlayerMapping[] | undefined,
  apiTeamName: string,
): PlayerMapping[] {
  if (!candidates?.length) return [];
  if (candidates.length === 1) return candidates;
  const want = clubKey(apiTeamName);
  const sameClub = candidates.filter((c) => {
    const t = clubKey(c.team);
    return t === want || t.includes(want) || want.includes(t);
  });
  return sameClub.length > 0 ? sameClub : [candidates[0]!];
}

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

let lastMappingsLoadError: string | null = null;

function ingestPlayersIntoMappings(
  players: unknown[],
  mappings: Map<number, PlayerMapping[]>,
  catalog: PlayerMapping[],
  catalogIds: Set<number>,
): void {
  const byCode = (fplApiIdMapFile as { byCode?: Record<string, number> })?.byCode ?? {};
  for (const player of players) {
    const row = player as {
      id?: number;
      fplId?: number;
      apiId?: number;
      fplPhotoCode?: number | string;
      position?: string;
      team?: string;
    };
    const id = Number(row?.id ?? row?.fplId);
    if (!Number.isFinite(id) || id <= 0) continue;
    const fromField = Number(row?.apiId);
    const fromCode = Number(byCode[String(row?.fplPhotoCode ?? "")]);
    const apiId =
      Number.isFinite(fromField) && fromField > 0
        ? fromField
        : Number.isFinite(fromCode) && fromCode > 0
          ? fromCode
          : 0;
    if (!catalogIds.has(id)) {
      catalogIds.add(id);
      catalog.push({
        id,
        position: String(row?.position || "MID"),
        team: String(row?.team || ""),
        hasApiId: apiId > 0,
      });
    }
    if (apiId <= 0) continue;
    const position = String(row?.position || "MID");
    const team = String(row?.team || "");
    const mapping: PlayerMapping = { id, position, team };
    const list = mappings.get(apiId);
    if (!list) {
      mappings.set(apiId, [mapping]);
    } else if (!list.some((x) => x.id === id)) {
      list.push(mapping);
    }
  }
}

/**
 * API-Sports player id → on-chain / squad catalog id (+ position).
 * EPL squads use FPL element ids; `/api/players` exposes those as `id` with `apiId`.
 * Multiple FPL rows may share one apiId after bad atlas merges — keep all candidates
 * and disambiguate by fixture team name when fetching.
 *
 * Never caches an empty map (a transient /api/players failure used to poison the
 * session so every later Fetch showed "no mappings loaded").
 */
async function loadPlayerMappings(
  url = "/api/players",
): Promise<Map<number, PlayerMapping[]>> {
  const cached = playerMappingsByUrl.get(url);
  if (cached && cached.size > 0) return cached;

  const mappings = new Map<number, PlayerMapping[]>();
  const catalog: PlayerMapping[] = [];
  const catalogIds = new Set<number>();
  lastMappingsLoadError = null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      lastMappingsLoadError = `${url} returned HTTP ${response.status}`;
    } else {
      const players = await response.json();
      if (Array.isArray(players) && players.length > 0) {
        ingestPlayersIntoMappings(players, mappings, catalog, catalogIds);
      } else {
        lastMappingsLoadError = `${url} returned a non-array or empty catalog`;
      }
    }
  } catch (error) {
    lastMappingsLoadError = error instanceof Error ? error.message : String(error);
    console.error("Failed to load player mappings:", error);
  }

  // Bundled FPL catalog + photo-code atlas — works even when live /api/players is down.
  if (mappings.size === 0 && url === "/api/players") {
    try {
      const bundled = (await import("@/data/players.json")).default as unknown[];
      if (Array.isArray(bundled) && bundled.length > 0) {
        ingestPlayersIntoMappings(bundled, mappings, catalog, catalogIds);
        if (mappings.size > 0) {
          lastMappingsLoadError = lastMappingsLoadError
            ? `${lastMappingsLoadError}; recovered via bundled players.json`
            : null;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lastMappingsLoadError = lastMappingsLoadError
        ? `${lastMappingsLoadError}; bundled fallback failed: ${msg}`
        : `bundled fallback failed: ${msg}`;
      console.error("Failed to load bundled player mappings:", error);
    }
  }

  if (mappings.size > 0) {
    playerMappingsByUrl.set(url, mappings);
    playerCatalogByUrl.set(url, catalog);
  } else {
    playerMappingsByUrl.delete(url);
    playerCatalogByUrl.delete(url);
  }
  return mappings;
}

function positionStringToId(pos: string): number {
  return pos === "GK" ? 0 : pos === "DEF" ? 1 : pos === "MID" ? 2 : 3;
}

/** Canonical club key so API-Sports names ("Manchester City") match catalog names ("Man City"). */
const CLUB_ALIASES: Record<string, string> = {
  manchestercity: "mancity",
  manchesterunited: "manutd",
  tottenham: "spurs",
  tottenhamhotspur: "spurs",
  nottinghamforest: "nottmforest",
  newcastleunited: "newcastle",
  leedsunited: "leeds",
  brightonhovealbion: "brighton",
  afcbournemouth: "bournemouth",
};

export function clubKey(name: string): string {
  const n = normTeamName(name);
  return CLUB_ALIASES[n] ?? n;
}

/**
 * API-Sports only lists players in the matchday squad. Injured / suspended / unused
 * non-squad players get no row at all, and the contract treats "no row" as 0 pts with
 * NO auto-sub. Add explicit 0-minute DNP rows for catalog players whose club's fixture is
 * COMPLETE (`playedClubs`, from the finished fixtures actually fetched) but who have no row.
 *
 * Safety rules (a wrong DNP row wrongly pulls a bench player):
 *  - only clubs with a finished fixture (never live / upcoming ones);
 *  - only players with a known API-Sports id. Without one we cannot tell "not in squad"
 *    from "played but unmatched", so they keep no row (0 pts, no sub).
 */
export function addDnpRowsForPlayedClubs(
  rows: OraclePlayerStats[],
  catalog: { id: number; position: string; team: string; hasApiId?: boolean }[],
  playedClubs: Iterable<string>,
): { rows: OraclePlayerStats[]; added: number } {
  const played = new Set<string>();
  for (const c of playedClubs) played.add(clubKey(c));
  if (rows.length === 0 || catalog.length === 0 || played.size === 0) return { rows, added: 0 };

  const haveIds = new Set(rows.map((r) => r.playerId));
  const out = [...rows];
  let added = 0;
  for (const c of catalog) {
    if (haveIds.has(c.id)) continue;
    if (!c.hasApiId) continue;
    if (!c.team || !played.has(clubKey(c.team))) continue;
    out.push({
      playerId: c.id,
      position: positionStringToId(c.position),
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      fplCleanSheets: 0,
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
    });
    added += 1;
  }
  return { rows: out, added };
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
    const detail = lastMappingsLoadError ? ` (${lastMappingsLoadError})` : "";
    result.errors.push(
      `No API-Sports→FPL mappings loaded from ${cfg.mappingsUrl}${detail}. Cannot attach stats to squads.`,
    );
    return result;
  }
  let unmappedWithMinutes = 0;
  const unmappedNames: string[] = [];
  // Clubs whose fixture is FINISHED (only these may receive DNP padding).
  const playedClubNames: string[] = [];

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
      playedClubNames.push(fixture.teams.home.name, fixture.teams.away.name);
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

            const resolved = resolveMappings(
              mappings.get(playerData.player.id),
              String(teamData.team?.name || ""),
            );
            const minsRaw = stats.games.minutes ?? 0;
            if (resolved.length === 0) {
              if (minsRaw > 0) {
                unmappedWithMinutes += 1;
                unmappedNames.push(`${playerData.player.name} (${teamData.team?.name ?? "?"})`);
              }
              continue;
            }

            for (const mapping of resolved) {
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

    if (cfg.padDnpForPlayedClubs) {
      const padded = addDnpRowsForPlayedClubs(
        result.players,
        playerCatalogByUrl.get(cfg.mappingsUrl) ?? [],
        playedClubNames,
      );
      result.players = padded.rows;
    }
  }

  if (unmappedWithMinutes > 0) {
    result.errors.push(
      `${unmappedWithMinutes} API-Sports player(s) with minutes had no FPL/catalog apiId mapping and were skipped (they score 0 and never get subbed): ${unmappedNames.join(", ")}.`,
    );
  }

  return result;
}

/** Drop cached apiId→FPL maps (server auto-publish calls this so each run sees a fresh catalog). */
export function resetPlayerMappingsCache(): void {
  playerMappingsByUrl.clear();
  playerCatalogByUrl.clear();
}

export async function fetchGameweekStats(
  apiKey: string,
  gameweekNumber: number,
  /** Browser default is same-origin; server callers pass an absolute URL. */
  mappingsUrl = "/api/players",
): Promise<GameweekStatsResult> {
  return fetchStatsForCompetition(apiKey, {
    leagueId: EPL_LEAGUE_ID,
    season: SEASON,
    // FPL element ids (same as register_team) + apiId bridge for API-Sports.
    mappingsUrl,
    rounds: [`Regular Season - ${gameweekNumber}`],
    resultGameweekId: gameweekNumber,
    // GK/DEF −1 per 2 goals conceded is part of our scoring; without this EPL rows carry 0.
    includeGoalsConceded: true,
    padDnpForPlayedClubs: true,
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

export async function checkApiStatus(apiKey: string): Promise<{
  valid: boolean;
  requestsUsed: number;
  requestsLimit: number;
  requestsRemaining: number;
  plan?: string;
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
      const plan =
        typeof data.response.subscription?.plan === "string"
          ? data.response.subscription.plan
          : undefined;

      let warning: string | undefined;
      if (remaining < 15) {
        warning = `Low on API requests! Only ${remaining} remaining today. Fetching 1 gameweek uses ~11 requests.`;
      }

      return {
        valid: true,
        requestsUsed: used,
        requestsLimit: limit,
        requestsRemaining: remaining,
        plan,
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
