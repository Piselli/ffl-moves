/**
 * Pure helpers shared by the server auto-publisher.
 *
 * `buildCanonicalStatsJson` mirrors what the admin page's Submit Stats builds (same fields, same
 * order, `bonus` always 0), so an auto-published file looks exactly like a manually published one.
 */
import { toU64Stat } from "@/lib/utils";

type RawRow = Record<string, unknown>;

export function buildCanonicalStatsJson(gameweekId: number, rows: RawRow[]): string {
  const players: Record<string, Record<string, number | boolean>> = {};
  for (const p of rows) {
    const id = toU64Stat(p.playerId);
    if (id < 1) throw new Error(`Invalid playerId: ${String(p.playerId)}`);
    const position = toU64Stat(p.position);
    if (position > 3) throw new Error(`Invalid position (0–3): ${String(p.position)}`);
    players[String(id)] = {
      position,
      minutes_played: toU64Stat(p.minutesPlayed ?? p.minutes_played),
      goals: toU64Stat(p.goals),
      assists: toU64Stat(p.assists),
      clean_sheet: Boolean(p.cleanSheet ?? p.clean_sheet),
      saves: toU64Stat(p.saves),
      penalties_saved: toU64Stat(p.penaltiesSaved ?? p.penalties_saved),
      penalties_missed: toU64Stat(p.penaltiesMissed ?? p.penalties_missed),
      own_goals: toU64Stat(p.ownGoals ?? p.own_goals),
      yellow_cards: toU64Stat(p.yellowCards ?? p.yellow_cards),
      red_cards: toU64Stat(p.redCards ?? p.red_cards),
      rating: toU64Stat(p.rating),
      tackles: toU64Stat(p.tackles),
      interceptions: toU64Stat(p.interceptions),
      successful_dribbles: toU64Stat(p.successfulDribbles ?? p.successful_dribbles),
      free_kick_goals: toU64Stat(p.freeKickGoals ?? p.free_kick_goals),
      goals_conceded: toU64Stat(p.goalsConceded ?? p.goals_conceded),
      // MoveMatch does not use FPL BPS bonus — always 0.
      bonus: 0,
      fpl_clean_sheets: toU64Stat(p.fplCleanSheets ?? p.fpl_clean_sheets ?? p.fplCleanSheet) ? 1 : 0,
    };
  }
  return JSON.stringify({ gameweekId, players });
}

/** Number of player rows in an already published stats JSON (0 when unreadable). */
export function countPublishedRows(json: string | null): number {
  if (!json) return 0;
  try {
    const parsed = JSON.parse(json) as { players?: unknown };
    const p = parsed.players;
    if (Array.isArray(p)) return p.length;
    if (p && typeof p === "object") return Object.keys(p).length;
  } catch {
    /* ignore */
  }
  return 0;
}

/** API-Sports statuses where fixture + player stats are final. */
export function isFinishedStatus(short: string): boolean {
  return short === "FT" || short === "AET" || short === "PEN";
}

/**
 * API-Sports minutes right after the final whistle are provisional (GW7: a sub who came on at
 * the very end showed 0 min, corrected about an hour later). So every finished match is
 * published at once, then re-checked twice.
 */
export const RECHECK_AFTER_MS = [30 * 60_000, 120 * 60_000] as const;

/** API-Sports statuses while a match is being played (or briefly interrupted). */
export const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
/** How often to look while matches are on. */
export const LIVE_POLL_MS = 60_000;
/** Longest the poller ever sleeps without looking. */
export const MAX_SLEEP_MS = 15 * 60_000;
/** Start polling this long before the earliest not-yet-started kickoff. */
export const PRE_KICKOFF_LEAD_MS = 2 * 60_000;

export type RoundFixture = { id: number; short: string; kickoffMs: number };

/**
 * How long the poller may sleep before the next API-Sports look.
 *  - a match is live → look every minute (so the final whistle is caught fast);
 *  - nothing live → sleep until the earliest kickoff (minus a lead) or the next due recheck;
 *  - never longer than MAX_SLEEP_MS, never shorter than LIVE_POLL_MS.
 * Idle nights / weekdays therefore cost no API requests at all.
 */
export function planNextPoll(
  fixtures: RoundFixture[],
  seen: Record<string, FixtureSeen>,
  nowMs: number,
): number {
  if (fixtures.some((f) => LIVE_STATUSES.has(f.short))) return LIVE_POLL_MS;

  const candidates: number[] = [];
  for (const f of fixtures) {
    if (f.short === "NS" || f.short === "TBD") {
      candidates.push(f.kickoffMs - PRE_KICKOFF_LEAD_MS - nowMs);
    }
  }
  for (const s of Object.values(seen)) {
    if (s.rechecks < RECHECK_AFTER_MS.length) {
      candidates.push(s.firstSeenMs + RECHECK_AFTER_MS[s.rechecks]! - nowMs);
    }
  }
  if (candidates.length === 0) return MAX_SLEEP_MS;
  return Math.min(MAX_SLEEP_MS, Math.max(LIVE_POLL_MS, Math.min(...candidates)));
}

export type FixtureSeen = { firstSeenMs: number; rechecks: number };
export type AutoPublishState = { seen: Record<string, FixtureSeen> };

/**
 * Pure decision: which finished fixtures need a (re)publish now, and the state after a
 * successful publish. Nothing is mutated.
 */
export function planRefresh(
  state: AutoPublishState,
  finishedFixtureIds: number[],
  nowMs: number,
): { shouldPublish: boolean; reasons: string[]; nextState: AutoPublishState } {
  const reasons: string[] = [];
  const nextSeen: Record<string, FixtureSeen> = {};

  for (const id of finishedFixtureIds) {
    const key = String(id);
    const prev = state.seen[key];
    if (!prev) {
      reasons.push(`new finished fixture ${id}`);
      nextSeen[key] = { firstSeenMs: nowMs, rechecks: 0 };
      continue;
    }
    let rechecks = prev.rechecks;
    while (
      rechecks < RECHECK_AFTER_MS.length &&
      nowMs - prev.firstSeenMs >= RECHECK_AFTER_MS[rechecks]!
    ) {
      reasons.push(`recheck ${rechecks + 1}/${RECHECK_AFTER_MS.length} of fixture ${id}`);
      rechecks += 1;
    }
    nextSeen[key] = { firstSeenMs: prev.firstSeenMs, rechecks };
  }

  return { shouldPublish: reasons.length > 0, reasons, nextState: { seen: nextSeen } };
}
