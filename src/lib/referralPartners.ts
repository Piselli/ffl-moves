/**
 * Partner-scoped referral access for Google Sheets / partner cabinet.
 *
 * Env `REFERRAL_PARTNERS` — JSON array:
 *   [{
 *     "id": "acme",
 *     "label": "Acme",
 *     "key": "secret",
 *     "codes": ["acme"],
 *     "wallets": ["SoLanaBase58Address…"]
 *   }]
 *
 * `key` → Sheets/API export. `wallets` → /partners cabinet (sign-in).
 * Extra codes created in the cabinet are stored in Redis (see partnerCodes.ts).
 */
import { normalizeCode, type ReferralStat } from "@/lib/referral";
import { safeEqual } from "@/lib/server/clientIp";
import { normalizeWallet } from "@/lib/walletNormalize";

export type ReferralPartner = {
  id: string;
  label: string;
  key: string;
  /** Seed codes from env (cabinet may add more in Redis). */
  codes: string[];
  /** Solana wallets allowed into /partners for this partner. */
  wallets: string[];
};

export function parseReferralPartners(raw: string | undefined | null): ReferralPartner[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: ReferralPartner[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim().slice(0, 64) : "";
    const key = typeof o.key === "string" ? o.key.trim() : "";
    if (!id || !key) continue;
    const label =
      typeof o.label === "string" && o.label.trim()
        ? o.label.trim().slice(0, 80)
        : id;
    const codesRaw = Array.isArray(o.codes) ? o.codes : [];
    const codes = [
      ...new Set(
        codesRaw
          .map((c) => (typeof c === "string" ? normalizeCode(c) : null))
          .filter((c): c is string => !!c),
      ),
    ];
    if (codes.length === 0) continue;
    const walletsRaw = Array.isArray(o.wallets) ? o.wallets : [];
    const wallets = [
      ...new Set(
        walletsRaw
          .map((w) => (typeof w === "string" ? normalizeWallet(w) : null))
          .filter((w): w is string => !!w),
      ),
    ];
    out.push({ id, label, key, codes, wallets });
  }
  return out;
}

export function getReferralPartners(): ReferralPartner[] {
  return parseReferralPartners(process.env.REFERRAL_PARTNERS);
}

/** Resolve partner by API key (constant-time vs each configured key). */
export function resolveReferralPartner(provided: string): ReferralPartner | null {
  const key = provided.trim();
  if (!key) return null;
  for (const partner of getReferralPartners()) {
    if (safeEqual(key, partner.key)) return partner;
  }
  return null;
}

/** Resolve partner by whitelisted wallet (cabinet login / nav). */
export function resolveReferralPartnerByWallet(
  rawWallet: string | null | undefined,
): ReferralPartner | null {
  const wallet = normalizeWallet(rawWallet);
  if (!wallet) return null;
  for (const partner of getReferralPartners()) {
    if (partner.wallets.includes(wallet)) return partner;
  }
  return null;
}

export function filterStatsForPartner(
  stats: ReferralStat[],
  codes: string[],
): ReferralStat[] {
  const allow = new Set(codes.map((c) => normalizeCode(c) ?? c));
  return stats.filter((s) => allow.has(normalizeCode(s.code) ?? s.code));
}

/** Ensure every configured code appears even with zero traffic. */
export function fillMissingPartnerCodes(
  stats: ReferralStat[],
  codes: string[],
): ReferralStat[] {
  const byCode = new Map(stats.map((s) => [normalizeCode(s.code) ?? s.code, s]));
  return codes.map((code) => {
    const existing = byCode.get(code);
    if (existing) return existing;
    return {
      code,
      clicks: 0,
      signups: 0,
      conversionRate: 0,
      firstSeen: null,
      lastActivity: null,
      estimatedFeeVolumeUsdc: 0,
    };
  });
}
