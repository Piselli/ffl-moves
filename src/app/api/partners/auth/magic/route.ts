import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { verifyPartnerMagicToken } from "@/lib/partners/magicLink";
import {
  partnerSessionCookieOptions,
  sealPartnerSession,
} from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/partners/auth/magic?t=TOKEN
 * One-click invite login for whitelisted partner emails (no Google required).
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/partners?err=${encodeURIComponent(code)}`, origin));

  const gate = await rateLimit(`partner:magic:${clientIp(req)}`, 30, 60);
  if (!gate.ok) return fail("rate_limited");

  const token = req.nextUrl.searchParams.get("t") ?? "";
  const payload = verifyPartnerMagicToken(token);
  if (!payload) return fail("magic_invalid");

  try {
    const sealed = sealPartnerSession({
      partnerId: payload.partnerId,
      email: payload.email,
    });
    const res = NextResponse.redirect(new URL("/partners", origin));
    res.cookies.set(partnerSessionCookieOptions(sealed));
    return res;
  } catch (e) {
    console.error("[partners/auth/magic]", e);
    return fail("oauth_failed");
  }
}
