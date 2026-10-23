import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/server/clientIp";
import { announceInjuryFlags } from "@/lib/server/telegram/announceInjuryFlags";
import { shouldChainDeadlineTicks } from "@/lib/server/telegram/deadlineWindows";
import { runTelegramAlerts } from "@/lib/server/telegram/runAlerts";
import { waitUntilCompat } from "@/lib/server/waitUntilCompat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "lhr1";

const CHAIN_HEADER = "x-form8-tg-chain";
/** ~3.3h of 55s ticks — covers 3h→1h→deadline even if GitHub sleeps. */
const CHAIN_MAX = 220;
const CHAIN_DELAY_MS = 55_000;

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

function chainDepth(request: Request): number {
  const raw = request.headers.get(CHAIN_HEADER);
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * After the response, schedule another tick. GitHub Actions `schedule` routinely
 * skips hours; once we are inside the last ~4h before kickoff we keep ourselves
 * alive until the deadline passes.
 */
function scheduleNextDeadlineTick(request: Request, depth: number): void {
  if (depth >= CHAIN_MAX) {
    console.warn("telegram-alerts chain: max depth reached", depth);
    return;
  }
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;

  const next = new URL(request.url);
  next.searchParams.delete("unstick");
  next.searchParams.delete("announce");
  next.searchParams.delete("dryRun");

  waitUntilCompat(
    (async () => {
      await new Promise((r) => setTimeout(r, CHAIN_DELAY_MS));
      const res = await fetch(next.toString(), {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          [CHAIN_HEADER]: String(depth + 1),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) {
        console.warn("telegram-alerts chain poke failed", res.status, `depth=${depth + 1}`);
      }
    })().catch((error) => {
      console.warn("telegram-alerts chain failed:", error);
    }),
  );
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
  const depth = chainDepth(request);

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
    const msUntil = result.checked?.msUntilDeadline;
    const chaining = !dryRun && shouldChainDeadlineTicks(msUntil);
    if (chaining) {
      scheduleNextDeadlineTick(request, depth);
    }

    return NextResponse.json({
      at: new Date().toISOString(),
      dryRun,
      chainDepth: depth,
      chaining,
      ...result,
    });
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
