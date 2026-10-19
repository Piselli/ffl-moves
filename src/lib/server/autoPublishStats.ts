/**
 * Auto-publish oracle stats to the site right after EPL matches finish.
 *
 * This is the admin page's "Fetch" + "Submit Stats (publish only)" without a human:
 *   - fetches API-Sports stats for the active CLOSED gameweek,
 *   - writes the stats JSON to the same store the site reads (Redis + local file),
 *   - NEVER touches the chain (no commit_stats, no results) — that stays manual.
 *
 * Safety rules (any failure → publish nothing, keep what is already live):
 *   - only while the on-chain gameweek is CLOSED and has NO on-chain stats commit
 *     (a committed hash must stay byte-identical to the published file);
 *   - refuse on any fetch error / unmapped player / empty result / shrinking row count;
 *   - back off after a refusal so a persistent problem cannot burn the API quota;
 *   - the FPL cross-check is advisory only: reported, never blocks the publish.
 *
 * Disable with AUTO_PUBLISH_STATS_ENABLED=false.
 */
import { Redis } from "@upstash/redis";
import { getConfig, getGameweek, getStatsCommit, type GameweekSummary } from "@/lib/chainClient";
import {
  EPL_LEAGUE_ID,
  SEASON,
  fetchGameweekStats,
  resetPlayerMappingsCache,
} from "@/lib/football-api";
import { readOracleStatsJson, writeOracleStatsJson } from "@/lib/oracleStatsStore";
import {
  buildCanonicalStatsJson,
  countPublishedRows,
  isFinishedStatus,
  planNextPoll,
  labelsForPublishAlert,
  planRefresh,
  type AutoPublishState,
  type RoundFixture,
} from "@/lib/oracleStatsCanonical";
import {
  auditStatsAgainstFpl,
  formatAuditReport,
  type AuditCatalogRow,
} from "@/lib/statsAudit";

const API_SPORTS_BASE = "https://v3.football.api-sports.io";
const LOCK_KEY = "oracle:autopublish:lock";
const LOCK_TTL_SEC = 120;
/** After a refusal wait this long before the next API-Sports pull (caps quota burn on a stuck problem). */
const BACKOFF_MS = 5 * 60_000;
/** While no gameweek is closed (no matches being played) there is nothing to look at. */
const NO_CLOSED_GW_SLEEP_MS = 5 * 60_000;
const COMMITTED_SLEEP_MS = 15 * 60_000;
const STATE_TTL_SEC = 14 * 24 * 3600;
const SLEEP_KEY = "oracle:autopublish:sleep-until";
/**
 * API-Sports players that played but have no FPL/catalog apiId. One or two (a debutant nobody
 * owns) must not freeze updates for everybody — they are published and reported as warnings.
 * Many at once means the catalog is stale/cold → refuse.
 */
const MAX_UNMAPPED_PLAYERS = 5;
const UNMAPPED_RE = /^(\d+) API-Sports player\(s\) with minutes had no FPL\/catalog apiId mapping/;

type StoredState = AutoPublishState;

export type AutoPublishResult =
  | { action: "skipped"; reason: string; detail?: Record<string, unknown> }
  | { action: "refused"; reason: string; gameweekId?: number; detail?: Record<string, unknown> }
  | {
      action: "published" | "dry_run";
      gameweekId: number;
      rows: number;
      previousRows: number;
      reasons: string[];
      fixtures: string[];
      warnings: string[];
      nextPollInMs: number;
      audit: string | null;
      auditBlocking: number;
    };

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() && !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

const memoryState = new Map<number, StoredState>();
let memoryLockUntil = 0;
let memorySleepUntil = 0;

async function readSleepUntil(): Promise<number> {
  let fromRedis = 0;
  if (redis) {
    try {
      fromRedis = Number(await redis.get<number | string>(SLEEP_KEY)) || 0;
    } catch (e) {
      console.warn("autoPublishStats: redis sleep read failed", e);
    }
  }
  return Math.max(fromRedis, memorySleepUntil);
}

