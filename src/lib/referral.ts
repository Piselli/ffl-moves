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
 *   ref:fees:<code>            STRING — estimated USDC fee volume (INCRBYFLOAT)
 *   ref:last:<code>            STRING — last activity timestamp (ms)
 *   ref:firstseen:<code>       STRING — first activity timestamp (ms)
 *   ref:camps:<code>           SET    — campaign slugs seen for this code
 *   ref:camp:clicks:<code>:<c> STRING — clicks per campaign
 *   ref:camp:wallets:<code>:<c> SET   — wallets per campaign
 *   ref:camp:fees:<code>:<c>   STRING — fee volume per campaign
 *   ref:camp:first/last:…      STRING — timestamps
 *   ref:wallet_camp:<code>     HASH   — wallet → campaign (first conversion win)
 */
import { Redis } from "@upstash/redis";
import { normalizeWallet } from "@/lib/walletNormalize";

/** Empty string = bare `?ref=` with no `&c=` campaign. */
export const DEFAULT_CAMPAIGN = "";

export type ReferralStat = {
  code: string;
  clicks: number;
  signups: number;
  conversionRate: number; // signups / clicks, 0..1
  firstSeen: number | null;
  lastActivity: number | null;
  /** Estimated entry-fee volume in USDC (signups × fee), for manual partner payouts. */
  estimatedFeeVolumeUsdc: number;
};

export type ReferralCampaignStat = ReferralStat & {
  campaign: string;
};

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

/** Last error from a Redis call (surfaced in the dashboard for debugging). */
let lastRedisError: string | null = null;

/** Whether durable storage is configured (env vars present). */
export function isReferralStoreDurable(): boolean {
  return hasUpstash;
}

/**
 * Run a Redis operation, capturing failures instead of throwing so callers can
 * gracefully fall back to the in-memory store.
 */
async function tryRedis<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  if (!redis) return { ok: false };
  try {
    const value = await fn();
    lastRedisError = null;
    return { ok: true, value };
  } catch (e) {
    lastRedisError = e instanceof Error ? e.message : String(e);
    return { ok: false };
  }
}

/** Health probe for the admin dashboard: is Redis configured and actually reachable? */
export async function getReferralHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  error: string | null;
}> {
  if (!redis) return { configured: false, reachable: false, error: null };
  try {
    await redis.ping();
    return { configured: true, reachable: true, error: null };
  } catch (e) {
    return { configured: true, reachable: false, error: e instanceof Error ? e.message : String(e) };
  }
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

/**
 * Campaign slug for `?c=` / `?camp=`. Allows letters (incl. Cyrillic), digits,
 * `_` / `-`; spaces become `-`. Empty / missing → default (bare ref link).
 */
export function normalizeCampaign(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_CAMPAIGN;
  const camp = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 48);
  return camp;
}

// ── In-memory fallback ──────────────────────────────────────────────────────
// Stored on `globalThis` so it's shared across Next.js route bundles within the
// same Node process (each API route is its own bundle and would otherwise get a
// separate module instance). Still NOT durable across serverless cold starts —
// set the Upstash env vars in production.
type MemCamp = {
  clicks: number;
  wallets: Set<string>;
  first: number;
  last: number;
  feeVolumeUsdc: number;
};
type MemEntry = {
  clicks: number;
  wallets: Set<string>;
  first: number;
  last: number;
  feeVolumeUsdc: number;
  camps: Map<string, MemCamp>;
  walletCamp: Map<string, string>;
};
const globalForRef = globalThis as unknown as { __fflRefMem?: Map<string, MemEntry> };
const mem: Map<string, MemEntry> = globalForRef.__fflRefMem ?? new Map<string, MemEntry>();
globalForRef.__fflRefMem = mem;

function memEntry(code: string): MemEntry {
  let e = mem.get(code);
  if (!e) {
    e = {
      clicks: 0,
      wallets: new Set(),
      first: Date.now(),
      last: Date.now(),
      feeVolumeUsdc: 0,
      camps: new Map(),
      walletCamp: new Map(),
    };
    mem.set(code, e);
  }
  return e;
}

function memCamp(e: MemEntry, campaign: string): MemCamp {
  let c = e.camps.get(campaign);
  if (!c) {
    c = { clicks: 0, wallets: new Set(), first: Date.now(), last: Date.now(), feeVolumeUsdc: 0 };
    e.camps.set(campaign, c);
  }
  return c;
}

