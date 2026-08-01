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

/** Browser-like headers — PL CDN 403s bare bots on many 250×250 assets. */
const UPSTREAM_HEADERS = {
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * PL headshots often 403 at 250×250 for new / transferred players while 110×140 works.
 * Also try png↔jpg.
 */
function expandPremierLeaguePhotoUrls(upstreamUrl: string): string[] {
  try {
    const u = new URL(upstreamUrl);
    if (u.hostname !== "resources.premierleague.com") return [upstreamUrl];
    const m = u.pathname.match(
      /^\/premierleague\/photos\/players\/(\d+x\d+)\/(p\d+)\.(png|jpe?g)$/i,
    );
    if (!m) return [upstreamUrl];
    const file = m[2]!;
    const sizes = ["250x250", "110x140"] as const;
    const exts = ["png", "jpg"] as const;
    const out: string[] = [];
    const seen = new Set<string>();
    const push = (path: string) => {
      if (seen.has(path)) return;
      seen.add(path);
      out.push(`https://resources.premierleague.com${path}`);
    };
    // Prefer the requested URL first, then other size/ext combos.
    push(u.pathname);
    for (const size of sizes) {
      for (const ext of exts) {
        push(`/premierleague/photos/players/${size}/${file}.${ext}`);
      }
    }
    return out;
  } catch {
    return [upstreamUrl];
  }
}

async function fetchUpstreamImage(upstreamUrl: string): Promise<Response | null> {
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: UPSTREAM_HEADERS,
      cache: "no-store",
    });
    if (!upstream.ok) return null;
    const contentType = upstream.headers.get("content-type") || "";
    // PL sometimes returns XML/HTML error bodies with a 200 — reject non-images.
    if (contentType && !contentType.startsWith("image/")) return null;
    return upstream;
  } catch (err) {
    console.error("player-photo upstream attempt failed:", err);
    return null;
  }
}

async function proxyImage(upstreamUrl: string) {
  const candidates = expandPremierLeaguePhotoUrls(upstreamUrl);

  for (let attempt = 0; attempt < candidates.length; attempt++) {
    if (attempt > 0) await sleep(40);
    const upstream = await fetchUpstreamImage(candidates[attempt]!);
    if (!upstream) continue;

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/png";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  return new NextResponse(null, { status: 502 });
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
