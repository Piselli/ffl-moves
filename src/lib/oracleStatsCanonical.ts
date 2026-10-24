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
/** How often to look while matches are on (API-Sports quota is ample — prefer freshness). */
export const LIVE_POLL_MS = 30_000;
/**
 * Cap while the round still has fixtures to play (NS / live). Was 15 min — that left a
 * blind window where FT could land during sleep and wait for the next traffic/GH poke.
 */
export const ACTIVE_MAX_SLEEP_MS = 3 * 60_000;
/** Cap when every fixture is already FT (only rechecks / idle remain). */
export const IDLE_MAX_SLEEP_MS = 15 * 60_000;
/** Start polling this long before the earliest not-yet-started kickoff. */
export const PRE_KICKOFF_LEAD_MS = 2 * 60_000;

/** True while any fixture in the round has not reached a finished status yet. */
export function roundStillActive(fixtures: Array<{ short: string }>): boolean {
  return fixtures.some((f) => !isFinishedStatus(f.short) && f.short !== "PST" && f.short !== "CANC" && f.short !== "ABD");
}

export type RoundFixture = {
  id: number;
  short: string;
  kickoffMs: number;
  /** "Home vs Away" when known — used for Telegram alerts. */
  label?: string;
};

/** True when this publish tick includes at least one newly finished fixture (not only rechecks). */
export function hasNewFinishedFixture(reasons: string[]): boolean {
  return reasons.some((r) => /^new finished fixture \d+$/.test(r));
}

/**
 * Fixture labels to show in a stats-update alert.
 * Only newly finished matches — silent +30m/+2h rechecks update the site without Telegram noise.
 */
export function labelsForPublishAlert(
  reasons: string[],
  fixtures: Array<{ id: number; label?: string }>,
): string[] {
  const newIds: number[] = [];
  for (const r of reasons) {
    const neu = /^new finished fixture (\d+)$/.exec(r);
    if (neu) newIds.push(Number(neu[1]));
  }
  const ids = [...new Set(newIds)];
  const byId = new Map(
    fixtures
      .filter((f) => typeof f.label === "string" && f.label.trim().length > 0)
      .map((f) => [f.id, f.label!.trim()] as const),
  );
  return ids.map((id) => byId.get(id) ?? `fixture ${id}`);
}

/**
 * How long the poller may sleep before the next API-Sports look.
 *  - a match is live → look every LIVE_POLL_MS (catch FT fast);
 *  - nothing live → sleep until the earliest kickoff (minus a lead) or the next due recheck;
 *  - never longer than ACTIVE/IDLE max sleep, never shorter than LIVE_POLL_MS.
 * Quota note: even a full Saturday at 30s live polls is well under a Pro API-Sports day cap.
 */
export function planNextPoll(
  fixtures: RoundFixture[],
  seen: Record<string, FixtureSeen>,
  nowMs: number,
): number {
  if (fixtures.some((f) => LIVE_STATUSES.has(f.short))) return LIVE_POLL_MS;

  const maxSleep = roundStillActive(fixtures) ? ACTIVE_MAX_SLEEP_MS : IDLE_MAX_SLEEP_MS;

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
  if (candidates.length === 0) return maxSleep;
  return Math.min(maxSleep, Math.max(LIVE_POLL_MS, Math.min(...candidates)));
}

/**
 * Delay until the next self-chain poke for publish-stats, or null to stop chaining.
 * Matches the Redis sleep window so we wake without waiting for site traffic / GH lag.
 */
export function autoPublishChainDelayMs(input: {
  action: string;
  reason?: string;
  nextPollInMs?: number;
  wakesInMs?: number;
}): number | null {
  const STOP = new Set([
    "AUTO_PUBLISH_STATS_ENABLED=false",
    "no_closed_gameweek",
    "stats_committed_on_chain",
  ]);
  if (input.action === "skipped" && input.reason && STOP.has(input.reason)) return null;

  if (input.action === "skipped" && input.reason === "sleeping") {
    const wakes = input.wakesInMs;
    if (typeof wakes === "number" && Number.isFinite(wakes) && wakes > 0) {
      return Math.max(2_000, Math.ceil(wakes));
    }
    return null;
  }

  if (input.action === "skipped" && input.reason === "another_run_in_progress") {
    return 5_000;
  }

  const poll = input.nextPollInMs;
  if (
    typeof poll === "number" &&
    Number.isFinite(poll) &&
    poll > 0 &&
    (input.action === "published" ||
      input.action === "dry_run" ||
      input.reason === "nothing_new" ||
      input.reason === "no_finished_fixtures")
  ) {
    return Math.max(2_000, Math.ceil(poll));
  }

  return null;
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
