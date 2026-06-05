import { NextRequest, NextResponse } from "next/server";
import { isProxiedPhotoHost } from "@/lib/playerPhoto";

/**
 * GET /api/player-photo?url=https://media.api-sports.io/football/players/278.png
 *
 * Proxies player portraits (API-Sports + Premier League CDN) so squad UIs can load
 * photos from the same origin. Upstream fetch is never cached — avoids sticky 404s in dev.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !isProxiedPhotoHost(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  if (
    parsed.hostname === "media.api-sports.io" &&
    !parsed.pathname.startsWith("/football/players/")
  ) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 400 });
  }

  if (
    parsed.hostname === "resources.premierleague.com" &&
    !parsed.pathname.startsWith("/premierleague/photos/players/")
  ) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: "image/*" },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/png";

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("player-photo proxy failed:", err);
    return new NextResponse(null, { status: 502 });
  }
}
