/**
 * football-data.org integration — FREE source for World Cup match data.
 *
 * Scope: schedule, kickoff times, scores, status and group/stage labels. This is
 * intentionally decoupled from the API-Sports player catalog/oracle: football-data.org
 * match/team ids are NOT compatible with API-Sports player ids, so this feed is used
 * ONLY for display (fixtures / results / deadlines), never for per-player scoring.
 *
 * Free tier: register at https://www.football-data.org/client/register for a token,
 * set it as FOOTBALL_DATA_TOKEN. Limit ~10 requests/min — hence the in-memory TTL cache.
 */

import { WC_ROUNDS, getWorldCupRoundByKey, type WorldCupRound } from "./worldcup";

const FD_BASE = "https://api.football-data.org/v4";
/** football-data.org competition code for the FIFA World Cup. */
const FD_WC_COMPETITION = "WC";
/** Edition we surface. Most-recent edition is returned by default; pin to be safe. */
const FD_WC_SEASON = 2026;

/** Cache matches in-memory to respect the 10 req/min free-tier limit. */
const MATCHES_TTL_MS = 60_000;

export interface WcFixture {
  /** football-data.org match id (display only — not the oracle id). */
  id: number;
  kickoffTime: string | null;
  home: string;
  away: string;
  /** 3-letter team code (e.g. "GER"), when published. */
  homeCode: string | null;
  awayCode: string | null;
  /** Team crest/emblem URL from football-data.org (display only). */
  homeCrest: string | null;
  awayCrest: string | null;
  finished: boolean;
  started: boolean;
  scoreH: number | null;
  scoreA: number | null;
  /** Penalty shootout score, when a knockout tie is decided on penalties. */
  penaltyH?: number | null;
  penaltyA?: number | null;
  /** Winner after extra time / penalties. Needed when full-time scores are level. */
  winner?: "home" | "away" | null;
  /** Group letter (A..L) for group-stage matches, else null. */
  group: string | null;
  /** Our internal round key (md1/md2/md3/r32/r16/qf/sf/final). */
  roundKey: string | null;
}

interface FdTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface FdMatch {
  id: number;
  utcDate: string | null;
  status: string;
  stage: string | null;
  group: string | null;
  matchday: number | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
}

interface MatchesCacheEntry {
  at: number;
  fixtures: WcFixture[];
}

let matchesCache: MatchesCacheEntry | null = null;

function token(): string {
  return (
    process.env.FOOTBALL_DATA_TOKEN ||
    process.env.NEXT_PUBLIC_FOOTBALL_DATA_TOKEN ||
    ""
  );
}

export function hasFootballDataToken(): boolean {
  return token().length > 0;
}

/** Map a football-data.org stage + matchday onto our internal WC round key. */
function mapStageToRoundKey(stage: string | null, matchday: number | null): string | null {
  const s = String(stage || "").toUpperCase();
  if (s === "GROUP_STAGE" || s === "GROUP STAGE") {
    const md = Number.isFinite(matchday) ? Math.min(Math.max(matchday as number, 1), 3) : 1;
    return `md${md}`;
  }
  if (s === "LAST_32") return "r32";
  if (s === "LAST_16") return "r16";
  if (s === "QUARTER_FINALS" || s === "QUARTER_FINAL") return "qf";
  if (s === "SEMI_FINALS" || s === "SEMI_FINAL") return "sf";
  if (s === "THIRD_PLACE" || s === "3RD_PLACE" || s === "FINAL") return "final";
  return null;
}

/** Extract the group letter (A..L) from football-data's "GROUP_A" / "Group A". */
function parseGroupLetter(group: string | null): string | null {
  if (!group) return null;
  const m = group.toUpperCase().match(/([A-L])\s*$/);
  return m ? m[1] : null;
}

function isFinished(status: string): boolean {
  const s = status.toUpperCase();
  return s === "FINISHED" || s === "AWARDED";
}

