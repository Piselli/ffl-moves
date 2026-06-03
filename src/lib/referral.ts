/**
 * Referral tracking — server side.
 *
 * Persistence: Upstash Redis (REST) when `UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN` are set (Vercel-friendly, free tier). Falls back to
 * a process-local in-memory store so local dev works with zero setup. The
 * in-memory store is NOT durable on serverless (resets per cold start / instance)
 * — set the Upstash env vars in production.
 *
 * Data model (Redis keys):
 *   ref:codes                  SET    — every referral code we've seen
 *   ref:clicks:<code>          STRING — total link clicks (INCR)
 *   ref:wallets:<code>         SET    — wallets that converted (dedupe → unique signups)
 *   ref:last:<code>            STRING — last activity timestamp (ms)
 *   ref:firstseen:<code>       STRING — first activity timestamp (ms)
 */
import { Redis } from "@upstash/redis";

export type ReferralStat = {
  code: string;
  clicks: number;
  signups: number;
  conversionRate: number; // signups / clicks, 0..1
  firstSeen: number | null;
  lastActivity: number | null;
};

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

/** Whether durable storage is configured. Surfaced in the admin dashboard. */
export function isReferralStoreDurable(): boolean {
  return hasUpstash;
}

/** Normalize a referral code: lowercase, trim, strict charset, capped length. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return code.length >= 1 ? code : null;
}

function normalizeWallet(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const w = raw.trim().toLowerCase();
  if (!/^0x[0-9a-f]{1,64}$/.test(w)) return null;
  return w;
}

// ── In-memory fallback ──────────────────────────────────────────────────────
// Stored on `globalThis` so it's shared across Next.js route bundles within the
// same Node process (each API route is its own bundle and would otherwise get a
// separate module instance). Still NOT durable across serverless cold starts —
// set the Upstash env vars in production.
type MemEntry = { clicks: number; wallets: Set<string>; first: number; last: number };
const globalForRef = globalThis as unknown as { __fflRefMem?: Map<string, MemEntry> };
const mem: Map<string, MemEntry> = globalForRef.__fflRefMem ?? new Map<string, MemEntry>();
globalForRef.__fflRefMem = mem;

function memEntry(code: string): MemEntry {
  let e = mem.get(code);
  if (!e) {
    e = { clicks: 0, wallets: new Set(), first: Date.now(), last: Date.now() };
    mem.set(code, e);
  }
  return e;
}

const CODES_KEY = "ref:codes";
const k = {
  clicks: (c: string) => `ref:clicks:${c}`,
  wallets: (c: string) => `ref:wallets:${c}`,
  last: (c: string) => `ref:last:${c}`,
  first: (c: string) => `ref:firstseen:${c}`,
};

/** Record a link click for `code`. Returns silently on bad input. */
export async function recordClick(code: string): Promise<void> {
  const now = Date.now();
  if (redis) {
    const p = redis.pipeline();
    p.sadd(CODES_KEY, code);
    p.incr(k.clicks(code));
    p.set(k.last(code), now);
    p.setnx(k.first(code), now);
    await p.exec();
    return;
  }
  const e = memEntry(code);
  e.clicks += 1;
  e.last = now;
}

/**
 * Record a conversion (successful on-chain registration) attributed to `code`.
 * Deduped per wallet, so re-registering the same wallet doesn't inflate signups.
 */
export async function recordConversion(code: string, wallet: string | null): Promise<void> {
  const now = Date.now();
  const w = normalizeWallet(wallet) ?? `anon:${now}`;
  if (redis) {
    const p = redis.pipeline();
    p.sadd(CODES_KEY, code);
    p.sadd(k.wallets(code), w);
    p.set(k.last(code), now);
    p.setnx(k.first(code), now);
    await p.exec();
    return;
  }
  const e = memEntry(code);
  e.wallets.add(w);
  e.last = now;
}

/** All referral codes, with click/signup counters. Sorted by signups desc, then clicks desc. */
export async function getStats(): Promise<ReferralStat[]> {
  let codes: string[];
  if (redis) {
    codes = (await redis.smembers(CODES_KEY)) ?? [];
  } else {
    codes = Array.from(mem.keys());
  }

  const stats: ReferralStat[] = await Promise.all(
    codes.map(async (code) => {
      if (redis) {
        const p = redis.pipeline();
        p.get<number>(k.clicks(code));
        p.scard(k.wallets(code));
        p.get<number>(k.first(code));
        p.get<number>(k.last(code));
        const [clicksRaw, signupsRaw, firstRaw, lastRaw] = await p.exec<
          [number | null, number | null, number | null, number | null]
        >();
        const clicks = Number(clicksRaw ?? 0);
        const signups = Number(signupsRaw ?? 0);
        return {
          code,
          clicks,
          signups,
          conversionRate: clicks > 0 ? signups / clicks : 0,
          firstSeen: firstRaw != null ? Number(firstRaw) : null,
          lastActivity: lastRaw != null ? Number(lastRaw) : null,
        };
      }
      const e = memEntry(code);
      return {
        code,
        clicks: e.clicks,
        signups: e.wallets.size,
        conversionRate: e.clicks > 0 ? e.wallets.size / e.clicks : 0,
        firstSeen: e.first,
        lastActivity: e.last,
      };
    }),
  );

  return stats.sort((a, b) => b.signups - a.signups || b.clicks - a.clicks);
}
