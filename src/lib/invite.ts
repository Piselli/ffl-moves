/**
 * Player invite program — Season Points bonuses.
 *
 * Separate from partner `?ref=` analytics ([referral.ts]): player invites award
 * SP to both sides on the invitee's first registration in the current SP season.
 *
 * Redis keys:
 *   inv:owner:{wallet}              — code owned by wallet
 *   inv:code:{code}                 — wallet that owns code
 *   inv:award:{seasonId}:{invitee}  — JSON award record (idempotent)
 *   inv:bonus:{seasonId}            — HASH wallet → total invite SP
 *   inv:count:{seasonId}:{inviter}  — successful rewarded invites (analytics)
 */
import { createHash } from "crypto";
import { Redis } from "@upstash/redis";
import {
  findHighestGameweekId,
  hasRegisteredTeam,
} from "@/lib/chainClient";
import {
  CURRENT_SEASON,
  SP_INVITE_REFEREE,
  SP_INVITE_REFERRER,
  seasonEplCap,
} from "@/lib/season-points-rules";
import { normalizeInviteCode } from "@/lib/inviteCode";
import { lookupByWalletKey, normalizeWallet } from "@/lib/walletNormalize";

export { normalizeInviteCode };

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = hasUpstash ? Redis.fromEnv() : null;

let lastRedisError: string | null = null;

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

export function isInviteStoreDurable(): boolean {
  return hasUpstash;
}

export function getInviteStoreError(): string | null {
  return lastRedisError;
}

function codeFromWallet(wallet: string): string {
  return createHash("sha256").update(`form8-invite-v1:${wallet}`).digest("hex").slice(0, 8);
}

type MemInvite = {
  ownerToCode: Map<string, string>;
  codeToOwner: Map<string, string>;
  awards: Map<string, InviteAwardRecord>;
  bonuses: Map<string, Map<string, number>>;
  counts: Map<string, number>;
};

const globalForInv = globalThis as unknown as { __fflInvMem?: MemInvite };
const mem: MemInvite = globalForInv.__fflInvMem ?? {
  ownerToCode: new Map(),
  codeToOwner: new Map(),
  awards: new Map(),
  bonuses: new Map(),
  counts: new Map(),
};
globalForInv.__fflInvMem = mem;

function awardKey(seasonId: number, invitee: string): string {
  return `inv:award:${seasonId}:${invitee}`;
}

function bonusKey(seasonId: number): string {
  return `inv:bonus:${seasonId}`;
}

function countKey(seasonId: number, inviter: string): string {
  return `inv:count:${seasonId}:${inviter}`;
}

export type InviteAwardRecord = {
  inviter: string;
  invitee: string;
  code: string;
  seasonId: number;
  inviterPoints: number;
  inviteePoints: number;
  at: number;
};

export type InviteMePayload = {
  wallet: string;
  code: string;
  linkPath: string;
  seasonId: number;
  inviteCount: number;
  inviterPointsPer: number;
  inviteePointsPer: number;
  /** False once the wallet has any Entry in the current SP season. */
  canEnterInviteCode: boolean;
};

export type ClaimInviteResult =
  | { ok: true; award: InviteAwardRecord; alreadyAwarded?: boolean }
  | {
      ok: false;
      reason:
        | "invalid_invitee"
        | "invalid_code"
        | "unknown_code"
        | "self_invite"
        | "not_registered"
        | "not_first_season_reg"
        | "season_inactive";
    };

