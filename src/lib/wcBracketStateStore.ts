/**
 * Server-only persistence for published WC bracket state (Redis + local JSON file).
 * Import only from API routes / server modules — never from client components.
 */

import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import {
  emptyWcBracketState,
  isValidWcBracketState,
  type WcBracketState,
} from "@/lib/wcBracketState";

const STATE_FILE = path.join(process.cwd(), "public", "data", "wc-bracket-state.json");
const REDIS_KEY = "wc:bracket:state";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = hasUpstash ? Redis.fromEnv() : null;

export function isWcBracketStoreDurable(): boolean {
  return hasUpstash;
}

function normalizeLoaded(raw: unknown): WcBracketState | null {
  if (!isValidWcBracketState(raw)) return null;
  return {
    ...raw,
    meta: raw.meta ?? { updatedAt: null, source: null },
  };
}

function readWcBracketStateFile(): WcBracketState {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return normalizeLoaded(JSON.parse(raw) as unknown) ?? emptyWcBracketState();
  } catch {
    return emptyWcBracketState();
  }
}

async function readWcBracketStateRedis(): Promise<WcBracketState | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<WcBracketState | string>(REDIS_KEY);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return normalizeLoaded(parsed);
  } catch {
    return null;
  }
}

/** Load published state — Redis first, then static file. */
export async function loadWcBracketState(): Promise<WcBracketState> {
  const fromRedis = await readWcBracketStateRedis();
  if (fromRedis) return fromRedis;
  return readWcBracketStateFile();
}

export function writeWcBracketStateFile(state: WcBracketState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function writeWcBracketStateRedis(state: WcBracketState): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.set(REDIS_KEY, state);
    return true;
  } catch {
    return false;
  }
}

/** Persist published state — Redis when configured, always attempts file write for local dev. */
export async function saveWcBracketState(state: WcBracketState): Promise<void> {
  await writeWcBracketStateRedis(state);
  try {
    writeWcBracketStateFile(state);
  } catch {
    // read-only filesystem (e.g. Vercel) — Redis is the durable store
  }
}
