import { NextResponse, type NextRequest } from "next/server";

import {
  isDesignLabPublic,
  isDesignPreviewPublic,
  isLocalPreviewHost,
} from "@/lib/localPreviewAccess";
import { parseShortReferralPath } from "@/lib/referralLink";

function localOnlyRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (isLocalPreviewHost(host)) return null;
  return NextResponse.redirect(new URL("/", request.url));
}

/**
 * Webmaster short links → classic attribution query.
 *   /r/bonus50          → /?ref=bonus50
 *   /r/bonus50/creo1    → /?ref=bonus50&c=creo1
 *   /r/bonus50?s=creo1  → /?ref=bonus50&c=creo1  (sub-id alias)
 */
function shortReferralRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/r" || pathname === "/r/") {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
  const parsed = parseShortReferralPath(pathname);
  if (!parsed) return null;

  const sub =
    searchParams.get("c") ||
    searchParams.get("s") ||
    searchParams.get("sub") ||
    searchParams.get("sub1") ||
    searchParams.get("sid");
  const campaign = parsed.campaign || (sub ? String(sub) : "");

  const dest = request.nextUrl.clone();
  dest.pathname = "/";
  dest.searchParams.set("ref", parsed.code);
  if (campaign) dest.searchParams.set("c", campaign);
  else dest.searchParams.delete("c");
  // Drop short-link aliases so the landing URL stays clean.
  for (const k of ["s", "sub", "sub1", "sid"]) dest.searchParams.delete(k);
  return NextResponse.redirect(dest, 302);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const shortRef = shortReferralRedirect(request);
  if (shortRef) return shortRef;

  // Oracle stats: prefer Redis/API over a stale `public/data/stats/*.json`.
  const statsMatch = pathname.match(/^\/data\/stats\/(\d+)\.json$/);
  if (statsMatch) {
    return NextResponse.rewrite(
      new URL(`/api/oracle/stats/${statsMatch[1]}`, request.url),
    );
  }

  // Legacy World Cup promo — permanently gone (404 via rewrite to not-found).
  if (pathname === "/world-cup" || pathname.startsWith("/world-cup/")) {
    return NextResponse.rewrite(new URL("/not-found-wc", request.url));
  }

  if (pathname === "/risk-disclosure" || pathname.startsWith("/risk-disclosure/")) {
    return NextResponse.redirect(new URL("/risk", request.url), 308);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const blocked = localOnlyRedirect(request);
    if (blocked) return blocked;
    return NextResponse.next();
  }

  if (pathname === "/design-lab" || pathname.startsWith("/design-lab/")) {
    const last = pathname.split("/").pop() ?? "";
    const isStaticAsset = last.includes(".");
    if (!isStaticAsset && !isDesignLabPublic()) {
      const blocked = localOnlyRedirect(request);
      if (blocked) return blocked;
    }
    return NextResponse.next();
  }

  if (pathname === "/design-preview" || pathname.startsWith("/design-preview/")) {
    if (!isDesignPreviewPublic()) {
      const blocked = localOnlyRedirect(request);
      if (blocked) return blocked;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/r",
    "/r/:path*",
    "/data/stats/:path*",
    "/world-cup",
    "/world-cup/:path*",
    "/risk-disclosure",
    "/risk-disclosure/:path*",
    "/admin",
    "/admin/:path*",
    "/design-lab",
    "/design-lab/:path*",
    "/design-preview",
    "/design-preview/:path*",
  ],
};
