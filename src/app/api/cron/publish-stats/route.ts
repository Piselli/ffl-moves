import { NextResponse } from "next/server";
import { runAutoPublishStats } from "@/lib/server/autoPublishStats";
import { safeEqual } from "@/lib/server/clientIp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** London — same region as the other cron routes. */
export const preferredRegion = "lhr1";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

/**
 * Publish fresh API-Sports stats for the CLOSED gameweek to the site after matches finish.
 * Site display only — never writes anything on-chain.
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 * Query: ?dryRun=1 — fetch + audit, write nothing
 *        ?force=1  — publish even if no new match finished (all safety rules still apply)
 *
 * Env:
 *   CRON_SECRET                  — required
 *   API_SPORTS_KEY               — required
 *   AUTO_PUBLISH_STATS_ENABLED   — default on; set "false" to disable
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = url.searchParams.get("force") === "1";

  try {
    const result = await runAutoPublishStats({ origin: url.origin, dryRun, force });
    if (result.action === "refused") {
      // Not a crash — a safety rule stopped the publish. Surface it in the logs.
      console.error("publish-stats refused:", result);
    }
    return NextResponse.json({
      ok: result.action !== "refused",
      at: new Date().toISOString(),
      dryRun,
      ...result,
    });
  } catch (error) {
    console.error("publish-stats cron failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/** POST allowed for external cron services that prefer POST. */
export async function POST(request: Request) {
  return GET(request);
}
