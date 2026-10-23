/**
 * Traffic-triggered Telegram alerts backup.
 *
 * GitHub `schedule` for telegram-alerts is often delayed hours (same as auto-close).
 * Hot public routes poke this watchdog: at most once per THROTTLE_SEC it hits
 * `/api/cron/telegram-alerts` in its own invocation. Idempotent via Redis alert slots.
 *
 * Do NOT run `runTelegramAlerts` in this request. On Vercel the isolate freezes as
 * soon as the response is sent; a fire-and-forget FPL+RPC+broadcast never finishes
 * (same GW7 finding as auto-publish: many /api/fixtures hits, zero pokes).
 */
import { Redis } from "@upstash/redis";
import { waitUntilCompat } from "@/lib/server/waitUntilCompat";

const LOCK_KEY = "tg:alerts:watchdog:lock";
/** Global throttle — one poke per minute across all instances. */
const THROTTLE_SEC = 60;
const DEFAULT_URL = "https://www.form8.football/api/cron/telegram-alerts";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const redis = hasUpstash ? Redis.fromEnv() : null;

let memoryLockUntil = 0;

async function acquireThrottle(nowMs: number): Promise<boolean> {
  if (redis) {
    try {
      const ok = await redis.set(LOCK_KEY, String(nowMs), {
        nx: true,
        ex: THROTTLE_SEC,
      });
      return ok === "OK";
    } catch (error) {
      console.warn("telegram-alerts watchdog: redis lock failed", error);
    }
  }
  if (nowMs < memoryLockUntil) return false;
  memoryLockUntil = nowMs + THROTTLE_SEC * 1000;
  return true;
}

async function tryPoke(): Promise<void> {
  if (process.env.TELEGRAM_ALERTS_ENABLED === "false") return;
  if (process.env.VERCEL_ENV !== "production") return;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;
  if (!(await acquireThrottle(Date.now()))) return;

  const url = process.env.TELEGRAM_ALERTS_URL?.trim() || DEFAULT_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    console.warn("telegram-alerts watchdog: cron answered", res.status);
    return;
  }
  try {
    const data = (await res.json()) as {
      fired?: Array<{ kind?: string }>;
      chaining?: boolean;
    };
    const fired = (data.fired ?? []).map((f) => f.kind).filter(Boolean);
    if (fired.length > 0) {
      console.info("telegram-alerts watchdog fired", fired);
    } else if (data.chaining) {
      console.info("telegram-alerts watchdog: deadline chain armed");
    }
  } catch {
    console.info("telegram-alerts watchdog: poked cron route →", res.status);
  }
}

/** Never await from a request path; the work is registered with waitUntil. */
export function pokeTelegramAlertsWatchdog(): void {
  const work = tryPoke().catch((error) => {
    console.warn("telegram-alerts watchdog failed:", error);
  });
  waitUntilCompat(work);
}
