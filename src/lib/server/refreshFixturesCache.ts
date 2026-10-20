/**
 * Pull live FPL fixture rows for the active on-chain gameweek and store them
 * in Redis. Runs from `/api/cron/refresh-fixtures` (GH schedule + traffic poke).
 */
import { findActiveGameweek, findOpenGameweek } from "@/lib/chainClient";
import {
  writeFixturesCache,
  type CachedFixtureRow,
  type FixturesCachePayload,
} from "@/lib/server/fixturesCacheStore";

const FPL_FIXTURES = "https://fantasy.premierleague.com/api/fixtures/";

const FPL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

export type RefreshFixturesResult =
  | {
      action: "refreshed";
      gameweekId: number;
      rows: number;
      durable: boolean;
      alsoRefreshed?: number[];
    }
  | { action: "skipped"; reason: string }
  | { action: "failed"; reason: string; detail?: string };

async function fetchEventRows(eventId: number): Promise<CachedFixtureRow[] | null> {
  try {
    const res = await fetch(`${FPL_FIXTURES}?event=${eventId}`, {
      headers: FPL_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const parsed = (await res.json()) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((row) => {
      const f = row as CachedFixtureRow;
      return {
        id: f.id,
        event: f.event,
        kickoff_time: f.kickoff_time ?? null,
        team_h: f.team_h,
        team_a: f.team_a,
        finished: Boolean(f.finished),
        started: Boolean(f.started),
        team_h_score: f.team_h_score ?? null,
        team_a_score: f.team_a_score ?? null,
      };
    });
  } catch (e) {
    console.warn(
      "refreshFixturesCache: FPL fetch failed",
      eventId,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function persist(gameweekId: number, fixtures: CachedFixtureRow[], setPointer: boolean) {
  const payload: FixturesCachePayload = {
    gameweekId,
    fetchedAt: new Date().toISOString(),
    source: "fpl",
    fixtures,
  };
  return writeFixturesCache(payload, { setPointer });
}

/**
 * Resolve the tour whose fixtures should stay fresh on the homepage:
 * prefer OPEN registration, else config.current (closed mid-round).
 */
async function resolveTargetGameweekId(): Promise<number | null> {
  const open = await findOpenGameweek().catch(() => null);
  if (open?.id && open.id >= 1) return open.id;
  const active = await findActiveGameweek().catch(() => null);
  if (active?.id && active.id >= 1) return active.id;
  return null;
}

export async function runRefreshFixturesCache(opts?: {
  gameweekId?: number;
  dryRun?: boolean;
}): Promise<RefreshFixturesResult> {
  if (process.env.AUTO_REFRESH_FIXTURES_ENABLED === "false") {
    return { action: "skipped", reason: "disabled" };
  }

  const gameweekId =
    opts?.gameweekId != null && Number.isFinite(opts.gameweekId) && opts.gameweekId >= 1
      ? opts.gameweekId
      : await resolveTargetGameweekId();

  if (gameweekId == null) {
    return { action: "skipped", reason: "no_active_gameweek" };
  }

  const rows = await fetchEventRows(gameweekId);
  if (!rows?.length) {
    return {
      action: "failed",
      reason: "fpl_empty",
      detail: `No FPL rows for event ${gameweekId}`,
    };
  }

  if (opts?.dryRun) {
    return {
      action: "refreshed",
      gameweekId,
      rows: rows.length,
      durable: false,
    };
  }

  const durable = await persist(gameweekId, rows, true);
  if (!durable) {
    return {
      action: "failed",
      reason: "redis_unavailable",
      detail: "Upstash not configured or write failed",
    };
  }

  // Keep the previous GW warm while scores settle (BPS lag after FT).
  const alsoRefreshed: number[] = [];
  if (gameweekId > 1) {
    const prev = await fetchEventRows(gameweekId - 1);
    if (prev?.length) {
      const ok = await persist(gameweekId - 1, prev, false);
      if (ok) alsoRefreshed.push(gameweekId - 1);
    }
  }

  return {
    action: "refreshed",
    gameweekId,
    rows: rows.length,
    durable: true,
    alsoRefreshed: alsoRefreshed.length ? alsoRefreshed : undefined,
  };
}
