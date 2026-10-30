import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import {
  isPartnersDevLoginAllowed,
  partnerSessionCookieOptions,
  sealPartnerSession,
} from "@/lib/partners/session";
import { resolveReferralPartnerByEmail } from "@/lib/referralPartners";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Local / opt-in login without Google — still requires whitelist email.
 * Disabled in production unless PARTNERS_ALLOW_DEV_LOGIN=true.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`partner:dev-login:${clientIp(req)}`, 20, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  if (!isPartnersDevLoginAllowed()) {
    return NextResponse.json({ error: "Dev login disabled" }, { status: 403 });
  }

  let body: { email?: string } = {};
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    /* ignore */
  }

  const partner = resolveReferralPartnerByEmail(body.email);
  if (!partner) {
    return NextResponse.json(
      { error: "Email not on partner whitelist" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const email = partner.emails.find(
    (e) => e === String(body.email || "").trim().toLowerCase(),
  )!;
  const sealed = sealPartnerSession({ partnerId: partner.id, email });
  const res = NextResponse.json(
    { ok: true, partner: { id: partner.id, label: partner.label } },
    { headers: { "Cache-Control": "no-store" } },
  );
  res.cookies.set(partnerSessionCookieOptions(sealed));
  return res;
}