/** Do not look at API-Sports again before now+ms (unless forced). */
async function sleepFor(ms: number, nowMs: number): Promise<void> {
  const until = nowMs + ms;
  memorySleepUntil = until;
  if (!redis) return;
  try {
    await redis.set(SLEEP_KEY, String(until), { ex: Math.ceil(ms / 1000) + 60 });
  } catch (e) {
    console.warn("autoPublishStats: redis sleep write failed", e);
  }
}

const stateKey = (gw: number) => `oracle:autopublish:state:${gw}`;

async function readState(gw: number): Promise<StoredState> {
  if (redis) {
    try {
      const raw = await redis.get<StoredState | string>(stateKey(gw));
      const value = typeof raw === "string" ? (JSON.parse(raw) as StoredState) : raw;
      if (value && typeof value === "object" && value.seen) return value;
    } catch (e) {
      console.warn("autoPublishStats: redis state read failed", e);
    }
  }
  return memoryState.get(gw) ?? { seen: {} };
}

async function writeState(gw: number, state: StoredState): Promise<void> {
  memoryState.set(gw, state);
  if (!redis) return;
  try {
    await redis.set(stateKey(gw), state, { ex: STATE_TTL_SEC });
  } catch (e) {
    console.warn("autoPublishStats: redis state write failed", e);
  }
}

async function acquireLock(nowMs: number): Promise<boolean> {
  if (redis) {
    try {
      return (await redis.set(LOCK_KEY, String(nowMs), { nx: true, ex: LOCK_TTL_SEC })) === "OK";
    } catch (e) {
      console.warn("autoPublishStats: redis lock failed", e);
    }
  }
  if (nowMs < memoryLockUntil) return false;
  memoryLockUntil = nowMs + LOCK_TTL_SEC * 1000;
  return true;
}

async function releaseLock(): Promise<void> {
  memoryLockUntil = 0;
  if (!redis) return;
  try {
    await redis.del(LOCK_KEY);
  } catch {
    /* lock expires on its own */
  }
}

const FPL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://fantasy.premierleague.com/",
};

