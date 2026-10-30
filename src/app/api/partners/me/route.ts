import { NextRequest, NextResponse } from "next/server";
import { getEffectivePartnerCodes } from "@/lib/partners/partnerCodes";
import {
  readPartnerSession,
  resolvePartnerFromSession,
} from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = resolvePartnerFromSession(readPartnerSession(req));
  if (!resolved) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { session, partner } = resolved;
  const codes = await getEffectivePartnerCodes(partner.id);
  return NextResponse.json(
    {
      authenticated: true,
      wallet: session.wallet,
      partner: {
        id: partner.id,
        label: partner.label,
        codes,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
