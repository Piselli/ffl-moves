import { NextRequest, NextResponse } from "next/server";
import { normalizeCode, recordClick, recordConversion } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

/**
 * POST /api/referral/track
 *
 * Body: { type: "click" | "conversion", code: string, wallet?: string }
 *
 * Fire-and-forget from the client. Always returns 200 (even on bad input) so
 * tracking never blocks or breaks the user-facing flow.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      type?: string;
      code?: string;
      wallet?: string;
    };

    const code = normalizeCode(body.code);
    if (!code) {
      return NextResponse.json({ ok: false, reason: "invalid code" }, { status: 200, headers: CORS_HEADERS });
    }

    if (body.type === "conversion") {
      await recordConversion(code, body.wallet ?? null);
    } else {
      await recordClick(code);
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch {
    // Never surface tracking errors to the client.
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
