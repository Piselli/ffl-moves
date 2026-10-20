import { NextResponse } from "next/server";
import { runRefreshFixturesCache } from "@/lib/server/refreshFixturesCache";
import { safeEqual } from "@/lib/server/clientIp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
/** London — FPL egress is more reliable than US regions. */
export const preferredRegion = "lhr1";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

/**
 * Refresh Redis FPL fixture cache for the active on-chain gameweek.
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 * Query: ?dryRun=1 — fetch only
 *        ?gw=N     — force a specific gameweek id
 *
 * Env:
 *   CRON_SECRET                     — required
 *   UPSTASH_REDIS_*                 — required for durable cache
 *   AUTO_REFRESH_FIXTURES_ENABLED   — default on; set "false" to disable
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const gwRaw = url.searchParams.get("gw");
  const parsedGw = gwRaw != null ? parseInt(gwRaw, 10) : NaN;
  const gameweekId = Number.isFinite(parsedGw) && parsedGw >= 1 ? parsedGw : undefined;

  try {
    const result = await runRefreshFixturesCache({ dryRun, gameweekId });
    return NextResponse.json({
      ok: result.action === "refreshed" || result.action === "skipped",
      at: new Date().toISOString(),
      dryRun,
      ...result,
    });
  } catch (error) {
    console.error("refresh-fixtures cron failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
