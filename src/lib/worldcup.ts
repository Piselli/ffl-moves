/**
 * World Cup 2026 event configuration.
 *
 * The deployed `fantasy_epl` contract is competition-agnostic: a "gameweek" is just a
 * u64 id with an OPEN -> CLOSED -> RESOLVED lifecycle, and player ids are opaque u64.
 * We therefore run the World Cup as a parallel series of tours on the SAME contract,
 * isolated by two disjoint numeric ranges:
 *
 *   - Tour (gameweek) ids:  WC_TOUR_ID_BASE + round index  (10001, 10002, ...)
 *   - Player ids:           WC_PLAYER_ID_BASE + n          (>= 900000)
 *
 * EPL keeps its FPL ids (~1..800) and low gameweek numbers, so the two never collide
 * inside `PlayerStatsRegistry` / `GameweekRegistry`.
 */

import { getGameweek, type GameweekSummary } from "./movement";

/** API-Sports identifiers for the FIFA World Cup 2026. */
export const WC_LEAGUE_ID = 1;
export const WC_SEASON = 2026;

/** First on-chain tour id reserved for the World Cup. */
export const WC_TOUR_ID_BASE = 10000;
/** First internal player id reserved for the World Cup catalog. */
export const WC_PLAYER_ID_BASE = 900000;

/** True when a gameweek/tour id belongs to the World Cup range. */
export function isWorldCupTour(id: number): boolean {
  return Number.isFinite(id) && id >= WC_TOUR_ID_BASE;
}

/** 48 teams -> 12 groups labelled A..L. */
export const WC_GROUP_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

/**
 * API-Sports round string for one group-stage matchday (all 12 groups in one round).
 * e.g. "Group Stage - 1" — NOT per-group "Group A - 1" (that format is unused in v3).
 */
function groupMatchdayRounds(matchday: number): string[] {
  return [`Group Stage - ${matchday}`];
}

export type WorldCupStage = "group" | "knockout";

export interface WorldCupRound {
  /** On-chain tour (gameweek) id. */
  tourId: number;
  /** Stable key for storage / i18n (e.g. "md1", "r16"). */
  key: string;
  stage: WorldCupStage;
  /**
   * API-Sports `round` strings that make up this tour. The stats fetcher pulls every
   * fixture in these rounds and aggregates per player (one match per player per tour).
   */
  apiRounds: string[];
}

/**
 * Round -> tour mapping. WC 2026: 12 groups of 4, top 2 + 8 best thirds advance to a
 * Round of 32, then standard knockout. Each player plays at most one match per tour,
 * so no cross-match aggregation is required.
 */
export const WC_ROUNDS: WorldCupRound[] = [
  { tourId: WC_TOUR_ID_BASE + 1, key: "md1", stage: "group", apiRounds: groupMatchdayRounds(1) },
  { tourId: WC_TOUR_ID_BASE + 2, key: "md2", stage: "group", apiRounds: groupMatchdayRounds(2) },
  { tourId: WC_TOUR_ID_BASE + 3, key: "md3", stage: "group", apiRounds: groupMatchdayRounds(3) },
  { tourId: WC_TOUR_ID_BASE + 4, key: "r32", stage: "knockout", apiRounds: ["Round of 32"] },
  { tourId: WC_TOUR_ID_BASE + 5, key: "r16", stage: "knockout", apiRounds: ["Round of 16"] },
  { tourId: WC_TOUR_ID_BASE + 6, key: "qf", stage: "knockout", apiRounds: ["Quarter-finals"] },
  { tourId: WC_TOUR_ID_BASE + 7, key: "sf", stage: "knockout", apiRounds: ["Semi-finals"] },
  { tourId: WC_TOUR_ID_BASE + 8, key: "final", stage: "knockout", apiRounds: ["3rd Place Final", "Final"] },
];

export const WC_TOUR_IDS = WC_ROUNDS.map((r) => r.tourId);

export function getWorldCupRound(tourId: number): WorldCupRound | undefined {
  return WC_ROUNDS.find((r) => r.tourId === tourId);
}

export function getWorldCupRoundByKey(key: string): WorldCupRound | undefined {
  return WC_ROUNDS.find((r) => r.key === key);
}

/** Fetch on-chain summaries for every WC tour that exists (in round order). */
export async function getWorldCupTourSummaries(): Promise<GameweekSummary[]> {
  const results = await Promise.all(WC_TOUR_IDS.map((id) => getGameweek(id)));
  return results.filter((g): g is GameweekSummary => g != null);
}

/**
 * Resolve the WC tour squads should register for: the first OPEN tour, else the first
 * CLOSED tour (registration closed, results pending). Mirrors the EPL "active" finder
 * but scans only the bounded WC id list.
 */
export async function findActiveWorldCupTourFromChain(): Promise<GameweekSummary | null> {
  const tours = await getWorldCupTourSummaries();
  const open = tours.find((t) => t.status === "open");
  if (open) return open;
  const closed = tours.find((t) => t.status === "closed");
  return closed ?? null;
}

export async function findOpenWorldCupTourFromChain(): Promise<GameweekSummary | null> {
  const tours = await getWorldCupTourSummaries();
  return tours.find((t) => t.status === "open") ?? null;
}

/**
 * Which WC tour's prize pool to surface on marketing UI: the latest CLOSED tour
 * (matches done, results not yet published), else the OPEN registration tour.
 */
export function pickWorldCupPrizePoolTour(
  tours: GameweekSummary[] | Record<number, GameweekSummary>,
): GameweekSummary | null {
  const list = Array.isArray(tours)
    ? WC_TOUR_IDS.map((id) => tours.find((t) => t.id === id)).filter(
        (g): g is GameweekSummary => g != null,
      )
    : WC_TOUR_IDS.map((id) => tours[id]).filter((g): g is GameweekSummary => g != null);
  const closed = [...list].reverse().find((t) => t.status === "closed");
  if (closed) return closed;
  return list.find((t) => t.status === "open") ?? null;
}

export async function findPrizePoolWorldCupTourFromChain(): Promise<GameweekSummary | null> {
  const tours = await getWorldCupTourSummaries();
  return pickWorldCupPrizePoolTour(tours);
}

/** Latest WC tour id that is RESOLVED (best default for the WC leaderboard). */
export async function findLatestResolvedWorldCupTourId(): Promise<number> {
  const tours = await getWorldCupTourSummaries();
  const resolved = tours.filter((t) => t.status === "resolved");
  if (resolved.length === 0) return 0;
  return resolved.reduce((max, t) => Math.max(max, t.id), 0);
}

/** Highest WC tour id that exists on-chain (open, closed, or resolved). */
export async function findHighestWorldCupTourId(): Promise<number> {
  const tours = await getWorldCupTourSummaries();
  return tours.reduce((max, t) => Math.max(max, t.id), 0);
}

/**
 * When true, the product surfaces World Cup as the primary competition (homepage stats,
 * nav, ticker). Set `NEXT_PUBLIC_WC_CAMPAIGN_ACTIVE=false` after the tournament to restore EPL focus.
 */
export function isWorldCupCampaignActive(): boolean {
  const v = process.env.NEXT_PUBLIC_WC_CAMPAIGN_ACTIVE;
  if (v === "false" || v === "0") return false;
  return true;
}
