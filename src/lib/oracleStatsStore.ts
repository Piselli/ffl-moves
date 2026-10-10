/**
 * Oracle stats JSON store — durable via Upstash Redis when configured,
 * plus a local `public/data/stats/<gw>.json` write for dev / git deploy.
 *
 * Live leaderboard and `getGameweekStats` both fetch the public URI; Redis
 * lets Submit Stats publish without a manual Vercel deploy.
 */
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

function redisKey(gameweekId: number): string {
  return `oracle:stats:${gameweekId}`;
}

function localStatsPath(gameweekId: number): string {
  return path.join(process.cwd(), "public", "data", "stats", `${gameweekId}.json`);
}

export function isOracleStatsStoreDurable(): boolean {
  return hasUpstash;
}

/** Exact JSON string previously published for this GW, or null. */
export async function readOracleStatsJson(gameweekId: number): Promise<string | null> {
  if (redis) {
    try {
      const value = await redis.get<string>(redisKey(gameweekId));
      if (typeof value === "string" && value.length > 0) return value;
      // Upstash may return already-parsed JSON for some clients.
      if (value && typeof value === "object") return JSON.stringify(value);
    } catch (e) {
      console.warn("oracleStatsStore redis read failed", e);
    }
  }

  try {
    return await fs.readFile(localStatsPath(gameweekId), "utf8");
  } catch {
    return null;
  }
}

/**
 * Persist canonical stats JSON (must be byte-identical to the on-chain keccak).
 * Writes Redis when available and always attempts the local public file.
 */
export async function writeOracleStatsJson(
  gameweekId: number,
  canonicalJson: string,
): Promise<{ durable: boolean; local: boolean }> {
  let durable = false;
  let local = false;

  if (redis) {
    try {
      await redis.set(redisKey(gameweekId), canonicalJson);
      durable = true;
    } catch (e) {
      console.warn("oracleStatsStore redis write failed", e);
    }
  }

  try {
    const filePath = localStatsPath(gameweekId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, canonicalJson, "utf8");
    local = true;
  } catch (e) {
    console.warn("oracleStatsStore local write failed", e);
  }

  if (!durable && !local) {
    throw new Error(
      "Could not publish stats (Redis unavailable and local write failed).",
    );
  }

  return { durable, local };
}