const CODES_KEY = "ref:codes";
/** Redis forbids empty key segments — use this token for the default campaign. */
const CAMP_KEY_DEFAULT = "_";
function campKeyPart(campaign: string): string {
  return campaign || CAMP_KEY_DEFAULT;
}
const k = {
  clicks: (c: string) => `ref:clicks:${c}`,
  wallets: (c: string) => `ref:wallets:${c}`,
  last: (c: string) => `ref:last:${c}`,
  first: (c: string) => `ref:firstseen:${c}`,
  fees: (c: string) => `ref:fees:${c}`,
  camps: (c: string) => `ref:camps:${c}`,
  campClicks: (c: string, camp: string) => `ref:camp:clicks:${c}:${campKeyPart(camp)}`,
  campWallets: (c: string, camp: string) => `ref:camp:wallets:${c}:${campKeyPart(camp)}`,
  campFees: (c: string, camp: string) => `ref:camp:fees:${c}:${campKeyPart(camp)}`,
  campFirst: (c: string, camp: string) => `ref:camp:first:${c}:${campKeyPart(camp)}`,
  campLast: (c: string, camp: string) => `ref:camp:last:${c}:${campKeyPart(camp)}`,
  walletCamp: (c: string) => `ref:wallet_camp:${c}`,
};

/** Default entry fee in USDC when on-chain config is unavailable (display only). */
export const REFERRAL_DEFAULT_ENTRY_FEE_USDC = 1;

/** Record a link click for `code` (+ optional campaign). Falls back to in-memory if Redis fails. */
export async function recordClick(code: string, campaign: string = DEFAULT_CAMPAIGN): Promise<void> {
  const camp = normalizeCampaign(campaign);
  const now = Date.now();
  const r = await tryRedis(async () => {
    const p = redis!.pipeline();
    p.sadd(CODES_KEY, code);
    p.incr(k.clicks(code));
    p.set(k.last(code), now);
    p.setnx(k.first(code), now);
    p.sadd(k.camps(code), campKeyPart(camp));
    p.incr(k.campClicks(code, camp));
    p.set(k.campLast(code, camp), now);
    p.setnx(k.campFirst(code, camp), now);
    await p.exec();
  });
  if (r.ok) return;
  const e = memEntry(code);
  e.clicks += 1;
  e.last = now;
  const c = memCamp(e, camp);
  c.clicks += 1;
  c.last = now;
}

/**
 * Record a conversion (successful on-chain registration) attributed to `code`.
 * Deduped per wallet, so re-registering the same wallet doesn't inflate signups.
 * Optionally accumulates estimated fee volume for partner commission tracking.
 * Campaign is stored on first attribution only (first-touch).
 */
export async function recordConversion(
  code: string,
  wallet: string | null,
  opts?: { entryFeeUsdc?: number; campaign?: string },
): Promise<void> {
  const now = Date.now();
  const w = normalizeWallet(wallet) ?? `anon:${now}`;
  const camp = normalizeCampaign(opts?.campaign);
  const fee =
    typeof opts?.entryFeeUsdc === "number" && Number.isFinite(opts.entryFeeUsdc)
      ? Math.max(0, opts.entryFeeUsdc)
      : REFERRAL_DEFAULT_ENTRY_FEE_USDC;

  const r = await tryRedis(async () => {
    const before = await redis!.scard(k.wallets(code));
    const p = redis!.pipeline();
    p.sadd(CODES_KEY, code);
    p.sadd(k.wallets(code), w);
    p.set(k.last(code), now);
    p.setnx(k.first(code), now);
    await p.exec();
    const after = await redis!.scard(k.wallets(code));
    if (after > before) {
      const p2 = redis!.pipeline();
      p2.sadd(k.camps(code), campKeyPart(camp));
      p2.sadd(k.campWallets(code, camp), w);
      p2.set(k.campLast(code, camp), now);
      p2.setnx(k.campFirst(code, camp), now);
      p2.hsetnx(k.walletCamp(code), w, campKeyPart(camp));
      p2.incrbyfloat(k.fees(code), fee);
      p2.incrbyfloat(k.campFees(code, camp), fee);
      await p2.exec();
    }
  });
  if (r.ok) return;
  const e = memEntry(code);
  const sizeBefore = e.wallets.size;
  e.wallets.add(w);
  const isNew = e.wallets.size > sizeBefore;
  e.last = now;
  if (!isNew) return;
  e.feeVolumeUsdc += fee;
  if (!e.walletCamp.has(w)) e.walletCamp.set(w, camp);
  const c = memCamp(e, camp);
  c.wallets.add(w);
  c.feeVolumeUsdc += fee;
  c.last = now;
}

