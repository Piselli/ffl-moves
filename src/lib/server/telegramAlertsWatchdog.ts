/**
 * Traffic-triggered Telegram alerts backup.
 *
 * GitHub `schedule` for telegram-alerts is often delayed hours (same as auto-close).
 * Hot public routes poke this watchdog: at most once per LOCK_TTL_SEC it runs the
 * same path as `/api/cron/telegram-alerts`. Idempotent via Redis alert slots.
 */
import { Redis } from "@upstash/redis";
import { runTelegramAlerts } from "@/lib/server/telegram/runAlerts";
import { telegramConfigured } from "@/lib/server/telegram/api";

const LOCK_KEY = "tg:alerts:watchdog:lock";
/** Global throttle — one attempt per minute across all instances. */
const LOCK_TTL_SEC = 60;

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const redis = hasUpstash ? Redis.fromEnv() : null;

let memoryLockUntil = 0;

async function acquireLock(nowMs: number): Promise<boolean> {
  if (redis) {
    try {
      const ok = await redis.set(LOCK_KEY, String(nowMs), {
        nx: true,
        ex: LOCK_TTL_SEC,
      });
      return ok === "OK";
    } catch (error) {
      console.warn("telegram-alerts watchdog: redis lock failed", error);
    }
  }
  if (nowMs < memoryLockUntil) return false;
  memoryLockUntil = nowMs + LOCK_TTL_SEC * 1000;
  return true;
}

async function tryTelegramAlertsWatchdog(): Promise<void> {
  if (!telegramConfigured()) return;
  if (!(await acquireLock(Date.now()))) return;

  const result = await runTelegramAlerts();
  if (result.fired.length > 0) {
    console.info(
      "telegram-alerts watchdog fired",
      result.fired.map((f) => `${f.kind}:${f.gameweekId}`),
      `subs=${result.subscribers}`,
    );
  }
}

/** Fire-and-forget; never await from a request path. */
export function pokeTelegramAlertsWatchdog(): void {
  void tryTelegramAlertsWatchdog().catch((error) => {
    console.warn("telegram-alerts watchdog failed:", error);
  });
}
