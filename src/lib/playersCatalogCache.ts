/**
 * Slim player catalog cache — we never put the 2.6MB FPL bootstrap in Next’s
 * Data Cache (2MB limit). Instead we cache the mapped ~200KB Player[] in:
 *   1) process memory (warm serverless / local)
 *   2) Upstash Redis when configured (shared across instances)
 */
import { Redis } from "@upstash/redis";
import type { Player } from "@/lib/types";

const REDIS_KEY = "fpl:players-catalog:v2";
/** Serve from memory without hitting FPL. */
export const PLAYERS_FRESH_MS = 5 * 60 * 1000;
/** After fresh TTL, still serve stale while a background refresh runs. */
export const PLAYERS_STALE_MS = 60 * 60 * 1000;
const REDIS_TTL_SEC = Math.ceil(PLAYERS_STALE_MS / 1000);

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = hasUpstash ? Redis.fromEnv() : null;

type CacheEntry = { at: number; players: Player[] };

let memory: CacheEntry | null = null;
let refreshInFlight: Promise<Player[]> | null = null;

export function peekPlayersMemory(): CacheEntry | null {
  return memory;
}

export function putPlayersMemory(players: Player[], at = Date.now()): void {
  memory = { at, players };
}

export async function readPlayersRedis(): Promise<CacheEntry | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<{ at: number; players: Player[] } | Player[]>(REDIS_KEY);
    if (!raw) return null;
    if (Array.isArray(raw)) {
      return { at: Date.now() - PLAYERS_FRESH_MS, players: raw };
    }
    if (raw.players && Array.isArray(raw.players)) {
      return { at: typeof raw.at === "number" ? raw.at : Date.now(), players: raw.players };
    }
  } catch (e) {
    console.warn("playersCatalogCache: redis read failed", e);
  }
  return null;
}

export async function writePlayersRedis(players: Player[], at = Date.now()): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(REDIS_KEY, { at, players }, { ex: REDIS_TTL_SEC });
  } catch (e) {
    console.warn("playersCatalogCache: redis write failed", e);
  }
}

/**
 * Return cached catalog if fresh/stale. When stale, `shouldRefresh` is true
 * so the caller can kick a background FPL pull without blocking the response.
 */
export async function getCachedPlayers(): Promise<{
  players: Player[] | null;
  ageMs: number;
  shouldRefresh: boolean;
}> {
  const now = Date.now();
  if (memory) {
    const age = now - memory.at;
    if (age < PLAYERS_FRESH_MS) {
      return { players: memory.players, ageMs: age, shouldRefresh: false };
    }
    if (age < PLAYERS_STALE_MS) {
      return { players: memory.players, ageMs: age, shouldRefresh: true };
    }
  }

  const fromRedis = await readPlayersRedis();
  if (fromRedis?.players?.length) {
    memory = fromRedis;
    const age = now - fromRedis.at;
    if (age < PLAYERS_FRESH_MS) {
      return { players: fromRedis.players, ageMs: age, shouldRefresh: false };
    }
    if (age < PLAYERS_STALE_MS) {
      return { players: fromRedis.players, ageMs: age, shouldRefresh: true };
    }
    return { players: fromRedis.players, ageMs: age, shouldRefresh: true };
  }

  return { players: null, ageMs: Number.POSITIVE_INFINITY, shouldRefresh: true };
}

/** Deduplicate concurrent FPL refreshes on one instance. */
export function runPlayersRefresh(factory: () => Promise<Player[]>): Promise<Player[]> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = factory()
    .then(async (players) => {
      const at = Date.now();
      putPlayersMemory(players, at);
      await writePlayersRedis(players, at);
      return players;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}