function memStats(): ReferralStat[] {
  return Array.from(mem.entries()).map(([code, e]) => ({
    code,
    clicks: e.clicks,
    signups: e.wallets.size,
    conversionRate: e.clicks > 0 ? e.wallets.size / e.clicks : 0,
    firstSeen: e.first,
    lastActivity: e.last,
    estimatedFeeVolumeUsdc: e.feeVolumeUsdc,
  }));
}

/** Remove a referral code and all its counters from storage. */
export async function deleteCode(code: string): Promise<boolean> {
  const normalized = normalizeCode(code);
  if (!normalized) return false;

  const r = await tryRedis(async () => {
    const camps = ((await redis!.smembers(k.camps(normalized))) ?? []) as string[];
    const p = redis!.pipeline();
    p.srem(CODES_KEY, normalized);
    p.del(k.clicks(normalized));
    p.del(k.wallets(normalized));
    p.del(k.last(normalized));
    p.del(k.first(normalized));
    p.del(k.fees(normalized));
    p.del(k.camps(normalized));
    p.del(k.walletCamp(normalized));
    for (const campToken of camps) {
      const camp = campToken === CAMP_KEY_DEFAULT ? DEFAULT_CAMPAIGN : campToken;
      p.del(k.campClicks(normalized, camp));
      p.del(k.campWallets(normalized, camp));
      p.del(k.campFees(normalized, camp));
      p.del(k.campFirst(normalized, camp));
      p.del(k.campLast(normalized, camp));
    }
    await p.exec();
  });
  if (r.ok) {
    mem.delete(normalized);
    return true;
  }

  if (!mem.has(normalized)) return false;
  mem.delete(normalized);
  return true;
}

/** Partner `?ref=` codes with the wallets that converted through each. */
export async function getReferralCodeWallets(): Promise<{ code: string; wallets: string[] }[]> {
  const r = await tryRedis(async () => {
    const codes = (await redis!.smembers(CODES_KEY)) ?? [];
    if (codes.length === 0) return [];
    const p = redis!.pipeline();
    for (const code of codes) p.smembers(k.wallets(code));
    const sets = (await p.exec()) as string[][];
    return codes.map((code, i) => ({ code, wallets: sets[i] ?? [] }));
  });
  const rows = r.ok
    ? r.value
    : Array.from(mem.entries()).map(([code, e]) => ({ code, wallets: Array.from(e.wallets) }));
  return rows.map((row) => ({ ...row, wallets: row.wallets.filter((w) => !w.startsWith("anon:")) }));
}

/**
 * Conversions with campaign attribution (first-touch campaign per wallet).
 * `campaign` is `""` when the visitor used a bare `?ref=` link.
 */
export async function getReferralConversionsDetailed(): Promise<
  { code: string; wallet: string; campaign: string }[]
> {
  const r = await tryRedis(async () => {
    const codes = (await redis!.smembers(CODES_KEY)) ?? [];
    const out: { code: string; wallet: string; campaign: string }[] = [];
    for (const code of codes) {
      const wallets = ((await redis!.smembers(k.wallets(code))) ?? []) as string[];
      const campMap =
        ((await redis!.hgetall<Record<string, string>>(k.walletCamp(code))) as Record<
          string,
          string
        > | null) ?? {};
      for (const wallet of wallets) {
        if (wallet.startsWith("anon:")) continue;
        const token = campMap[wallet] ?? CAMP_KEY_DEFAULT;
        out.push({
          code,
          wallet,
          campaign: token === CAMP_KEY_DEFAULT ? DEFAULT_CAMPAIGN : token,
        });
      }
    }
    return out;
  });
  if (r.ok) return r.value;

  const out: { code: string; wallet: string; campaign: string }[] = [];
  for (const [code, e] of mem.entries()) {
    for (const wallet of e.wallets) {
      if (wallet.startsWith("anon:")) continue;
      out.push({ code, wallet, campaign: e.walletCamp.get(wallet) ?? DEFAULT_CAMPAIGN });
    }
  }
  return out;
}

