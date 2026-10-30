import { NextRequest, NextResponse } from "next/server";
import {
  getAuthConnectHealth,
  getAuthConnectStats,
  isAuthConnectStoreDurable,
} from "@/lib/authConnect";
import { findActiveGameweek, getConfig, getGameweek } from "@/lib/chainClient";
import { clientIp, safeEqual } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/stats
 *
 * Unique connects by method + current gameweek squad registrations.
 * Gated by REFERRAL_ADMIN_KEY (same soft-admin key as /admin/referrals).
 *
 * Helius dashboard WaaS Analytics has no public API — email/passkey counts
 * come from our own connect tracking (same pipeline as extension wallets).
 */
export async function GET(req: NextRequest) {
  const gate = await rateLimit(`admin:auth:${clientIp(req)}`, 30, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  const expected = process.env.REFERRAL_ADMIN_KEY;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Auth dashboard disabled: set REFERRAL_ADMIN_KEY in the environment.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const provided = req.headers.get("x-referral-key") ?? searchParams.get("key") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [auth, health] = await Promise.all([
    getAuthConnectStats(),
    getAuthConnectHealth(),
  ]);

  let registrations: {
    gameweekId: number | null;
    status: string | null;
    totalEntries: number | null;
    error: string | null;
  } = {
    gameweekId: null,
    status: null,
    totalEntries: null,
    error: null,
  };

  try {
    const active = await findActiveGameweek();
    if (active) {
      registrations = {
        gameweekId: active.id,
        status: active.status,
        totalEntries: active.totalEntries,
        error: null,
      };
    } else {
      const config = await getConfig();
      if (config?.currentGameweek) {
        const gw = await getGameweek(config.currentGameweek);
        registrations = {
          gameweekId: config.currentGameweek,
          status: gw?.status ?? null,
          totalEntries: gw?.totalEntries ?? null,
          error: gw ? null : "Gameweek account not found",
        };
      } else {
        registrations = {
          gameweekId: null,
          status: null,
          totalEntries: null,
          error: "No active gameweek",
        };
      }
    }
  } catch (e) {
    registrations = {
      gameweekId: null,
      status: null,
      totalEntries: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const uniqueConnects = auth.uniqueWallets;
  const squads = registrations.totalEntries ?? 0;
  const connectToRegister =
    uniqueConnects > 0 && registrations.totalEntries != null
      ? squads / uniqueConnects
      : null;

  return NextResponse.json(
    {
      durable: isAuthConnectStoreDurable() && health.reachable,
      health,
      auth,
      registrations,
      funnel: {
        uniqueConnects,
        registeredSquads: registrations.totalEntries,
        connectToRegisterRate: connectToRegister,
      },
      note:
        "Helius WaaS Analytics (dashboard) has no public API. Email / passkey numbers here are tracked in-app on successful auth — same store as Phantom/Solflare connects. Counts start from deploy of this tracker.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
