import { Redis } from "@upstash/redis";
import { nicknameKey } from "@/lib/nicknames";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL?.trim() && !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const redis: Redis | null = hasUpstash ? Redis.fromEnv() : null;

const BY_WALLET = "nicknames:v1:byWallet"; // wallet -> nickname
const BY_KEY = "nicknames:v1:byKey"; // normalized nickname -> wallet (uniqueness)

// Local dev without Upstash: per-process memory.
const memByWallet = new Map<string, string>();
const memByKey = new Map<string, string>();

export function nicknameStoreIsDurable(): boolean {
  return hasUpstash;
}

export async function getAllNicknames(): Promise<Record<string, string>> {
  if (redis) {
    const all = await redis.hgetall<Record<string, string>>(BY_WALLET);
    return all ?? {};
  }
  return Object.fromEntries(memByWallet);
}

export type SetNicknameResult = { ok: true } | { ok: false; reason: "taken" };

export async function setNickname(wallet: string, nickname: string): Promise<SetNicknameResult> {
  const key = nicknameKey(nickname);
  if (redis) {
    const owner = await redis.hget<string>(BY_KEY, key);
    if (owner && owner !== wallet) return { ok: false, reason: "taken" };
    const prev = await redis.hget<string>(BY_WALLET, wallet);
    const pipe = redis.pipeline();
    if (prev && nicknameKey(prev) !== key) pipe.hdel(BY_KEY, nicknameKey(prev));
    pipe.hset(BY_WALLET, { [wallet]: nickname });
    pipe.hset(BY_KEY, { [key]: wallet });
    await pipe.exec();
    return { ok: true };
  }
  const owner = memByKey.get(key);
  if (owner && owner !== wallet) return { ok: false, reason: "taken" };
  const prev = memByWallet.get(wallet);
  if (prev && nicknameKey(prev) !== key) memByKey.delete(nicknameKey(prev));
  memByWallet.set(wallet, nickname);
  memByKey.set(key, wallet);
  return { ok: true };
}
