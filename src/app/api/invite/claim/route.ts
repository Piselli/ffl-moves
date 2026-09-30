import { NextRequest, NextResponse } from "next/server";
import { claimInviteAward } from "@/lib/invite";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

/**
 * POST /api/invite/claim
 * Body: { invitee: string, code: string }
 *
 * Verifies first season registration on-chain and credits invite SP.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await rateLimit(`invite:claim:${clientIp(req)}`, 20, 60);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, reason: "rate_limited" },
        { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(gate.retryAfterSec) } },
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      invitee?: string;
      code?: string;
    };

    const result = await claimInviteAward({
      invitee: body.invitee ?? "",
      code: body.code ?? "",
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        alreadyAwarded: result.alreadyAwarded === true,
        award: result.award,
      },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "claim failed";
    return NextResponse.json(
      { ok: false, reason: "error", error: message },
      { status: 200, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
