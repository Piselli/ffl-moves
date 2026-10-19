/**
 * Telegram alert subscribers in Upstash Redis.
 * Falls back to in-memory Set when Redis is unavailable (dev / Redis blip).
 */
import { Redis } from "@upstash/redis";

const SUBS_KEY = "tg:alerts:subs";
const SENT_PREFIX = "tg:alerts:sent:";
const CLAIM_BOOTSTRAP_KEY = "tg:alerts:claim_bootstrapped";
/** Keep sent markers ~6 weeks so a GW cannot re-fire after redeploy. */
const SENT_TTL_SEC = 42 * 24 * 3600;

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis = hasUpstash ? Redis.fromEnv() : null;

const memorySubs = new Set<string>();
const memorySent = new Set<string>();

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
 * `kind` examples: reg_open, deadline_24h, deadline_3h, deadline_1h, claim_ready
 */
export async function claimAlertSlot(kind: string, gameweekId: number): Promise<boolean> {
  const key = `${SENT_PREFIX}${kind}:${gameweekId}`;
  if (redis) {
    try {
      const ok = await redis.set(key, String(Date.now()), { nx: true, ex: SENT_TTL_SEC });
      return ok === "OK";
    } catch (err) {
      console.warn("[telegram] claimAlertSlot Redis failed, using memory:", err);
    }
  }
  if (memorySent.has(key)) return false;
  memorySent.add(key);
  return true;
}

/** Mark a slot consumed without sending (skip a missed earlier window). */
export async function markAlertSlot(kind: string, gameweekId: number): Promise<void> {
  await claimAlertSlot(kind, gameweekId);
}

/**
 * First cron after deploy: mark the current resolved GW as already alerted so we
 * do not spam subscribers with a weeks-old "claim ready" message.
 * Returns true when this tick should skip the claim broadcast (bootstrap ran).
 */
export async function bootstrapClaimAlertIfNeeded(resolvedId: number): Promise<boolean> {
  if (resolvedId <= 0) return false;
  if (redis) {
    try {
      const ok = await redis.set(CLAIM_BOOTSTRAP_KEY, String(resolvedId), {
        nx: true,
        ex: SENT_TTL_SEC * 4,
      });
      if (ok === "OK") {
        await markAlertSlot("claim_ready", resolvedId);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("[telegram] claim bootstrap Redis failed:", err);
    }
  }
  const key = CLAIM_BOOTSTRAP_KEY;
  if (memorySent.has(key)) return false;
  memorySent.add(key);
  await markAlertSlot("claim_ready", resolvedId);
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
