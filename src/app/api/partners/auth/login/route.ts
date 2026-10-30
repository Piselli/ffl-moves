import { NextRequest, NextResponse } from "next/server";
import {
  PARTNER_OAUTH_NEXT_COOKIE,
  PARTNER_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizeUrl,
  createOAuthState,
  partnerAuthCookie,
  partnersGoogleRedirectUri,
  sanitizePartnerNextPath,
} from "@/lib/partners/googleAuth";
import { isPartnersGoogleConfigured } from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isPartnersGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/partners?err=google_not_configured", req.url),
    );
  }

  const clientId = process.env.PARTNERS_GOOGLE_CLIENT_ID!.trim();
  const next = sanitizePartnerNextPath(req.nextUrl.searchParams.get("next"));
  const origin = req.nextUrl.origin;
  const redirectUri = partnersGoogleRedirectUri(origin);
  const state = createOAuthState();
  const authorize = buildGoogleAuthorizeUrl({
    clientId,
    redirectUri,
    state,
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>FORM8 Partners</title><script>location.replace(${JSON.stringify(authorize)})</script><noscript><meta http-equiv="refresh" content="0;url=${authorize.replace(/"/g, "&quot;")}"></noscript></head><body style="background:#0D0F12"></body></html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
  res.cookies.set(partnerAuthCookie(PARTNER_OAUTH_STATE_COOKIE, state));
  res.cookies.set(partnerAuthCookie(PARTNER_OAUTH_NEXT_COOKIE, next));
  return res;
}