/** Ensure wallet has a stable invite code; create if missing. */
export async function ensureInviteCode(walletRaw: string): Promise<string | null> {
  const wallet = normalizeWallet(walletRaw);
  if (!wallet) return null;

  const rGet = await tryRedis(async () => {
    const existing = await redis!.get<string>(`inv:owner:${wallet}`);
    if (existing) return existing;
    let code = codeFromWallet(wallet);
    for (let i = 0; i < 4; i++) {
      const owner = await redis!.get<string>(`inv:code:${code}`);
      if (!owner || owner === wallet) break;
      code = createHash("sha256")
        .update(`form8-invite-v1:${wallet}:${i}`)
        .digest("hex")
        .slice(0, 8 + i);
    }
    const p = redis!.pipeline();
    p.set(`inv:owner:${wallet}`, code);
    p.set(`inv:code:${code}`, wallet);
    await p.exec();
    return code;
  });
  if (rGet.ok) return rGet.value;

  const existing = mem.ownerToCode.get(wallet);
  if (existing) return existing;
  let code = codeFromWallet(wallet);
  let n = 0;
  while (mem.codeToOwner.has(code) && mem.codeToOwner.get(code) !== wallet) {
    code = createHash("sha256")
      .update(`form8-invite-v1:${wallet}:${n++}`)
      .digest("hex")
      .slice(0, 8);
  }
  mem.ownerToCode.set(wallet, code);
  mem.codeToOwner.set(code, wallet);
  return code;
}

export async function resolveInviteCode(codeRaw: string): Promise<string | null> {
  const code = normalizeInviteCode(codeRaw);
  if (!code) return null;
  const r = await tryRedis(async () => (await redis!.get<string>(`inv:code:${code}`)) ?? null);
  if (r.ok) return r.value;
  return mem.codeToOwner.get(code) ?? null;
}

export async function getInviteCount(seasonId: number, inviter: string): Promise<number> {
  const r = await tryRedis(async () => {
    const raw = await redis!.get<number | string>(countKey(seasonId, inviter));
    return Number(raw ?? 0);
  });
  if (r.ok) return r.value;
  return mem.counts.get(countKey(seasonId, inviter)) ?? 0;
}

/** All invite SP bonuses for a season (wallet → points). */
export async function getSeasonInviteBonuses(
  seasonId: number,
): Promise<Record<string, number>> {
  const r = await tryRedis(async () => {
    const raw = (await redis!.hgetall<Record<string, string | number>>(bonusKey(seasonId))) ?? {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
    return out;
  });
  if (r.ok) return r.value;
  const m = mem.bonuses.get(String(seasonId));
  if (!m) return {};
  return Object.fromEntries(m.entries());
}

export async function getInviteMe(walletRaw: string): Promise<InviteMePayload | null> {
  const wallet = normalizeWallet(walletRaw);
  if (!wallet) return null;
  const code = await ensureInviteCode(wallet);
  if (!code) return null;
  const seasonId = CURRENT_SEASON.id;
  const inviteCount = await getInviteCount(seasonId, wallet);
  const seasonRegs = await countSeasonRegistrations(wallet);
  return {
    wallet,
    code,
    linkPath: `/?inv=${code}`,
    seasonId,
    inviteCount,
    inviterPointsPer: SP_INVITE_REFERRER,
    inviteePointsPer: SP_INVITE_REFEREE,
    canEnterInviteCode: seasonRegs === 0,
  };
}

/** Season event IDs that can hold an Entry for first-reg checks. */
export async function listSeasonEventIdsForInvite(): Promise<number[]> {
  const ids = [...CURRENT_SEASON.wcTourIds];
  if (CURRENT_SEASON.eplStartGw > 0) {
    const highest = await findHighestGameweekId();
    const cap = seasonEplCap(highest);
    for (let gw = CURRENT_SEASON.eplStartGw; gw <= cap; gw++) ids.push(gw);
  }
  return ids;
}

export async function countSeasonRegistrations(owner: string): Promise<number> {
  const ids = await listSeasonEventIdsForInvite();
  let count = 0;
  const batch = 8;
  for (let i = 0; i < ids.length; i += batch) {
    const slice = ids.slice(i, i + batch);
    const flags = await Promise.all(slice.map((id) => hasRegisteredTeam(owner, id)));
    count += flags.filter(Boolean).length;
  }
  return count;
}

async function readAward(
  seasonId: number,
  invitee: string,
): Promise<InviteAwardRecord | null> {
  const key = awardKey(seasonId, invitee);
  const r = await tryRedis(async () => {
    const raw = await redis!.get<string | InviteAwardRecord>(key);
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as InviteAwardRecord;
      } catch {
        return null;
      }
    }
    return raw;
  });
  if (r.ok) return r.value;
  return mem.awards.get(key) ?? null;
}

