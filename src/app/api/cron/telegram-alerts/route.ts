import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/server/clientIp";
import { announceInjuryFlags } from "@/lib/server/telegram/announceInjuryFlags";
import { runTelegramAlerts } from "@/lib/server/telegram/runAlerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "lhr1";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (safeEqual(header, `Bearer ${secret}`)) return true;
  if (process.env.CRON_ALLOW_QUERY_SECRET === "true") {
    const provided = new URL(request.url).searchParams.get("secret") ?? "";
    if (provided && safeEqual(provided, secret)) return true;
  }
  return false;
}

/**
 * Evaluate and send FORM8 Telegram alerts (registration, deadline, claim).
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 * Query: ?dryRun=1 — claim slots + report without broadcasting
 *         ?unstick=deadline_24h — drop a stuck slot then evaluate (comma-separated)
 *         ?announce=injuries — one-shot feature news (injury flags + photos)
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const announce = url.searchParams.get("announce")?.trim().toLowerCase() ?? "";
  const unstickRaw = url.searchParams.get("unstick")?.trim() ?? "";
  const unstickKinds = unstickRaw
    ? unstickRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  try {
    if (announce === "injuries" || announce === "injury_flags") {
      const result = await announceInjuryFlags({ dryRun });
      return NextResponse.json({
        at: new Date().toISOString(),
        dryRun,
        announce: "injuries",
        ...result,
      });
    }

    const result = await runTelegramAlerts({ dryRun, unstickKinds });
    return NextResponse.json({ at: new Date().toISOString(), dryRun, ...result });
  } catch (error) {
    console.error("telegram-alerts cron failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
