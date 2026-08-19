import { NextResponse, type NextRequest } from "next/server";

import {
  isDesignLabPublic,
  isDesignPreviewPublic,
  isLocalPreviewHost,
  isPublicFlagEnabled,
} from "@/lib/localPreviewAccess";

function localOnlyRedirect(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (isLocalPreviewHost(host)) return null;
  return NextResponse.redirect(new URL("/", request.url));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  if (pathname === "/world-cup" || pathname.startsWith("/world-cup/")) {
    if (!isPublicFlagEnabled("NEXT_PUBLIC_WC_PUBLIC_ENABLED")) {
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
    "/design-lab",
    "/design-lab/:path*",
    "/design-preview",
    "/design-preview/:path*",
  ],
};
