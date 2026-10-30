/**
 * Extra referral codes a partner creates in the cabinet (beyond env `codes`).
 * Redis:
 *   ref:partner:extra:<partnerId>  SET
 *   ref:code:owner                 HASH  code → partnerId
 */
import { Redis } from "@upstash/redis";
import { normalizeCode } from "@/lib/referral";
import { getReferralPartners } from "@/lib/referralPartners";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = hasUpstash ? Redis.fromEnv() : null;

const OWNER_KEY = "ref:code:owner";
const extraKey = (partnerId: string) => `ref:partner:extra:${partnerId}`;

type MemStore = {
  extra: Map<string, Set<string>>;
  owner: Map<string, string>;
};

function mem(): MemStore {
  const g = globalThis as unknown as { __fflPartnerCodes?: MemStore };
  if (!g.__fflPartnerCodes) {
    g.__fflPartnerCodes = { extra: new Map(), owner: new Map() };
  }
  return g.__fflPartnerCodes;
}

/** All codes claimed in env by any partner. */
function envOwnedCodes(): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of getReferralPartners()) {
    for (const c of p.codes) map.set(c, p.id);
  }
  return map;
}

export async function listExtraPartnerCodes(partnerId: string): Promise<string[]> {
  if (redis) {
    try {
      const rows = ((await redis.smembers(extraKey(partnerId))) ?? []) as string[];
      return rows
        .map((c) => normalizeCode(c))
        .filter((c): c is string => !!c)
        .sort();
    } catch {
      /* fall through */
    }
  }
  return Array.from(mem().extra.get(partnerId) ?? []).sort();
}

/** Env seed codes + cabinet-created extras. */
export async function getEffectivePartnerCodes(partnerId: string): Promise<string[]> {
  const partner = getReferralPartners().find((p) => p.id === partnerId);
  const seed = partner?.codes ?? [];
  const extra = await listExtraPartnerCodes(partnerId);
  return [...new Set([...seed, ...extra])];
}

export async function getCodeOwner(code: string): Promise<string | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const env = envOwnedCodes().get(normalized);
  if (env) return env;
  if (redis) {
    try {
      const owner = await redis.hget<string>(OWNER_KEY, normalized);
      if (owner) return String(owner);
    } catch {
      /* fall through */
    }
  }
  return mem().owner.get(normalized) ?? null;
}

export type CreatePartnerCodeResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

export async function createPartnerCode(
  partnerId: string,
  rawCode: string,
): Promise<CreatePartnerCodeResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Invalid code (use a-z, 0-9, _ or -)." };
  if (code.length < 2) return { ok: false, error: "Code too short." };

  const existing = await getCodeOwner(code);
  if (existing && existing !== partnerId) {
    return { ok: false, error: "This code is already taken." };
  }
  if (existing === partnerId) {
    return { ok: true, code }; // already yours
  }

  if (redis) {
    try {
      const claimed = await redis.hsetnx(OWNER_KEY, code, partnerId);
      if (claimed === 0) {
        const owner = await redis.hget<string>(OWNER_KEY, code);
        if (owner && owner !== partnerId) {
          return { ok: false, error: "This code is already taken." };
        }
      }
      await redis.sadd(extraKey(partnerId), code);
      return { ok: true, code };
    } catch (e) {
      console.error("[partnerCodes] redis create failed", e);
      return { ok: false, error: "Could not save code. Try again." };
    }
  }

  const store = mem();
  if (store.owner.has(code) && store.owner.get(code) !== partnerId) {
    return { ok: false, error: "This code is already taken." };
  }
  store.owner.set(code, partnerId);
  const set = store.extra.get(partnerId) ?? new Set();
  set.add(code);
  store.extra.set(partnerId, set);
  return { ok: true, code };
}
