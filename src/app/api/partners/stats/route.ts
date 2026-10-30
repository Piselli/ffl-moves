import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { buildPartnerStatsPayload } from "@/lib/partners/statsPayload";
import {
  readPartnerSession,
  resolvePartnerFromSession,
} from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await rateLimit(`partner:cabinet:${clientIp(req)}`, 60, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  const resolved = resolvePartnerFromSession(readPartnerSession(req));
  if (!resolved) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = await buildPartnerStatsPayload(resolved.partner);
  return NextResponse.json(
    {
      ...payload,
      wallet: resolved.session.wallet,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
