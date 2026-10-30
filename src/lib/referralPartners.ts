/**
 * Partner-scoped referral access for Google Sheets / partner cabinet.
 *
 * Env `REFERRAL_PARTNERS` — JSON array:
 *   [{
 *     "id": "acme",
 *     "label": "Acme",
 *     "key": "secret",
 *     "codes": ["acme", "acme2"],
 *     "emails": ["partner@gmail.com"]
 *   }]
 *
 * `key` unlocks Sheets/API export. `emails` unlocks the /partners web cabinet
 * (Google sign-in). Each partner only sees their own codes.
 */
import { normalizeCode, type ReferralStat } from "@/lib/referral";
import { safeEqual } from "@/lib/server/clientIp";

export type ReferralPartner = {
  id: string;
  label: string;
  key: string;
  codes: string[];
  /** Lowercased allowlist for /partners Google login. */
  emails: string[];
};

export function normalizePartnerEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase().slice(0, 254);
  if (!email || !email.includes("@") || email.includes(" ")) return null;
  return email;
}

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
    const emailsRaw = Array.isArray(o.emails) ? o.emails : [];
    const emails = [
      ...new Set(
        emailsRaw
          .map((e) => (typeof e === "string" ? normalizePartnerEmail(e) : null))
          .filter((e): e is string => !!e),
      ),
    ];
    out.push({ id, label, key, codes, emails });
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

/** Resolve partner by whitelisted email (cabinet login). */
export function resolveReferralPartnerByEmail(
  rawEmail: string | null | undefined,
): ReferralPartner | null {
  const email = normalizePartnerEmail(rawEmail);
  if (!email) return null;
  for (const partner of getReferralPartners()) {
    if (partner.emails.includes(email)) return partner;
  }
  return null;
}

export function filterStatsForPartner(
  stats: ReferralStat[],
  partner: ReferralPartner,
): ReferralStat[] {
  const allow = new Set(partner.codes);
  return stats.filter((s) => allow.has(normalizeCode(s.code) ?? s.code));
}

/** Ensure every configured code appears even with zero traffic. */
export function fillMissingPartnerCodes(
  stats: ReferralStat[],
  partner: ReferralPartner,
): ReferralStat[] {
  const byCode = new Map(stats.map((s) => [normalizeCode(s.code) ?? s.code, s]));
  return partner.codes.map((code) => {
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
