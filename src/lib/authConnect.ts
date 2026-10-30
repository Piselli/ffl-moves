/**
 * Auth connect tracking — server side.
 *
 * Counts unique wallets that connected (extension or Helius email/passkey),
 * even if they never registered a squad. Same Upstash Redis as referrals;
 * falls back to in-memory for local dev without env vars.
 *
 * Data model (Redis keys):
 *   auth:wallets                 SET    — every unique wallet that connected
 *   auth:method:<method>:wallets SET    — unique wallets per method
 *   auth:connects                STRING — connect events (session-deduped client-side)
 *   auth:method:<method>:connects STRING
 *   auth:provider:<name>         STRING — extension wallet connects by adapter name
 *   auth:first / auth:last       STRING — first / last activity (ms)
 */
import { Redis } from "@upstash/redis";
import { normalizeWallet } from "@/lib/walletNormalize";

export const AUTH_METHODS = ["wallet", "email", "passkey"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export type AuthConnectStats = {
  uniqueWallets: number;
  connects: number;
  firstSeen: number | null;
  lastActivity: number | null;
  byMethod: Record<
    AuthMethod,
    {
      uniqueWallets: number;
      connects: number;
    }
  >;
  byProvider: { name: string; connects: number }[];
};

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

let lastRedisError: string | null = null;

export function isAuthConnectStoreDurable(): boolean {
  return hasUpstash;
}

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

export async function getAuthConnectHealth(): Promise<{
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

export function normalizeAuthMethod(raw: unknown): AuthMethod | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().toLowerCase();
  return (AUTH_METHODS as readonly string[]).includes(m) ? (m as AuthMethod) : null;
}

/** Adapter / provider label for extension wallets (Phantom, Solflare, …). */
export function normalizeProvider(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return name.length >= 1 ? name : null;
}

// ── In-memory fallback ──────────────────────────────────────────────────────
type MemStore = {
  wallets: Set<string>;
  connects: number;
  first: number | null;
  last: number | null;
  byMethod: Record<AuthMethod, { wallets: Set<string>; connects: number }>;
  byProvider: Map<string, number>;
};

const globalForAuth = globalThis as unknown as { __fflAuthMem?: MemStore };

function emptyMem(): MemStore {
  return {
    wallets: new Set(),
    connects: 0,
    first: null,
    last: null,
    byMethod: {
      wallet: { wallets: new Set(), connects: 0 },
      email: { wallets: new Set(), connects: 0 },
      passkey: { wallets: new Set(), connects: 0 },
    },
    byProvider: new Map(),
  };
}

const mem: MemStore = globalForAuth.__fflAuthMem ?? emptyMem();
globalForAuth.__fflAuthMem = mem;

const KEYS = {
  wallets: "auth:wallets",
  connects: "auth:connects",
  first: "auth:first",
  last: "auth:last",
  methodWallets: (m: AuthMethod) => `auth:method:${m}:wallets`,
  methodConnects: (m: AuthMethod) => `auth:method:${m}:connects`,
  provider: (p: string) => `auth:provider:${p}`,
  providers: "auth:providers",
};

/**
 * Record a connect. Dedupes unique wallets via SET; each call still increments
 * connect counters (client should session-dedupe to avoid autoConnect spam).
 */
export async function recordAuthConnect(opts: {
  wallet: string | null;
  method: AuthMethod;
  provider?: string | null;
}): Promise<void> {
  const w = normalizeWallet(opts.wallet);
  if (!w) return;
  const now = Date.now();
  const method = opts.method;
  const provider = method === "wallet" ? normalizeProvider(opts.provider) : null;

  const r = await tryRedis(async () => {
    const p = redis!.pipeline();
    p.sadd(KEYS.wallets, w);
    p.incr(KEYS.connects);
    p.sadd(KEYS.methodWallets(method), w);
    p.incr(KEYS.methodConnects(method));
    p.set(KEYS.last, now);
    p.setnx(KEYS.first, now);
    if (provider) {
      p.sadd(KEYS.providers, provider);
      p.incr(KEYS.provider(provider));
    }
    await p.exec();
  });
  if (r.ok) return;

  mem.wallets.add(w);
  mem.connects += 1;
  mem.byMethod[method].wallets.add(w);
  mem.byMethod[method].connects += 1;
  if (!mem.first) mem.first = now;
  mem.last = now;
  if (provider) {
    mem.byProvider.set(provider, (mem.byProvider.get(provider) ?? 0) + 1);
  }
}

function memStats(): AuthConnectStats {
  return {
    uniqueWallets: mem.wallets.size,
    connects: mem.connects,
    firstSeen: mem.first,
    lastActivity: mem.last,
    byMethod: {
      wallet: {
        uniqueWallets: mem.byMethod.wallet.wallets.size,
        connects: mem.byMethod.wallet.connects,
      },
      email: {
        uniqueWallets: mem.byMethod.email.wallets.size,
        connects: mem.byMethod.email.connects,
      },
      passkey: {
        uniqueWallets: mem.byMethod.passkey.wallets.size,
        connects: mem.byMethod.passkey.connects,
      },
    },
    byProvider: Array.from(mem.byProvider.entries())
      .map(([name, connects]) => ({ name, connects }))
      .sort((a, b) => b.connects - a.connects),
  };
}

/** Every connected wallet → auth methods it used. */
export async function getAuthConnectWallets(): Promise<Record<string, AuthMethod[]>> {
  const out: Record<string, AuthMethod[]> = {};
  const r = await tryRedis(async () => {
    const p = redis!.pipeline();
    p.smembers(KEYS.wallets);
    for (const method of AUTH_METHODS) p.smembers(KEYS.methodWallets(method));
    return (await p.exec()) as string[][];
  });
  const sets: string[][] = r.ok
    ? r.value
    : [
        Array.from(mem.wallets),
        ...AUTH_METHODS.map((m) => Array.from(mem.byMethod[m].wallets)),
      ];
  for (const w of sets[0] ?? []) out[w] = [];
  AUTH_METHODS.forEach((method, i) => {
    for (const w of sets[i + 1] ?? []) (out[w] ??= []).push(method);
  });
  return out;
}

export async function getAuthConnectStats(): Promise<AuthConnectStats> {
  const r = await tryRedis(async () => {
    const p = redis!.pipeline();
    p.scard(KEYS.wallets);
    p.get<number>(KEYS.connects);
    p.get<number>(KEYS.first);
    p.get<number>(KEYS.last);
    for (const method of AUTH_METHODS) {
      p.scard(KEYS.methodWallets(method));
      p.get<number>(KEYS.methodConnects(method));
    }
    p.smembers(KEYS.providers);
    const raw = await p.exec();
    return raw;
  });

  if (!r.ok) return memStats();

  const rows = r.value as unknown[];
  let i = 0;
  const uniqueWallets = Number(rows[i++] ?? 0);
  const connects = Number(rows[i++] ?? 0);
  const firstRaw = rows[i++];
  const lastRaw = rows[i++];

  const byMethod = {} as AuthConnectStats["byMethod"];
  for (const method of AUTH_METHODS) {
    const u = Number(rows[i++] ?? 0);
    const c = Number(rows[i++] ?? 0);
    byMethod[method] = { uniqueWallets: u, connects: c };
  }

  const providerNames = (rows[i++] as string[] | null) ?? [];
  const byProvider: { name: string; connects: number }[] = [];
  if (providerNames.length > 0 && redis) {
    const counts = await Promise.all(
      providerNames.map(async (name) => ({
        name,
        connects: Number((await redis.get<number>(KEYS.provider(name))) ?? 0),
      })),
    );
    byProvider.push(...counts.sort((a, b) => b.connects - a.connects));
  }

  return {
    uniqueWallets,
    connects,
    firstSeen: firstRaw != null ? Number(firstRaw) : null,
    lastActivity: lastRaw != null ? Number(lastRaw) : null,
    byMethod,
    byProvider,
  };
}
