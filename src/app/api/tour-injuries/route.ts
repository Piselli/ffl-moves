import { NextRequest, NextResponse } from "next/server";
import { getTourInjuries } from "@/lib/server/tourInjuries";

export const dynamic = "force-dynamic";
export const preferredRegion = ["lhr1", "iad1"];
export const maxDuration = 30;

/**
 * GET /api/tour-injuries?gw=8
 * API-Sports injuries for the EPL round, keyed by apiId.
 */
export async function GET(req: NextRequest) {
  const gwRaw = req.nextUrl.searchParams.get("gw");
  const gw = Number(gwRaw);
  if (!Number.isFinite(gw) || gw < 1 || gw > 38) {
    return NextResponse.json(
      { error: "Query gw (1–38) required." },
      { status: 400 },
    );
  }

  try {
    const payload = await getTourInjuries(gw);
    return NextResponse.json(payload, {
      headers: {
        // Browser may keep briefly; server cache is the real TTL.
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load injuries";
    const status = /rate limit/i.test(message)
      ? 429
      : /not set/i.test(message)
        ? 503
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
