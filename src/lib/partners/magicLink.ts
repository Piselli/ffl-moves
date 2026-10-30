/**
 * Signed invite links for /partners — works without Google OAuth.
 * Token is HMAC-sealed email + partnerId + expiry.
 */
import { createHmac, timingSafeEqual } from "crypto";
import {
  normalizePartnerEmail,
  resolveReferralPartnerByEmail,
  type ReferralPartner,
} from "@/lib/referralPartners";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

function secret(): string {
  return (
    process.env.PARTNERS_SESSION_SECRET?.trim() ||
    process.env.MATCHDAY_SESSION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "partners-dev-secret-change-me"
  );
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export type PartnerMagicPayload = {
  email: string;
  partnerId: string;
  exp: number;
};

export function mintPartnerMagicToken(
  emailRaw: string,
  opts?: { ttlMs?: number; partnerId?: string },
): { token: string; partner: ReferralPartner; email: string; exp: number } {
  const email = normalizePartnerEmail(emailRaw);
  if (!email) throw new Error("Invalid email");
  const partner = resolveReferralPartnerByEmail(email);
  if (!partner) throw new Error("Email not on partner whitelist");
  if (opts?.partnerId && opts.partnerId !== partner.id) {
    throw new Error("Email does not belong to that partner");
  }
  const exp = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
  const payload = b64url(JSON.stringify({ email, partnerId: partner.id, exp }));
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return { token: `${payload}.${sig}`, partner, email, exp };
}

export function verifyPartnerMagicToken(
  token: string | null | undefined,
): PartnerMagicPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = b64url(createHmac("sha256", secret()).update(payload).digest());
  try {
    const a = Buffer.from(expect);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(fromB64url(payload).toString("utf8")) as PartnerMagicPayload;
    if (!data?.email || !data?.partnerId || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    const email = normalizePartnerEmail(data.email);
    if (!email) return null;
    const partner = resolveReferralPartnerByEmail(email);
    if (!partner || partner.id !== data.partnerId) return null;
    return { email, partnerId: partner.id, exp: data.exp };
  } catch {
    return null;
  }
}

export function partnerMagicLoginUrl(base: string, token: string): string {
  const root = base.replace(/\/$/, "");
  return `${root}/api/partners/auth/magic?t=${encodeURIComponent(token)}`;
}
