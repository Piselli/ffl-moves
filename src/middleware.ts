import { NextResponse, type NextRequest } from "next/server";

import { isWorldCupPublicEnabled } from "@/lib/worldCupAccess";

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const local = LOCAL_PREVIEW_HOSTS.has(host);

  if (pathname === "/design-lab" || pathname.startsWith("/design-lab/")) {
    const last = pathname.split("/").pop() ?? "";
    const isStaticAsset = last.includes(".");
    if (!isStaticAsset && !local && process.env.NEXT_PUBLIC_DESIGN_LAB_PUBLIC !== "true") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname !== "/world-cup" && !pathname.startsWith("/world-cup/")) {
    return NextResponse.next();
  }
  if (isWorldCupPublicEnabled()) return NextResponse.next();

  if (local) return NextResponse.next();

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/world-cup", "/world-cup/:path*", "/design-lab", "/design-lab/:path*"],
};