function isStarted(status: string): boolean {
  const s = status.toUpperCase();
  return s === "IN_PLAY" || s === "PAUSED" || s === "SUSPENDED" || isFinished(s);
}

function normalizeMatch(m: FdMatch): WcFixture {
  const winner =
    m.score?.winner === "HOME_TEAM"
      ? "home"
      : m.score?.winner === "AWAY_TEAM"
        ? "away"
        : null;

  return {
    id: m.id,
    kickoffTime: m.utcDate ?? null,
    home: m.homeTeam?.name ?? "TBD",
    away: m.awayTeam?.name ?? "TBD",
    homeCode: m.homeTeam?.tla ?? null,
    awayCode: m.awayTeam?.tla ?? null,
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    finished: isFinished(m.status),
    started: isStarted(m.status),
    scoreH: m.score?.fullTime?.home ?? null,
    scoreA: m.score?.fullTime?.away ?? null,
    penaltyH: m.score?.penalties?.home ?? null,
    penaltyA: m.score?.penalties?.away ?? null,
    winner,
    group: parseGroupLetter(m.group),
    roundKey: mapStageToRoundKey(m.stage, m.matchday),
  };
}

/**
 * Fetch + normalize every World Cup match from football-data.org.
 * Returns null when no token is configured or the request fails (callers fall back
 * to the static fixtures file). Successful results are cached for MATCHES_TTL_MS.
 */
export async function fetchWcMatches(): Promise<WcFixture[] | null> {
  if (!hasFootballDataToken()) return null;

  if (matchesCache && Date.now() - matchesCache.at < MATCHES_TTL_MS) {
    return matchesCache.fixtures;
  }

  try {
    const url = `${FD_BASE}/competitions/${FD_WC_COMPETITION}/matches?season=${FD_WC_SEASON}`;
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token() },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`football-data WC matches failed: ${res.status} ${res.statusText}`);
      // Serve stale cache rather than nothing, if we have it.
      return matchesCache?.fixtures ?? null;
    }

    const data = (await res.json()) as { matches?: FdMatch[] };
    const matches = Array.isArray(data.matches) ? data.matches : [];
    const fixtures = matches.map(normalizeMatch);
    matchesCache = { at: Date.now(), fixtures };
    return fixtures;
  } catch (err) {
    console.warn("football-data WC matches error:", err instanceof Error ? err.message : err);
    return matchesCache?.fixtures ?? null;
  }
}

function sortByKickoff(a: WcFixture, b: WcFixture): number {
  const ta = a.kickoffTime ? Date.parse(a.kickoffTime) : Number.POSITIVE_INFINITY;
  const tb = b.kickoffTime ? Date.parse(b.kickoffTime) : Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return a.id - b.id;
}

export interface WcRoundFixtures {
  round: WorldCupRound;
  /** Earliest kickoff in the round — used as the registration deadline. */
  deadlineTime: string | null;
  deadlineEpochMs: number | null;
  fixtures: WcFixture[];
}

/**
 * Fixtures + computed deadline for one WC round, sourced from football-data.org.
 * Returns null if the feed is unavailable so the route can fall back to the static file.
 */
export async function getWcRoundFixtures(roundKey: string): Promise<WcRoundFixtures | null> {
  const round = getWorldCupRoundByKey(roundKey) ?? WC_ROUNDS[0];
  const all = await fetchWcMatches();
  if (!all) return null;

  const fixtures = all.filter((f) => f.roundKey === round.key).sort(sortByKickoff);

  const firstKick = fixtures.find(
    (f) => typeof f.kickoffTime === "string" && f.kickoffTime.length > 0,
  )?.kickoffTime;
  const deadlineEpochMs =
    typeof firstKick === "string" && Number.isFinite(Date.parse(firstKick))
      ? Date.parse(firstKick)
      : null;

  return {
    round,
    deadlineTime: firstKick ?? null,
    deadlineEpochMs,
    fixtures,
  };
}
