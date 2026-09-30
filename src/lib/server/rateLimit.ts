/**
 * Shared fixed-window counters for abuse protection (sponsor relay, RPC proxy, ...).
 *
 * Durable + global when Upstash Redis is configured (UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN) — this is what actually works on Vercel, where every
 * serverless instance has its own memory. Without Upstash (local dev) or when
 * Redis errors, it degrades to a per-process in-memory counter so the app keeps
 * working instead of failing closed.
 */
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const redis: Redis | null = hasUpstash ? Redis.fromEnv() : null;

export function isDurableLimiterConfigured(): boolean {
  return hasUpstash;
}

type MemBucket = { count: number; resetAt: number };
const mem = new Map<string, MemBucket>();

function memGc(): void {
  if (mem.size < 2000) return;
  const now = Date.now();
  for (const [k, v] of mem) {
    if (now >= v.resetAt) mem.delete(k);
  }
}

function memPeek(key: string): { count: number; retryAfterSec: number } {
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || now >= cur.resetAt) return { count: 0, retryAfterSec: 0 };
  return { count: cur.count, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
}

function memIncr(
  key: string,
  by: number,
  windowSec: number,
): { count: number; retryAfterSec: number } {
  memGc();
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || now >= cur.resetAt) {
    mem.set(key, { count: by, resetAt: now + windowSec * 1000 });
    return { count: by, retryAfterSec: windowSec };
  }
  cur.count += by;
  return { count: cur.count, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
}

/** Increment a window counter by `by` and return the new count. */
export async function incrWindow(
  key: string,
  windowSec: number,
  by = 1,
): Promise<{ count: number; retryAfterSec: number }> {
  const k = `rl:${key}`;
  if (redis) {
    try {
      const res = await redis.pipeline().incrby(k, by).ttl(k).exec<[number, number]>();
      const count = Number(res[0]);
      let ttl = Number(res[1]);
      if (!Number.isFinite(ttl) || ttl < 0) {
        // First hit in the window (or a key that lost its TTL): (re)arm the expiry.
        await redis.expire(k, windowSec);
        ttl = windowSec;
      }
      return { count, retryAfterSec: Math.max(1, ttl) };
    } catch (err) {
      console.warn("[rateLimit] Redis incr failed, using in-memory fallback:", err);
    }
  }
  return memIncr(k, by, windowSec);
}

/** Read a window counter without changing it. */
export async function peekWindow(
  key: string,
): Promise<{ count: number; retryAfterSec: number }> {
  const k = `rl:${key}`;
  if (redis) {
    try {
      const res = await redis.pipeline().get(k).ttl(k).exec<[number | string | null, number]>();
      const count = Number(res[0] ?? 0);
      const ttl = Number(res[1]);
      return {
        count: Number.isFinite(count) ? count : 0,
        retryAfterSec: Math.max(1, Number.isFinite(ttl) && ttl > 0 ? ttl : 60),
      };
    } catch (err) {
      console.warn("[rateLimit] Redis peek failed, using in-memory fallback:", err);
    }
  }
  return memPeek(k);
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** Count one attempt against `limit` per `windowSec`. */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const { count, retryAfterSec } = await incrWindow(key, windowSec, 1);
  if (count > limit) return { ok: false, retryAfterSec };
  return { ok: true };
}
