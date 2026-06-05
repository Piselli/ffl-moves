import { NextRequest, NextResponse } from "next/server";
import { apiSportsPlayerPhotoUrl, isProxiedPhotoHost } from "@/lib/playerPhoto";

/**
 * GET /api/player-photo?apiId=874
 * GET /api/player-photo?url=https://media.api-sports.io/football/players/278.png
 *
 * Proxies player portraits (API-Sports + Premier League CDN) so squad UIs can load
 * photos from the same origin.
 */
export const dynamic = "force-dynamic";

const UPSTREAM_HEADERS = {
  Accept: "image/*",
  "User-Agent": "MoveMatch/1.0 (+https://movematch.xyz)",
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function proxyImage(upstreamUrl: string) {
  let lastStatus = 502;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(120 * attempt);

    try {
      const upstream = await fetch(upstreamUrl, {
        headers: UPSTREAM_HEADERS,
        cache: "no-store",
      });

      if (upstream.ok) {
        const bytes = await upstream.arrayBuffer();
        const contentType = upstream.headers.get("content-type") || "image/png";
        return new NextResponse(bytes, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }

      lastStatus = upstream.status === 404 ? 404 : 502;
      if (lastStatus === 404) break;
    } catch (err) {
      console.error("player-photo upstream attempt failed:", err);
      lastStatus = 502;
    }
  }

  return new NextResponse(null, { status: lastStatus });
}

export async function GET(req: NextRequest) {
  const apiIdRaw = req.nextUrl.searchParams.get("apiId");
  if (apiIdRaw) {
    const apiId = Number(apiIdRaw);
    if (!Number.isFinite(apiId) || apiId <= 0) {
      return NextResponse.json({ error: "Invalid apiId" }, { status: 400 });
    }
    try {
      return await proxyImage(apiSportsPlayerPhotoUrl(apiId));
    } catch (err) {
      console.error("player-photo proxy failed:", err);
      return new NextResponse(null, { status: 502 });
    }
  }

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url or apiId" }, { status: 400 });
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
    return await proxyImage(parsed.toString());
  } catch (err) {
    console.error("player-photo proxy failed:", err);
    return new NextResponse(null, { status: 502 });
  }
}
