/**
 * Durable FPL fixture rows for the tablet / fixtures board.
 * Cron (lhr1) refreshes Redis so Vercel can serve scores even when live FPL
 * is blocked from the request path.
 */
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const redis = hasUpstash ? Redis.fromEnv() : null;

export type CachedFixtureRow = {
  id: number;
  event: number;
  kickoff_time?: string | null;
  team_h: number;
  team_a: number;
  finished?: boolean;
  started?: boolean;
  team_h_score?: number | null;
  team_a_score?: number | null;
};

export type FixturesCachePayload = {
  gameweekId: number;
  fetchedAt: string;
  source: "fpl";
  fixtures: CachedFixtureRow[];
};

export type FixturesCachePointer = {
  gameweekId: number;
  updatedAt: string;
};

function gwKey(gameweekId: number): string {
  return `fpl:fixtures:gw:${gameweekId}`;
}

const POINTER_KEY = "fpl:fixtures:pointer";

export function isFixturesCacheDurable(): boolean {
  return hasUpstash;
}

export async function readFixturesCache(
  gameweekId: number,
): Promise<FixturesCachePayload | null> {
  if (!redis || !Number.isFinite(gameweekId) || gameweekId < 1) return null;
  try {
    const value = await redis.get<string | FixturesCachePayload>(gwKey(gameweekId));
    if (typeof value === "string" && value.length > 0) {
      return JSON.parse(value) as FixturesCachePayload;
    }
    if (value && typeof value === "object" && Array.isArray(value.fixtures)) {
      return value as FixturesCachePayload;
    }
  } catch (e) {
    console.warn("fixturesCacheStore read failed", e);
  }
  return null;
}

export async function readFixturesCachePointer(): Promise<FixturesCachePointer | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<string | FixturesCachePointer>(POINTER_KEY);
    if (typeof value === "string" && value.length > 0) {
      return JSON.parse(value) as FixturesCachePointer;
    }
    if (value && typeof value === "object" && typeof value.gameweekId === "number") {
      return value as FixturesCachePointer;
    }
  } catch (e) {
    console.warn("fixturesCacheStore pointer read failed", e);
  }
  return null;
}

export async function writeFixturesCache(
  payload: FixturesCachePayload,
  opts?: { setPointer?: boolean },
): Promise<boolean> {
  if (!redis) return false;
  try {
    const json = JSON.stringify(payload);
    await redis.set(gwKey(payload.gameweekId), json, { ex: 60 * 60 * 24 * 14 });
    if (opts?.setPointer !== false) {
      const pointer: FixturesCachePointer = {
        gameweekId: payload.gameweekId,
        updatedAt: payload.fetchedAt,
      };
      await redis.set(POINTER_KEY, JSON.stringify(pointer), { ex: 60 * 60 * 24 * 14 });
    }
    return true;
  } catch (e) {
    console.warn("fixturesCacheStore write failed", e);
    return false;
  }
}
