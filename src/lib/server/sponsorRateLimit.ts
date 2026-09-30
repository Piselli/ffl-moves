/**
 * Abuse limits for /api/solana/sponsor-send (global via Upstash, in-memory fallback).
 *
 * Two layers:
 *  1. Attempt limits (per IP / per co-signing wallet per minute) — cheap, run early.
 *  2. Spend limits (daily) — only *successful* sends are recorded, so failed or
 *     rejected requests can never be used to exhaust the shared budget for others.
 *
 * Tunables (env, all optional):
 *   SOLANA_FEE_SPONSOR_DISABLED=true          kill switch (503 for every sponsored tx)
 *   SPONSOR_DAILY_BUDGET_LAMPORTS             global cap / 24h   (default 1 SOL)
 *   SPONSOR_MAX_TX_PER_WALLET_PER_DAY         default 30
 *   SPONSOR_MAX_TX_PER_IP_PER_DAY             default 200
 *   SPONSOR_MAX_TOPUP_LAMPORTS_PER_WALLET_DAY default 20_000_000 (0.02 SOL)
 */
import { incrWindow, peekWindow, rateLimit, type RateLimitResult } from "@/lib/server/rateLimit";

const MINUTE = 60;
const DAY = 86_400;

const MAX_PER_IP_PER_MIN = 20;
const MAX_PER_WALLET_PER_MIN = 8;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function isSponsorDisabled(): boolean {
  const v = process.env.SOLANA_FEE_SPONSOR_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function sponsorLimits() {
  return {
    dailyBudgetLamports: envInt("SPONSOR_DAILY_BUDGET_LAMPORTS", 1_000_000_000),
    maxTxPerWalletPerDay: envInt("SPONSOR_MAX_TX_PER_WALLET_PER_DAY", 30),
    maxTxPerIpPerDay: envInt("SPONSOR_MAX_TX_PER_IP_PER_DAY", 200),
    maxTopUpPerWalletPerDay: envInt("SPONSOR_MAX_TOPUP_LAMPORTS_PER_WALLET_DAY", 20_000_000),
  };
}

/** Early, cheap gate: one attempt per call, keyed by caller IP. */
export async function allowSponsorIpAttempt(ip: string): Promise<RateLimitResult> {
  return rateLimit(`sp:ip:min:${ip.trim() || "unknown"}`, MAX_PER_IP_PER_MIN, MINUTE);
}

/** Per co-signing wallet attempts (call only after signatures verified). */
export async function allowSponsorWalletAttempts(wallets: string[]): Promise<RateLimitResult> {
  for (const w of wallets) {
    if (!w) continue;
    const r = await rateLimit(`sp:wallet:min:${w}`, MAX_PER_WALLET_PER_MIN, MINUTE);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export type BudgetCheck =
  | { ok: true }
  | { ok: false; error: string; retryAfterSec: number };

/** Read-only check of the daily spend limits. */
export async function checkSponsorBudgets(opts: {
  ip: string;
  wallets: string[];
  costLamports: number;
  topUpLamports: number;
}): Promise<BudgetCheck> {
  const lim = sponsorLimits();

  const global = await peekWindow("sp:spend:day");
  if (global.count + opts.costLamports > lim.dailyBudgetLamports) {
    return {
      ok: false,
      error: "Fee sponsorship is temporarily at its daily limit. Try again later.",
      retryAfterSec: global.retryAfterSec,
    };
  }

  const ip = await peekWindow(`sp:ip:day:${opts.ip || "unknown"}`);
  if (ip.count >= lim.maxTxPerIpPerDay) {
    return {
      ok: false,
      error: "Too many sponsored transactions from this network today.",
      retryAfterSec: ip.retryAfterSec,
    };
  }

  for (const w of opts.wallets) {
    const tx = await peekWindow(`sp:wallet:day:${w}`);
    if (tx.count >= lim.maxTxPerWalletPerDay) {
      return {
        ok: false,
        error: "Daily sponsored transaction limit reached for this wallet.",
        retryAfterSec: tx.retryAfterSec,
      };
    }
    if (opts.topUpLamports > 0) {
      const top = await peekWindow(`sp:topup:day:${w}`);
      if (top.count + opts.topUpLamports > lim.maxTopUpPerWalletPerDay) {
        return {
          ok: false,
          error: "Daily rent top-up limit reached for this wallet.",
          retryAfterSec: top.retryAfterSec,
        };
      }
    }
  }
  return { ok: true };
}

/** Record a *successful* sponsored send against the daily counters. */
export async function recordSponsorSpend(opts: {
  ip: string;
  wallets: string[];
  costLamports: number;
  topUpLamports: number;
}): Promise<void> {
  try {
    await incrWindow("sp:spend:day", DAY, Math.max(1, opts.costLamports));
    await incrWindow(`sp:ip:day:${opts.ip || "unknown"}`, DAY, 1);
    for (const w of opts.wallets) {
      await incrWindow(`sp:wallet:day:${w}`, DAY, 1);
      if (opts.topUpLamports > 0) {
        await incrWindow(`sp:topup:day:${w}`, DAY, opts.topUpLamports);
      }
    }
  } catch (err) {
    console.warn("[sponsor] failed to record spend:", err);
  }
}
