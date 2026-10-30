import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { resolveReferralPartnerByWallet } from "@/lib/referralPartners";
import { normalizeWallet } from "@/lib/walletNormalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET ?wallet= — whether this connected wallet should see the Partners nav tab.
 * Does not grant cabinet access (that still requires a signed login).
 */
export async function GET(req: NextRequest) {
  const gate = await rateLimit(`partner:access:${clientIp(req)}`, 120, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { allowed: false },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  const wallet = normalizeWallet(req.nextUrl.searchParams.get("wallet"));
  if (!wallet) {
    return NextResponse.json(
      { allowed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const partner = resolveReferralPartnerByWallet(wallet);
  if (!partner) {
    return NextResponse.json(
      { allowed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      allowed: true,
      partner: { id: partner.id, label: partner.label },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
