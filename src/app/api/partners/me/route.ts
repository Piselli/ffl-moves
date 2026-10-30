import { NextRequest, NextResponse } from "next/server";
import {
  isPartnersDevLoginAllowed,
  isPartnersGoogleConfigured,
  readPartnerSession,
  resolvePartnerFromSession,
} from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const resolved = resolvePartnerFromSession(readPartnerSession(req));
  if (!resolved) {
    return NextResponse.json(
      {
        authenticated: false,
        googleConfigured: isPartnersGoogleConfigured(),
        devLoginAllowed: isPartnersDevLoginAllowed(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { session, partner } = resolved;
  return NextResponse.json(
    {
      authenticated: true,
      email: session.email,
      partner: {
        id: partner.id,
        label: partner.label,
        codes: partner.codes,
      },
      googleConfigured: isPartnersGoogleConfigured(),
      devLoginAllowed: isPartnersDevLoginAllowed(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
