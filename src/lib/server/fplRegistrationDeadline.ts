/**
 * Resolve registration deadline for an FPL gameweek id (= on-chain gameweek id for EPL).
 * Same rule as `/api/fixtures`: registration closes at the FIRST KICKOFF of the event.
 *
 * SAFETY RULE (GW7 incident, 2026-10-17): the FPL bootstrap `deadline_time` is ~90 min
 * EARLIER than first kickoff. When the live FPL fetch failed, we used to fall back to it
 * and the gameweek was closed ~11 min before kickoff while people were still registering.
 * So every result now carries `authoritative`:
 *   - true  → first kickoff confirmed by a live FPL fetch (`first_kickoff`) or the last
 *             such confirmed value remembered for this gameweek (`cached_kickoff`).
 *   - false → best-effort display value only (`snapshot_kickoff`, `fpl_deadline_time`,
 *             `none`). NEVER close a gameweek or reject a registration based on it.
 */
import { Redis } from "@upstash/redis";
import bootstrapLite from "@/data/fpl-bootstrap-lite.json";
import fixturesSnapshot from "@/data/fpl-fixtures-snapshot.json";

const FPL_FIXTURES = "https://fantasy.premierleague.com/api/fixtures/";

/**
 * Same browser-like headers that `/api/fixtures` uses successfully. A custom
 * "compatible; FORM8-auto-close" User-Agent is the likely reason FPL started refusing
 * this request from Vercel on GW7 kickoff day.
 */
const FETCH_INIT: RequestInit = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://fantasy.premierleague.com/",
    Origin: "https://fantasy.premierleague.com",
  },
  cache: "no-store",
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5_000;
const CACHE_TTL_SEC = 14 * 24 * 3600;
const cacheKey = (gameweekId: number) => `reg-deadline:first-kick:${gameweekId}`;

export type RegistrationDeadlineSource =
  | "first_kickoff"
  | "cached_kickoff"
  | "snapshot_kickoff"
  | "fpl_deadline_time"
  | "none";

export type RegistrationDeadline = {
  gameweekId: number;
  deadlineEpochMs: number | null;
  deadlineSource: RegistrationDeadlineSource;
  deadlineIso: string | null;
  /** True only when `deadlineEpochMs` is a confirmed first-kickoff time. Safe to act on. */
  authoritative: boolean;
};

export type ResolveOptions = {
  /** Live FPL attempts before falling back (default 3). */
  attempts?: number;
  /** Per-attempt timeout in ms (default 5000). */
  timeoutMs?: number;
};

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

/** Per-instance memory of the last live-confirmed first kickoff (backs up Redis). */
const lastConfirmed = new Map<number, number>();

async function readConfirmed(gameweekId: number): Promise<number | null> {
  if (redis) {
    try {
      const raw = await redis.get<string | number>(cacheKey(gameweekId));
      const n = Number(raw);
      if (raw != null && Number.isFinite(n) && n > 0) return n;
    } catch (error) {
      console.warn("registration-deadline: redis read failed", error);
    }
  }
  return lastConfirmed.get(gameweekId) ?? null;
}

async function writeConfirmed(gameweekId: number, ms: number): Promise<void> {
  lastConfirmed.set(gameweekId, ms);
  if (!redis) return;
  try {
    await redis.set(cacheKey(gameweekId), String(ms), { ex: CACHE_TTL_SEC });
  } catch (error) {
    console.warn("registration-deadline: redis write failed", error);
  }
}

function firstKickFromRows(
  rows: Array<{ event?: number | null; kickoff_time?: string | null }>,
  gameweekId: number,
): number | null {
  const kicks = rows
    .filter((r) => r.event === gameweekId && typeof r.kickoff_time === "string")
    .map((r) => Date.parse(r.kickoff_time as string))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
  return kicks.length > 0 ? kicks[0]! : null;
}

/** Live first kickoff from FPL; retries transient failures and logs the real reason. */
async function fetchLiveFirstKick(
  gameweekId: number,
  attempts: number,
  timeoutMs: number,
): Promise<number | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(`${FPL_FIXTURES}?event=${gameweekId}`, {
        ...FETCH_INIT,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          event?: number | null;
          kickoff_time?: string | null;
        }>;
        const first = firstKickFromRows(rows, gameweekId);
        if (first != null) return first;
        // 200 but no kickoff times published for this event: retrying will not help.
        console.warn(`registration-deadline: FPL returned no kickoff times (gw ${gameweekId})`);
        return null;
      }
      console.warn(
        `registration-deadline: FPL fixtures HTTP ${res.status} (gw ${gameweekId}, attempt ${attempt}/${attempts})`,
      );
    } catch (error) {
      console.warn(
        `registration-deadline: FPL fixtures fetch failed (gw ${gameweekId}, attempt ${attempt}/${attempts})`,
        error instanceof Error ? error.message : error,
      );
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, 300 * attempt));
  }
  return null;
}

function result(
  gameweekId: number,
  ms: number | null,
  source: RegistrationDeadlineSource,
  authoritative: boolean,
): RegistrationDeadline {
  return {
    gameweekId,
    deadlineEpochMs: ms,
    deadlineSource: source,
    deadlineIso: ms != null ? new Date(ms).toISOString() : null,
    authoritative,
  };
}

export async function resolveRegistrationDeadline(
  gameweekId: number,
  opts: ResolveOptions = {},
): Promise<RegistrationDeadline> {
  const attempts = Math.max(1, opts.attempts ?? DEFAULT_ATTEMPTS);
  const timeoutMs = Math.max(500, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  // 1. Live FPL — authoritative; remember it for when FPL is unreachable later.
  const live = await fetchLiveFirstKick(gameweekId, attempts, timeoutMs);
  if (live != null) {
    await writeConfirmed(gameweekId, live);
    return result(gameweekId, live, "first_kickoff", true);
  }

  // 2. Last live-confirmed first kickoff for this gameweek — still authoritative.
  const confirmed = await readConfirmed(gameweekId);
  if (confirmed != null) {
    console.warn(
      `registration-deadline: live FPL unavailable, using last confirmed first kickoff (gw ${gameweekId})`,
    );
    return result(gameweekId, confirmed, "cached_kickoff", true);
  }

  // 3. Shipped fixtures snapshot — display only (can be stale after reschedules).
  const snapFirst = firstKickFromRows(
    (fixturesSnapshot as { fixtures: Array<{ event?: number | null; kickoff_time?: string | null }> })
      .fixtures ?? [],
    gameweekId,
  );
  if (snapFirst != null) return result(gameweekId, snapFirst, "snapshot_kickoff", false);

  // 4. FPL official deadline (~90 min before first kickoff) — display only, NEVER authoritative.
  const ev = (bootstrapLite.events as Array<{ id: number; deadline_time?: string | null }>).find(
    (e) => e.id === gameweekId,
  );
  const raw = ev?.deadline_time;
  const ms = typeof raw === "string" && raw.length > 0 ? Date.parse(raw) : NaN;
  if (Number.isFinite(ms)) return result(gameweekId, ms, "fpl_deadline_time", false);

  return result(gameweekId, null, "none", false);
}
