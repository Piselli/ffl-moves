/**
 * Current-tour player availability from API-Sports injuries endpoint.
 * Batches all GW fixtures via `ids=id1-id2-…`, caches in memory + Upstash.
 */

import { Redis } from "@upstash/redis";
import { EPL_LEAGUE_ID, SEASON } from "@/lib/football-api";
import {
  classifyInjuryRow,
  preferAvailability,
  type PlayerAvailability,
  type TourInjuriesPayload,
} from "@/lib/playerAvailability";

const API_BASE = "https://v3.football.api-sports.io";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

const FRESH_MS = 15 * 60 * 1000;
const STALE_MS = 2 * 60 * 60 * 1000;
const REDIS_TTL_SEC = Math.ceil(STALE_MS / 1000);

type CacheEntry = { at: number; payload: TourInjuriesPayload };

const memory = new Map<number, CacheEntry>();
const inflight = new Map<number, Promise<TourInjuriesPayload>>();

function redisKey(gw: number) {
  return `apisports:tour-injuries:v1:gw:${gw}`;
}

function roundName(gameweekId: number) {
  return `Regular Season - ${gameweekId}`;
}

type ApiInjuryRow = {
  player?: { id?: number; name?: string; type?: string; reason?: string };
  fixture?: { id?: number };
};

async function apiGet(
  path: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

async function fetchFixtureIds(
  gameweekId: number,
  apiKey: string,
): Promise<number[]> {
  const round = encodeURIComponent(roundName(gameweekId));
  const { ok, status, json } = await apiGet(
    `/fixtures?league=${EPL_LEAGUE_ID}&season=${SEASON}&round=${round}`,
    apiKey,
  );
  if (status === 429) throw new Error("API-Sports rate limit (429)");
  if (!ok) throw new Error(`API-Sports fixtures HTTP ${status}`);
  const errors = json.errors;
  if (errors && typeof errors === "object" && Object.keys(errors as object).length) {
    throw new Error(`API-Sports fixtures: ${JSON.stringify(errors)}`);
  }
  const response = Array.isArray(json.response) ? json.response : [];
  const ids: number[] = [];
  for (const row of response) {
    const id = Number(
      (row as { fixture?: { id?: number } })?.fixture?.id,
    );
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return ids;
}

function foldInjuries(rows: ApiInjuryRow[]): Record<string, PlayerAvailability> {
  const byApiId: Record<string, PlayerAvailability> = {};
  for (const row of rows) {
    const apiId = Number(row.player?.id);
    if (!Number.isFinite(apiId) || apiId <= 0) continue;
    const type = String(row.player?.type ?? "").trim();
    const reason = String(row.player?.reason ?? "").trim();
    const kind = classifyInjuryRow(type, reason);
    if (!kind) continue;
    const next: PlayerAvailability = {
      kind,
      type: type || kind,
      reason: reason || type || kind,
    };
    byApiId[String(apiId)] = preferAvailability(byApiId[String(apiId)], next);
  }
  return byApiId;
}

async function fetchInjuriesForFixtures(
  fixtureIds: number[],
  apiKey: string,
): Promise<Record<string, PlayerAvailability>> {
  if (fixtureIds.length === 0) return {};
  // API-Sports accepts hyphen-joined fixture ids on `/injuries?ids=`.
  const chunkSize = 20;
  const merged: Record<string, PlayerAvailability> = {};
  for (let i = 0; i < fixtureIds.length; i += chunkSize) {
    const chunk = fixtureIds.slice(i, i + chunkSize);
    const ids = chunk.join("-");
    const { ok, status, json } = await apiGet(`/injuries?ids=${ids}`, apiKey);
    if (status === 429) throw new Error("API-Sports rate limit (429)");
    if (!ok) throw new Error(`API-Sports injuries HTTP ${status}`);
    const errors = json.errors;
    if (errors && typeof errors === "object" && Object.keys(errors as object).length) {
      throw new Error(`API-Sports injuries: ${JSON.stringify(errors)}`);
    }
    const response = Array.isArray(json.response)
      ? (json.response as ApiInjuryRow[])
      : [];
    const part = foldInjuries(response);
    for (const [k, v] of Object.entries(part)) {
      merged[k] = preferAvailability(merged[k], v);
    }
  }
  return merged;
}

async function pullFresh(gameweekId: number): Promise<TourInjuriesPayload> {
  const apiKey = (process.env.API_SPORTS_KEY || "").trim();
  if (!apiKey) {
    throw new Error("API_SPORTS_KEY is not set");
  }
  const fixtureIds = await fetchFixtureIds(gameweekId, apiKey);
  const byApiId = await fetchInjuriesForFixtures(fixtureIds, apiKey);
  return {
    gameweekId,
    fetchedAt: new Date().toISOString(),
    byApiId,
  };
}

async function readRedis(gameweekId: number): Promise<CacheEntry | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<CacheEntry | TourInjuriesPayload>(
      redisKey(gameweekId),
    );
    if (!raw) return null;
    if ("payload" in (raw as CacheEntry) && (raw as CacheEntry).payload) {
      return raw as CacheEntry;
    }
    if (
      typeof raw === "object" &&
      raw &&
      "byApiId" in raw &&
      "gameweekId" in raw
    ) {
      return { at: Date.now() - FRESH_MS, payload: raw as TourInjuriesPayload };
    }
  } catch (e) {
    console.warn("tourInjuries redis read failed", e);
  }
  return null;
}

async function writeRedis(entry: CacheEntry): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(redisKey(entry.payload.gameweekId), entry, {
      ex: REDIS_TTL_SEC,
    });
  } catch (e) {
    console.warn("tourInjuries redis write failed", e);
  }
}

function kickRefresh(gameweekId: number): void {
  if (inflight.has(gameweekId)) return;
  const p = pullFresh(gameweekId)
    .then(async (payload) => {
      const entry = { at: Date.now(), payload };
      memory.set(gameweekId, entry);
      await writeRedis(entry);
      return payload;
    })
    .finally(() => {
      inflight.delete(gameweekId);
    });
  inflight.set(gameweekId, p);
  void p.catch((e) => console.warn("tourInjuries refresh failed", e));
}

/**
 * Serve tour injuries: fresh from memory/redis, or blocking pull when empty.
 * Stale hits kick a background refresh.
 */
export async function getTourInjuries(
  gameweekId: number,
): Promise<TourInjuriesPayload> {
  if (!Number.isFinite(gameweekId) || gameweekId < 1 || gameweekId > 38) {
    throw new Error("Invalid gameweekId");
  }

  const now = Date.now();
  const mem = memory.get(gameweekId);
  if (mem) {
    const age = now - mem.at;
    if (age < FRESH_MS) return mem.payload;
    if (age < STALE_MS) {
      kickRefresh(gameweekId);
      return mem.payload;
    }
  }

  const cached = await readRedis(gameweekId);
  if (cached) {
    memory.set(gameweekId, cached);
    const age = now - cached.at;
    if (age < FRESH_MS) return cached.payload;
    if (age < STALE_MS) {
      kickRefresh(gameweekId);
      return cached.payload;
    }
  }

  const existing = inflight.get(gameweekId);
  if (existing) return existing;

  const p = pullFresh(gameweekId).then(async (payload) => {
    const entry = { at: Date.now(), payload };
    memory.set(gameweekId, entry);
    await writeRedis(entry);
    return payload;
  });
  inflight.set(gameweekId, p);
  try {
    return await p;
  } finally {
    inflight.delete(gameweekId);
  }
}
