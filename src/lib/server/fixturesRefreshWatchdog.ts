/**
 * Traffic-triggered backup for fixtures cache refresh (same pattern as
 * autoPublishStatsWatchdog). GitHub schedule can lag; visitors should not.
 */
import { Redis } from "@upstash/redis";

const LOCK_KEY = "fpl:fixtures:poke-lock";
const THROTTLE_SEC = 90;
const DEFAULT_URL = "https://www.form8.football/api/cron/refresh-fixtures";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

let memoryLockUntil = 0;

async function acquireThrottle(nowMs: number): Promise<boolean> {
  if (redis) {
    try {
      return (await redis.set(LOCK_KEY, String(nowMs), { nx: true, ex: THROTTLE_SEC })) === "OK";
    } catch (error) {
      console.warn("fixtures refresh watchdog: redis lock failed", error);
    }
  }
  if (nowMs < memoryLockUntil) return false;
  memoryLockUntil = nowMs + THROTTLE_SEC * 1000;
  return true;
}

async function tryPoke(): Promise<void> {
  if (process.env.AUTO_REFRESH_FIXTURES_ENABLED === "false") return;
  if (process.env.VERCEL_ENV !== "production") return;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;
  if (!(await acquireThrottle(Date.now()))) return;

  const url = process.env.AUTO_REFRESH_FIXTURES_URL?.trim() || DEFAULT_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) console.warn("fixtures refresh watchdog: cron answered", res.status);
  else console.info("fixtures refresh watchdog: poked →", res.status);
}

function waitUntilCompat(promise: Promise<unknown>): void {
  type Ctx = { waitUntil?: (p: Promise<unknown>) => void };
  const holder = (globalThis as Record<symbol, { get?: () => Ctx | undefined } | undefined>)[
    Symbol.for("@vercel/request-context")
  ];
  holder?.get?.()?.waitUntil?.(promise);
}

export function pokeFixturesRefreshWatchdog(): void {
  const work = tryPoke().catch((error) => {
    console.warn("fixtures refresh watchdog failed:", error);
  });
  waitUntilCompat(work);
}
