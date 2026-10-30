import { NextRequest, NextResponse } from "next/server";
import {
  PARTNER_OAUTH_NEXT_COOKIE,
  PARTNER_OAUTH_STATE_COOKIE,
  clearPartnerAuthCookie,
  emailFingerprint,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  partnersGoogleRedirectUri,
  sanitizePartnerNextPath,
} from "@/lib/partners/googleAuth";
import {
  isPartnersGoogleConfigured,
  partnerSessionCookieOptions,
  sealPartnerSession,
} from "@/lib/partners/session";
import { resolveReferralPartnerByEmail } from "@/lib/referralPartners";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/partners?err=${encodeURIComponent(code)}`, origin));

  if (!isPartnersGoogleConfigured()) return fail("google_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return fail(err);
  if (!code || !state) return fail("missing_code");

  const expectState = req.cookies.get(PARTNER_OAUTH_STATE_COOKIE)?.value;
  const next = sanitizePartnerNextPath(
    req.cookies.get(PARTNER_OAUTH_NEXT_COOKIE)?.value,
  );
  if (!expectState || state !== expectState) return fail("bad_state");

  try {
    const clientId = process.env.PARTNERS_GOOGLE_CLIENT_ID!.trim();
    const clientSecret = process.env.PARTNERS_GOOGLE_CLIENT_SECRET!.trim();
    const redirectUri = partnersGoogleRedirectUri(origin);
    const tokens = await exchangeGoogleCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });
    const me = await fetchGoogleUserInfo(tokens.access_token);
    if (!me.emailVerified) return fail("email_unverified");

    const partner = resolveReferralPartnerByEmail(me.email);
    if (!partner) {
      console.warn(
        `[partners/auth] email not whitelisted fp=${emailFingerprint(me.email)}`,
      );
      return fail("not_allowed");
    }

    const sealed = sealPartnerSession({
      partnerId: partner.id,
      email: me.email,
    });

    const res = NextResponse.redirect(new URL(next, origin));
    res.cookies.set(partnerSessionCookieOptions(sealed));
    res.cookies.set(clearPartnerAuthCookie(PARTNER_OAUTH_STATE_COOKIE));
    res.cookies.set(clearPartnerAuthCookie(PARTNER_OAUTH_NEXT_COOKIE));
    return res;
  } catch (e) {
    console.error("[partners/auth/callback]", e);
    return fail("oauth_failed");
  }
}