/** Per-campaign breakdown for the given referral codes (or all codes if omitted). */
export async function getCampaignStats(codesFilter?: string[]): Promise<ReferralCampaignStat[]> {
  const allow = codesFilter?.length
    ? new Set(codesFilter.map((c) => normalizeCode(c)).filter((c): c is string => !!c))
    : null;

  const r = await tryRedis(async () => {
    const codes = ((await redis!.smembers(CODES_KEY)) ?? []) as string[];
    const selected = allow ? codes.filter((c) => allow.has(c)) : codes;
    const rows: ReferralCampaignStat[] = [];
    for (const code of selected) {
      const camps = ((await redis!.smembers(k.camps(code))) ?? []) as string[];
      for (const campToken of camps) {
        const campaign = campToken === CAMP_KEY_DEFAULT ? DEFAULT_CAMPAIGN : campToken;
        const p = redis!.pipeline();
        p.get<number>(k.campClicks(code, campaign));
        p.scard(k.campWallets(code, campaign));
        p.get<number>(k.campFirst(code, campaign));
        p.get<number>(k.campLast(code, campaign));
        p.get<number | string>(k.campFees(code, campaign));
        const [clicksRaw, signupsRaw, firstRaw, lastRaw, feesRaw] = await p.exec<
          [number | null, number | null, number | null, number | null, number | string | null]
        >();
        const clicks = Number(clicksRaw ?? 0);
        const signups = Number(signupsRaw ?? 0);
        const feeStored = Number(feesRaw ?? 0);
        rows.push({
          code,
          campaign,
          clicks,
          signups,
          conversionRate: clicks > 0 ? signups / clicks : 0,
          firstSeen: firstRaw != null ? Number(firstRaw) : null,
          lastActivity: lastRaw != null ? Number(lastRaw) : null,
          estimatedFeeVolumeUsdc: Number.isFinite(feeStored)
            ? feeStored
            : signups * REFERRAL_DEFAULT_ENTRY_FEE_USDC,
        });
      }
    }
    return rows;
  });

  const rows = r.ok
    ? r.value
    : Array.from(mem.entries()).flatMap(([code, e]) => {
        if (allow && !allow.has(code)) return [];
        return Array.from(e.camps.entries()).map(([campaign, c]) => ({
          code,
          campaign,
          clicks: c.clicks,
          signups: c.wallets.size,
          conversionRate: c.clicks > 0 ? c.wallets.size / c.clicks : 0,
          firstSeen: c.first,
          lastActivity: c.last,
          estimatedFeeVolumeUsdc: c.feeVolumeUsdc,
        }));
      });

  return rows.sort(
    (a, b) =>
      b.signups - a.signups ||
      b.clicks - a.clicks ||
      a.code.localeCompare(b.code) ||
      a.campaign.localeCompare(b.campaign),
  );
}

/** All referral codes, with click/signup counters. Sorted by signups desc, then clicks desc. */
export async function getStats(): Promise<ReferralStat[]> {
  const codesResult = await tryRedis(async () => (await redis!.smembers(CODES_KEY)) ?? []);

  let stats: ReferralStat[];
  if (codesResult.ok) {
    stats = await Promise.all(
      codesResult.value.map(async (code) => {
        const p = redis!.pipeline();
        p.get<number>(k.clicks(code));
        p.scard(k.wallets(code));
        p.get<number>(k.first(code));
        p.get<number>(k.last(code));
        p.get<number | string>(k.fees(code));
        const [clicksRaw, signupsRaw, firstRaw, lastRaw, feesRaw] = await p.exec<
          [number | null, number | null, number | null, number | null, number | string | null]
        >();
        const clicks = Number(clicksRaw ?? 0);
        const signups = Number(signupsRaw ?? 0);
        const feeStored = Number(feesRaw ?? 0);
        const estimatedFeeVolumeUsdc = Number.isFinite(feeStored)
          ? feeStored
          : signups * REFERRAL_DEFAULT_ENTRY_FEE_USDC;
        return {
          code,
          clicks,
          signups,
          conversionRate: clicks > 0 ? signups / clicks : 0,
          firstSeen: firstRaw != null ? Number(firstRaw) : null,
          lastActivity: lastRaw != null ? Number(lastRaw) : null,
          estimatedFeeVolumeUsdc,
        };
      }),
    );
  } else {
    stats = memStats();
  }

  return stats.sort((a, b) => b.signups - a.signups || b.clicks - a.clicks);
}
