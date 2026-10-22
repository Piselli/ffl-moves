/**
 * Telegram alert subscribers in Upstash Redis.
 * Falls back to in-memory Set when Redis is unavailable (dev / Redis blip).
 */
import { Redis } from "@upstash/redis";

const SUBS_KEY = "tg:alerts:subs";
const SENT_PREFIX = "tg:alerts:sent:";
/** Highest resolved GW we already handled for claim alerts (floor / last sent). */
const CLAIM_LAST_KEY = "tg:alerts:claim_last_sent";
/** Keep sent markers ~6 weeks so a GW cannot re-fire after redeploy. */
const SENT_TTL_SEC = 42 * 24 * 3600;
/**
 * In-flight lock. If the process dies after SETNX and before send (Vercel freeze),
 * the slot expires and the next tick retries instead of eating the alert forever.
 */
const CLAIM_LOCK_TTL_SEC = 15 * 60;

function sentKey(kind: string, gameweekId: number, suffix?: string): string {
  return suffix
    ? `${SENT_PREFIX}${kind}:${gameweekId}:${suffix}`
    : `${SENT_PREFIX}${kind}:${gameweekId}`;
}

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

const memorySubs = new Set<string>();
const memorySent = new Set<string>();
let memoryClaimLast = 0;

function chatKey(chatId: number | string): string {
  return String(chatId);
}

export async function subscribeChat(chatId: number): Promise<{ added: boolean; total: number }> {
  const id = chatKey(chatId);
  if (redis) {
    try {
      const added = (await redis.sadd(SUBS_KEY, id)) === 1;
      const total = await redis.scard(SUBS_KEY);
      return { added, total };
    } catch (err) {
      console.warn("[telegram] subscribe Redis failed, using memory:", err);
    }
  }
  const added = !memorySubs.has(id);
  memorySubs.add(id);
  return { added, total: memorySubs.size };
}

export async function unsubscribeChat(chatId: number): Promise<{ removed: boolean; total: number }> {
  const id = chatKey(chatId);
  if (redis) {
    try {
      const removed = (await redis.srem(SUBS_KEY, id)) === 1;
      const total = await redis.scard(SUBS_KEY);
      return { removed, total };
    } catch (err) {
      console.warn("[telegram] unsubscribe Redis failed, using memory:", err);
    }
  }
  const removed = memorySubs.delete(id);
  return { removed, total: memorySubs.size };
}

export async function listSubscriberIds(): Promise<number[]> {
  if (redis) {
    try {
      const raw = await redis.smembers(SUBS_KEY);
      return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n !== 0);
    } catch (err) {
      console.warn("[telegram] listSubs Redis failed, using memory:", err);
    }
  }
  return [...memorySubs].map(Number).filter((n) => Number.isFinite(n) && n !== 0);
}

export async function subscriberCount(): Promise<number> {
  if (redis) {
    try {
      return await redis.scard(SUBS_KEY);
    } catch (err) {
      console.warn("[telegram] scard Redis failed, using memory:", err);
    }
  }
  return memorySubs.size;
}

/**
 * Claim a one-shot alert slot. Returns true only the first time for this key.
 * `kind` examples: reg_open, deadline_24h, deadline_3h, deadline_1h, claim_ready, stats_update
 * Optional `suffix` for multiple fires per GW (e.g. each stats publish batch).
 */
export async function claimAlertSlot(
  kind: string,
  gameweekId: number,
  suffix?: string,
): Promise<boolean> {
  const key = sentKey(kind, gameweekId, suffix);
  if (redis) {
    try {
      const ok = await redis.set(key, String(Date.now()), { nx: true, ex: CLAIM_LOCK_TTL_SEC });
      return ok === "OK";
    } catch (err) {
      console.warn("[telegram] claimAlertSlot Redis failed, using memory:", err);
    }
  }
  if (memorySent.has(key)) return false;
  memorySent.add(key);
  return true;
}

/** Keep the slot consumed after a successful send. */
export async function confirmAlertSlot(
  kind: string,
  gameweekId: number,
  suffix?: string,
): Promise<void> {
  const key = sentKey(kind, gameweekId, suffix);
  if (redis) {
    try {
      await redis.set(key, String(Date.now()), { ex: SENT_TTL_SEC });
      return;
    } catch (err) {
      console.warn("[telegram] confirmAlertSlot Redis failed, using memory:", err);
    }
  }
  memorySent.add(key);
}

/** Drop an in-flight or stuck slot so the next tick can retry. */
export async function releaseAlertSlot(
  kind: string,
  gameweekId: number,
  suffix?: string,
): Promise<void> {
  const key = sentKey(kind, gameweekId, suffix);
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn("[telegram] releaseAlertSlot Redis failed:", err);
    }
  }
  memorySent.delete(key);
}

/** Mark a slot consumed without sending (skip a missed earlier window). */
export async function markAlertSlot(kind: string, gameweekId: number, suffix?: string): Promise<void> {
  await confirmAlertSlot(kind, gameweekId, suffix);
}

/**
 * Decide whether to broadcast "claim ready" for `resolvedId`.
 *
 * First-ever call: set the floor to the current resolved GW and return false
 * (no spam for an already-settled tour on deploy).
 * Later: return true once when `resolvedId` advances past the floor.
 */
export async function takeClaimReadyAlert(resolvedId: number): Promise<boolean> {
  if (resolvedId <= 0) return false;
  if (redis) {
    try {
      const raw = await redis.get<string | number>(CLAIM_LAST_KEY);
      if (raw == null) {
        await redis.set(CLAIM_LAST_KEY, String(resolvedId), { ex: SENT_TTL_SEC * 4 });
        return false;
      }
      const last = Number(raw);
      if (!Number.isFinite(last) || resolvedId <= last) return false;
      await redis.set(CLAIM_LAST_KEY, String(resolvedId), { ex: SENT_TTL_SEC * 4 });
      return true;
    } catch (err) {
      console.warn("[telegram] takeClaimReadyAlert Redis failed:", err);
    }
  }
  if (memoryClaimLast <= 0) {
    memoryClaimLast = resolvedId;
    return false;
  }
  if (resolvedId <= memoryClaimLast) return false;
  memoryClaimLast = resolvedId;
  return true;
}

export function parseAdminChatIds(): Set<number> {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_IDS?.trim() ?? "";
  const ids = new Set<number>();
  for (const part of raw.split(/[,\s]+/)) {
    if (!part) continue;
    const n = Number(part);
    if (Number.isFinite(n) && n !== 0) ids.add(n);
  }
  return ids;
}

export function isAdminChat(chatId: number): boolean {
  return parseAdminChatIds().has(chatId);
}
