/**
 * Traffic-triggered auto-close backup.
 *
 * GitHub Actions `schedule` on this repo often runs hours apart (not every
 * 5 minutes as declared), so kickoff-time closes can miss. Any hot public API
 * can poke this watchdog: at most once per LOCK_TTL_SEC it runs the same close
 * path as the cron. Safe after deadline only — `runAutoCloseGameweek` no-ops
 * when early / closed.
 */
import { Redis } from "@upstash/redis";
import { runAutoCloseGameweek } from "@/lib/server/autoCloseGameweek";

const LOCK_KEY = "auto-close:watchdog:lock";
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
      // Upstash returns "OK" when set, null when NX misses.
      return ok === "OK";
    } catch (error) {
      console.warn("auto-close watchdog: redis lock failed", error);
      // Fall through to memory lock so a Redis blip does not disable closes.
    }
  }
  if (nowMs < memoryLockUntil) return false;
  memoryLockUntil = nowMs + LOCK_TTL_SEC * 1000;
  return true;
}

async function tryAutoCloseWatchdog(): Promise<void> {
  if (process.env.AUTO_CLOSE_ENABLED === "false") return;
  if (!(await acquireLock(Date.now()))) return;

  const result = await runAutoCloseGameweek();
  if (result.action === "closed") {
    console.info("auto-close watchdog closed gameweek", {
      gameweekId: result.gameweekId,
      signature: result.signature,
      deadlineIso: result.deadlineIso,
    });
  } else if (result.action === "skipped" && result.reason === "before_deadline") {
    // Quiet — expected for most pokes.
  } else {
    console.info("auto-close watchdog", result.action, result);
  }
}

/** Fire-and-forget; never await from a request path. */
export function pokeAutoCloseWatchdog(): void {
  void tryAutoCloseWatchdog().catch((error) => {
    console.warn("auto-close watchdog failed:", error);
  });
}
