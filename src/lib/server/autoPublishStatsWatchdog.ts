/**
 * Traffic-triggered backup for auto-publishing stats (same idea as autoCloseWatchdog:
 * GitHub `schedule` on this repo can run hours late, real visitors cannot).
 *
 * A hot public route pokes this; at most once per THROTTLE_SEC it sends one small request to
 * the cron route (which does the heavy work in its own invocation, with its own time limit).
 * Production only — a dev machine or preview deployment must never call the live cron.
 */
import { Redis } from "@upstash/redis";

const LOCK_KEY = "oracle:autopublish:poke-lock";
const THROTTLE_SEC = 60;
const DEFAULT_URL = "https://www.form8.football/api/cron/publish-stats";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() && !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

let memoryLockUntil = 0;

async function acquireThrottle(nowMs: number): Promise<boolean> {
  if (redis) {
    try {
      return (await redis.set(LOCK_KEY, String(nowMs), { nx: true, ex: THROTTLE_SEC })) === "OK";
    } catch (error) {
      console.warn("auto-publish watchdog: redis lock failed", error);
    }
  }
  if (nowMs < memoryLockUntil) return false;
  memoryLockUntil = nowMs + THROTTLE_SEC * 1000;
  return true;
}

async function tryPoke(): Promise<void> {
  if (process.env.AUTO_PUBLISH_STATS_ENABLED === "false") return;
  if (process.env.VERCEL_ENV !== "production") return;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;
  if (!(await acquireThrottle(Date.now()))) return;

  const url = process.env.AUTO_PUBLISH_URL?.trim() || DEFAULT_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) console.warn("auto-publish watchdog: cron route answered", res.status);
  else console.info("auto-publish watchdog: poked cron route →", res.status);
}

/**
 * On Vercel a serverless function is frozen as soon as its response is sent, so a bare
 * fire-and-forget promise never finishes (GW7 live test: 19 /api/fixtures hits, zero pokes).
 * `waitUntil` keeps the invocation alive until the promise settles. This is the same hook
 * `@vercel/functions` uses; outside Vercel (dev/tests) there is no context and we just let
 * the promise run.
 */
function waitUntilCompat(promise: Promise<unknown>): void {
  type Ctx = { waitUntil?: (p: Promise<unknown>) => void };
  const holder = (globalThis as Record<symbol, { get?: () => Ctx | undefined } | undefined>)[
    Symbol.for("@vercel/request-context")
  ];
  holder?.get?.()?.waitUntil?.(promise);
}

/** Never await from a request path; the work is registered with waitUntil. */
export function pokeAutoPublishStatsWatchdog(): void {
  const work = tryPoke().catch((error) => {
    console.warn("auto-publish watchdog failed:", error);
  });
  waitUntilCompat(work);
}
