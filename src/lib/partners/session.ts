/**
 * Sealed httpOnly session for /partners cabinet (wallet-bound).
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import {
  getReferralPartners,
  resolveReferralPartnerByWallet,
  type ReferralPartner,
} from "@/lib/referralPartners";
import { normalizeWallet } from "@/lib/walletNormalize";

export const PARTNER_SESSION_COOKIE = "ffl_partner_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export type PartnerSession = {
  partnerId: string;
  wallet: string;
};

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

export function sealPartnerSession(session: PartnerSession): string {
  const wallet = normalizeWallet(session.wallet);
  if (!wallet) throw new Error("invalid partner session wallet");
  const payload = b64url(
    JSON.stringify({
      partnerId: session.partnerId,
      wallet,
      exp: Date.now() + MAX_AGE_SEC * 1000,
    }),
  );
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function unsealPartnerSession(
  token: string | undefined | null,
): PartnerSession | null {
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
    const data = JSON.parse(fromB64url(payload).toString("utf8")) as PartnerSession & {
      exp?: number;
      email?: string; // legacy email sessions → reject
    };
    if (!data?.partnerId || !data?.wallet || data.email) return null;
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;
    const wallet = normalizeWallet(data.wallet);
    if (!wallet) return null;
    return { partnerId: String(data.partnerId).slice(0, 64), wallet };
  } catch {
    return null;
  }
}

export function partnerSessionCookieOptions(token: string) {
  return {
    name: PARTNER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function clearPartnerSessionCookie() {
  return {
    name: PARTNER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function readPartnerSession(req: NextRequest): PartnerSession | null {
  return unsealPartnerSession(req.cookies.get(PARTNER_SESSION_COOKIE)?.value);
}

/**
 * Re-check wallet whitelist on every request so removing a wallet from env
 * locks the cabinet after redeploy.
 */
export function resolvePartnerFromSession(
  session: PartnerSession | null,
): { session: PartnerSession; partner: ReferralPartner } | null {
  if (!session) return null;
  const partner = getReferralPartners().find((p) => p.id === session.partnerId);
  if (!partner) return null;
  if (!partner.wallets.includes(session.wallet)) return null;
  // Also ensure this wallet still maps to this partner id
  const byWallet = resolveReferralPartnerByWallet(session.wallet);
  if (!byWallet || byWallet.id !== partner.id) return null;
  return { session, partner };
}
