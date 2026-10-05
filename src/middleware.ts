import { NextResponse, type NextRequest } from "next/server";

import {
  isDesignLabPublic,
  isDesignPreviewPublic,
  isLocalPreviewHost,
} from "@/lib/localPreviewAccess";

function localOnlyRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (isLocalPreviewHost(host)) return null;
  return NextResponse.redirect(new URL("/", request.url));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy World Cup promo — permanently gone (404 via rewrite to not-found).
  if (pathname === "/world-cup" || pathname.startsWith("/world-cup/")) {
    return NextResponse.rewrite(new URL("/not-found-wc", request.url));
  }

  if (pathname === "/risk-disclosure" || pathname.startsWith("/risk-disclosure/")) {
    return NextResponse.redirect(new URL("/risk", request.url), 308);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Partner referral dashboard is key-gated in-page — allow on production.
    // Other /admin tools stay local-only.
    if (pathname === "/admin/referrals" || pathname.startsWith("/admin/referrals/")) {
      return NextResponse.next();
    }
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