async function fplJson<T>(path: string): Promise<T> {
  const res = await fetch(`https://fantasy.premierleague.com/api/${path}`, {
    headers: FPL_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FPL ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Same cross-check the admin shows. Advisory: any failure just means "no audit text". */
async function runAudit(
  gameweekId: number,
  rows: { playerId: number; minutesPlayed: number; goals: number }[],
  origin: string,
): Promise<{ text: string | null; blocking: number }> {
  try {
    const [live, fixtures, catalog] = await Promise.all([
      fplJson<{ elements: { id: number; stats: { minutes: number; goals_scored: number } }[] }>(
        `event/${gameweekId}/live/`,
      ),
      fplJson<{ finished: boolean; finished_provisional: boolean }[]>(
        `fixtures/?event=${gameweekId}`,
      ),
      fetch(`${origin}/api/players`, { cache: "no-store" }).then(
        (r) => r.json() as Promise<AuditCatalogRow[]>,
      ),
    ]);
    const report = auditStatsAgainstFpl({
      ours: rows.map((r) => ({ playerId: r.playerId, minutes: r.minutesPlayed, goals: r.goals })),
      live: live.elements.map((e) => ({
        id: e.id,
        minutes: e.stats.minutes,
        goals: e.stats.goals_scored,
      })),
      catalog,
      fixtures: {
        total: fixtures.length,
        finished: fixtures.filter((f) => f.finished || f.finished_provisional).length,
      },
    });
    return { text: formatAuditReport(report) || null, blocking: report.blocking };
  } catch (e) {
    console.warn("autoPublishStats: audit unavailable", e);
    return { text: null, blocking: 0 };
  }
}

type ApiFixtureRow = {
  fixture: { id: number; date: string; status: { short: string } };
  teams?: { home?: { name?: string }; away?: { name?: string } };
};

/** One API-Sports request: every fixture of the round with status + kickoff. */
async function listRoundFixtures(
  apiKey: string,
  gameweekId: number,
): Promise<{ fixtures: RoundFixture[]; error?: string }> {
  const round = encodeURIComponent(`Regular Season - ${gameweekId}`);
  const res = await fetch(
    `${API_SPORTS_BASE}/fixtures?league=${EPL_LEAGUE_ID}&season=${SEASON}&round=${round}`,
    { headers: { "x-apisports-key": apiKey }, cache: "no-store" },
  );
  if (res.status === 429) return { fixtures: [], error: "API-Sports rate limit (429)" };
  if (!res.ok) return { fixtures: [], error: `API-Sports fixtures HTTP ${res.status}` };
  const body = (await res.json()) as {
    errors?: Record<string, unknown> | unknown[];
    response?: ApiFixtureRow[];
  };
  if (body.errors && !Array.isArray(body.errors) && Object.keys(body.errors).length > 0) {
    return { fixtures: [], error: `API-Sports: ${JSON.stringify(body.errors)}` };
  }
  const fixtures = (body.response ?? []).map((f) => {
    const home = f.teams?.home?.name?.trim() || "Home";
    const away = f.teams?.away?.name?.trim() || "Away";
    return {
      id: f.fixture.id,
      short: f.fixture.status.short,
      kickoffMs: Date.parse(f.fixture.date) || 0,
      label: `${home} vs ${away}`,
    };
  });
  return { fixtures };
}

export async function runAutoPublishStats(opts: {
  /** Origin of this deployment — used to read the same /api/players catalog the admin uses. */
  origin: string;
  dryRun?: boolean;
  /** Ignore the sleep schedule and publish even when nothing new finished (safety rules still apply). */
  force?: boolean;
  nowMs?: number;
}): Promise<AutoPublishResult> {
  if (process.env.AUTO_PUBLISH_STATS_ENABLED === "false") {
    return { action: "skipped", reason: "AUTO_PUBLISH_STATS_ENABLED=false" };
  }
  const apiKey = (process.env.API_SPORTS_KEY || "").trim();
  if (!apiKey) return { action: "refused", reason: "API_SPORTS_KEY is not set on the server" };

  const now = opts.nowMs ?? Date.now();

  // Cheapest possible exit: the poller is asleep (no matches live / not due yet).
  // No chain RPC, no API-Sports — a single Redis read.
  if (!opts.force) {
    const sleepUntil = await readSleepUntil();
    if (now < sleepUntil) {
      return { action: "skipped", reason: "sleeping", detail: { wakesInMs: sleepUntil - now } };
    }
  }

  if (!(await acquireLock(now))) return { action: "skipped", reason: "another_run_in_progress" };

  /** Sleep unless this is a dry run (a dry run must not change the live schedule). */
  const sleep = async (ms: number) => {
    if (!opts.dryRun) await sleepFor(ms, now);
  };

  try {
    // The CLOSED gameweek is the one whose matches are being played. If the next gameweek
    // is already open, the previous one may still be the closed one.
    const config = await getConfig();
    const current = config?.currentGameweek ?? 0;
    let gw: GameweekSummary | null = null;
    for (const id of [current, current - 1]) {
      if (id < 1) continue;
      const candidate = await getGameweek(id);
      if (candidate?.status === "closed") {
        gw = candidate;
        break;
      }
    }
    if (!gw) {
      await sleep(NO_CLOSED_GW_SLEEP_MS);
      return { action: "skipped", reason: "no_closed_gameweek", detail: { currentGameweek: current } };
    }
    const gameweekId = gw.id;

    // A committed hash must stay byte-identical to the published file — hands off.
    let committed: unknown;
    try {
      committed = await getStatsCommit(gameweekId);
    } catch (e) {
      await sleep(BACKOFF_MS);
      return {
        action: "refused",
        gameweekId,
        reason: "could_not_verify_onchain_commit",
        detail: { error: e instanceof Error ? e.message : String(e) },
      };
    }
    if (committed) {
      await sleep(COMMITTED_SLEEP_MS);
      return { action: "skipped", reason: "stats_committed_on_chain", detail: { gameweekId } };
    }

    const state = await readState(gameweekId);
    const refuse = async (
      reason: string,
      detail?: Record<string, unknown>,
    ): Promise<AutoPublishResult> => {
      await sleep(BACKOFF_MS);
      console.error("autoPublishStats refused:", reason, detail);
      return { action: "refused", gameweekId, reason, detail };
    };

    // 1 API-Sports request: status + kickoff of every fixture in the round.
    const listed = await listRoundFixtures(apiKey, gameweekId);
    if (listed.error) return refuse("fixtures_list_failed", { error: listed.error });

    const finishedIds = listed.fixtures.filter((f) => isFinishedStatus(f.short)).map((f) => f.id);
    const plan = planRefresh(state, finishedIds, now);
    const nextPollInMs = planNextPoll(listed.fixtures, plan.nextState.seen, now);

    if (finishedIds.length === 0) {
      await sleep(nextPollInMs);
      return { action: "skipped", reason: "no_finished_fixtures", detail: { gameweekId, nextPollInMs } };
    }
    if (!opts.force && !plan.shouldPublish) {
      await sleep(nextPollInMs);
      return {
        action: "skipped",
        reason: "nothing_new",
        detail: { gameweekId, finished: finishedIds.length, nextPollInMs },
      };
    }

    // Fresh catalog every run (the browser-side map cache lives as long as the instance).
    resetPlayerMappingsCache();
    const fetched = await fetchGameweekStats(apiKey, gameweekId, `${opts.origin}/api/players`);

    // Isolated unmapped players are a warning (the admin also lets you publish past it);
    // anything else, or a flood of them, is a refusal.
    const warnings: string[] = [];
    const hardErrors: string[] = [];
    let unmappedCount = 0;
    for (const e of fetched.errors) {
      const m = UNMAPPED_RE.exec(e);
      if (m) {
        unmappedCount += Number(m[1]);
        warnings.push(e);
      } else {
        hardErrors.push(e);
      }
    }
    if (hardErrors.length > 0) return refuse("fetch_errors", { errors: hardErrors });
    if (unmappedCount > MAX_UNMAPPED_PLAYERS) {
      return refuse("too_many_unmapped_players", { unmappedCount, errors: warnings });
    }
    if (fetched.players.length === 0) return refuse("no_players");

    const canonical = buildCanonicalStatsJson(
      gameweekId,
      fetched.players as unknown as Record<string, unknown>[],
    );
    const rows = countPublishedRows(canonical);
    const existing = await readOracleStatsJson(gameweekId);
    const previousRows = countPublishedRows(existing);

    if (!opts.force && rows < previousRows) {
      return refuse("would_shrink_published_rows", { previousRows, rows });
    }

    const audit = await runAudit(gameweekId, fetched.players, opts.origin);

    if (opts.dryRun) {
      return {
        action: "dry_run",
        gameweekId,
        rows,
        previousRows,
        reasons: plan.reasons,
        fixtures: fetched.fixtures,
        warnings,
        nextPollInMs,
        audit: audit.text,
        auditBlocking: audit.blocking,
      };
    }

    const unchanged = existing === canonical;
    if (!unchanged) {
      await writeOracleStatsJson(gameweekId, canonical);
    }
    await writeState(gameweekId, plan.nextState);
    await sleep(nextPollInMs);

    if (!unchanged) {
      // Only name fixtures that triggered this tick (new FT, else rechecks) — not the whole slate.
      const alertFixtures = labelsForPublishAlert(plan.reasons, listed.fixtures);
      void import("@/lib/server/telegram/notifyStatsUpdate")
        .then(({ notifyStatsUpdate }) =>
          notifyStatsUpdate({
            gameweekId,
            fixtures: alertFixtures,
            contentChanged: true,
          }),
        )
        .catch((err) => console.warn("autoPublishStats: telegram notify failed", err));
    }

    return {
      action: "published",
      gameweekId,
      rows,
      previousRows,
      reasons: unchanged ? [...plan.reasons, "content identical — nothing rewritten"] : plan.reasons,
      fixtures: fetched.fixtures,
      warnings,
      nextPollInMs,
      audit: audit.text,
      auditBlocking: audit.blocking,
    };
  } finally {
    await releaseLock();
  }
}
