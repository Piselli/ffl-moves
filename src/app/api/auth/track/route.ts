import { NextRequest, NextResponse } from "next/server";
import {
  normalizeAuthMethod,
  normalizeProvider,
  recordAuthConnect,
} from "@/lib/authConnect";
import { normalizeWallet } from "@/lib/walletNormalize";
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
 * POST /api/auth/track
 *
 * Body: { wallet: string, method: "wallet" | "email" | "passkey", provider?: string }
 *
 * Fire-and-forget from the client. Always returns 200 so tracking never breaks UX.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await rateLimit(`auth:track:${clientIp(req)}`, 60, 60);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, reason: "rate_limited" },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      wallet?: string;
      method?: string;
      provider?: string;
    };

    const wallet = normalizeWallet(body.wallet);
    const method = normalizeAuthMethod(body.method);
    if (!wallet || !method) {
      return NextResponse.json(
        { ok: false, reason: "invalid" },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    await recordAuthConnect({
      wallet,
      method,
      provider: method === "wallet" ? normalizeProvider(body.provider) : null,
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
