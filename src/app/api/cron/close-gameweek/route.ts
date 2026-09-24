import { NextResponse } from "next/server";
import { runAutoCloseGameweek } from "@/lib/server/autoCloseGameweek";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** London — closer to FPL CDN. */
export const preferredRegion = "lhr1";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  // Manual ops / external cron
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  return false;
}

/**
 * Auto-close OPEN gameweek after registration deadline (first FPL kickoff).
 *
 * Auth: Authorization: Bearer $CRON_SECRET  (Vercel Cron sends this when CRON_SECRET is set)
 * Query: ?dryRun=1 — report without sending a tx
 *
 * Env:
 *   CRON_SECRET          — required
 *   ADMIN_KEYPAIR        — JSON secret key of on-chain admin (initializer)
 *   AUTO_CLOSE_ENABLED   — default on; set "false" to disable
 *   AUTO_CLOSE_LEAD_MS   — close this many ms before kickoff (default 0)
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const result = await runAutoCloseGameweek({ dryRun });
    const status = result.action === "closed" ? 200 : 200;
    return NextResponse.json(
      {
        ok: true,
        at: new Date().toISOString(),
        dryRun,
        ...result,
      },
      { status },
    );
  } catch (error) {
    console.error("auto-close cron failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/** POST allowed for external cron services that prefer POST. */
export async function POST(request: Request) {
  return GET(request);
}