async function creditBonus(seasonId: number, wallet: string, points: number): Promise<void> {
  if (points <= 0) return;
  const r = await tryRedis(async () => {
    await redis!.hincrby(bonusKey(seasonId), wallet, points);
  });
  if (r.ok) return;
  const sid = String(seasonId);
  let m = mem.bonuses.get(sid);
  if (!m) {
    m = new Map();
    mem.bonuses.set(sid, m);
  }
  m.set(wallet, (m.get(wallet) ?? 0) + points);
}

async function incrInviteCount(seasonId: number, inviter: string): Promise<number> {
  const key = countKey(seasonId, inviter);
  const r = await tryRedis(async () => {
    return await redis!.incr(key);
  });
  if (r.ok) return r.value;
  const next = (mem.counts.get(key) ?? 0) + 1;
  mem.counts.set(key, next);
  return next;
}

/**
 * Claim invite SP after invitee's first season squad registration.
 * Idempotent per invitee×season.
 */
export async function claimInviteAward(opts: {
  invitee: string;
  code: string;
}): Promise<ClaimInviteResult> {
  if (!CURRENT_SEASON.enabled) {
    return { ok: false, reason: "season_inactive" };
  }

  const invitee = normalizeWallet(opts.invitee);
  if (!invitee) return { ok: false, reason: "invalid_invitee" };

  const code = normalizeInviteCode(opts.code);
  if (!code) return { ok: false, reason: "invalid_code" };

  const inviter = await resolveInviteCode(code);
  if (!inviter) return { ok: false, reason: "unknown_code" };

  if (inviter.toLowerCase() === invitee.toLowerCase()) {
    return { ok: false, reason: "self_invite" };
  }

  const seasonId = CURRENT_SEASON.id;
  const existing = await readAward(seasonId, invitee);
  if (existing) {
    return { ok: true, award: existing, alreadyAwarded: true };
  }

  const regs = await countSeasonRegistrations(invitee);
  if (regs < 1) return { ok: false, reason: "not_registered" };
  if (regs > 1) return { ok: false, reason: "not_first_season_reg" };

  const inviterPoints = SP_INVITE_REFERRER;
  const inviteePoints = SP_INVITE_REFEREE;

  const award: InviteAwardRecord = {
    inviter,
    invitee,
    code,
    seasonId,
    inviterPoints,
    inviteePoints,
    at: Date.now(),
  };

  const key = awardKey(seasonId, invitee);
  const wrote = await tryRedis(async () => {
    const set = await redis!.set(key, JSON.stringify(award), { nx: true });
    return set === "OK";
  });

  if (wrote.ok) {
    if (!wrote.value) {
      const again = await readAward(seasonId, invitee);
      if (again) return { ok: true, award: again, alreadyAwarded: true };
    }
  } else {
    if (mem.awards.has(key)) {
      return { ok: true, award: mem.awards.get(key)!, alreadyAwarded: true };
    }
    mem.awards.set(key, award);
  }

  await creditBonus(seasonId, invitee, inviteePoints);
  if (inviterPoints > 0) {
    await creditBonus(seasonId, inviter, inviterPoints);
    await incrInviteCount(seasonId, inviter);
  }

  return { ok: true, award };
}

export function inviteBonusForOwner(
  bonuses: Record<string, number>,
  owner: string,
): number {
  return Number(lookupByWalletKey(bonuses, owner) ?? 0);
}
