import { NextRequest, NextResponse } from "next/server";
import {
  apiSportsPlayerPhotoUrl,
  eaFaceUrl,
  isProxiedPhotoHost,
} from "@/lib/playerPhoto";
import {
  hostNeedsWhiteBgStrip,
  stripWhitePhotoBackground,
} from "@/lib/stripWhitePhotoBg";

/**
 * GET /api/player-photo?eaId=239085
 * GET /api/player-photo?apiId=874
 * GET /api/player-photo?url=https://media.api-sports.io/football/players/278.png
 *
 * Proxies player portraits (EA FC27 faces + API-Sports + Premier League CDN)
 * so squad UIs can load photos from the same origin.
 * API-Sports white studio plates are stripped to transparency.
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

const FUTWIZ_HEADERS = {
  Accept: "image/png,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://www.futwiz.com/",
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

function headersForHost(hostname: string): Record<string, string> {
  return hostname === "cdn.futwiz.com" ? FUTWIZ_HEADERS : UPSTREAM_HEADERS;
}

async function fetchUpstreamImage(upstreamUrl: string): Promise<Response | null> {
  try {
    const hostname = new URL(upstreamUrl).hostname;
    const upstream = await fetch(upstreamUrl, {
      headers: headersForHost(hostname),
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

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

async function maybeStripWhiteBg(
  upstreamUrl: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  let hostname = "";
  try {
    hostname = new URL(upstreamUrl).hostname;
  } catch {
    return { body: bytes, contentType };
  }
  if (!hostNeedsWhiteBgStrip(hostname)) {
    return { body: bytes, contentType };
  }
  try {
    const stripped = await stripWhitePhotoBackground(Buffer.from(bytes));
    if (stripped) {
      return {
        body: bufferToArrayBuffer(stripped.buffer),
        contentType: stripped.contentType,
      };
    }
  } catch (err) {
    console.warn("player-photo white-bg strip failed:", err);
  }
  return { body: bytes, contentType };
}

async function proxyImage(upstreamUrl: string) {
  const candidates = expandPremierLeaguePhotoUrls(upstreamUrl);

  for (let attempt = 0; attempt < candidates.length; attempt++) {
    if (attempt > 0) await sleep(40);
    const candidate = candidates[attempt]!;
    const upstream = await fetchUpstreamImage(candidate);
    if (!upstream) continue;

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/png";
    const out = await maybeStripWhiteBg(candidate, bytes, contentType);
    return new NextResponse(out.body, {
      headers: {
        "Content-Type": out.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  return new NextResponse(null, { status: 502 });
}

export async function GET(req: NextRequest) {
  const eaIdRaw = req.nextUrl.searchParams.get("eaId");
  if (eaIdRaw) {
    const eaId = Number(eaIdRaw);
    if (!Number.isFinite(eaId) || eaId <= 0) {
      return NextResponse.json({ error: "Invalid eaId" }, { status: 400 });
    }
    try {
      return await proxyImage(eaFaceUrl(eaId));
    } catch (err) {
      console.error("player-photo EA face proxy failed:", err);
      return new NextResponse(null, { status: 502 });
    }
  }

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
    return NextResponse.json(
      { error: "Missing eaId, url, or apiId" },
      { status: 400 },
    );
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

  if (
    parsed.hostname === "cdn.futwiz.com" &&
    !/^\/assets\/img\/fc\d+\/faces\/\d+\.png$/i.test(parsed.pathname)
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
