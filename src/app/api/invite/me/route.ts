import { NextRequest, NextResponse } from "next/server";
import { getInviteMe } from "@/lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function publicInviteLink(linkPath: string): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://form8.football";
  return `${origin}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}`;
}

/**
 * GET /api/invite/me?wallet=
 * Returns (or creates) the caller's invite code + season stats.
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet")?.trim() ?? "";
    const me = await getInviteMe(wallet);
    if (!me) {
      return NextResponse.json(
        { ok: false, reason: "invalid_wallet" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      { ok: true, ...me, link: publicInviteLink(me.linkPath) },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
