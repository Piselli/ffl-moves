import { NextResponse, type NextRequest } from "next/server";

import { isWorldCupPublicEnabled } from "@/lib/worldCupAccess";

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== "/world-cup" && !pathname.startsWith("/world-cup/")) {
    return NextResponse.next();
  }
  if (isWorldCupPublicEnabled()) return NextResponse.next();

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (LOCAL_PREVIEW_HOSTS.has(host)) return NextResponse.next();

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/world-cup", "/world-cup/:path*"],
};
