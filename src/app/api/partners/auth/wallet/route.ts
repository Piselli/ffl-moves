import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { resolveReferralPartnerByWallet } from "@/lib/referralPartners";
import { normalizeWallet } from "@/lib/walletNormalize";
import {
  decodeEd25519Signature,
  isFreshPartnerTs,
  partnerLoginMessage,
  verifyWalletMessageSignature,
} from "@/lib/partners/walletAuth";
import {
  partnerSessionCookieOptions,
  sealPartnerSession,
} from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { wallet, ts, signature } — prove wallet ownership, must be whitelisted.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`partner:wallet-login:${clientIp(req)}`, 30, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let body: { wallet?: unknown; ts?: unknown; signature?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wallet = normalizeWallet(typeof body.wallet === "string" ? body.wallet : "");
  const ts = Number(body.ts);
  const sigRaw = typeof body.signature === "string" ? body.signature : "";

  if (!wallet) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  const partner = resolveReferralPartnerByWallet(wallet);
  if (!partner) {
    return NextResponse.json(
      { error: "Wallet is not on the partner whitelist" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isFreshPartnerTs(ts)) {
    return NextResponse.json({ error: "Signature expired. Try again." }, { status: 400 });
  }
  const signature = decodeEd25519Signature(sigRaw);
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (!verifyWalletMessageSignature(wallet, partnerLoginMessage(wallet, ts), signature)) {
    return NextResponse.json(
      { error: "Signature does not match this wallet" },
      { status: 401 },
    );
  }

  const sealed = sealPartnerSession({ partnerId: partner.id, wallet });
  const res = NextResponse.json(
    {
      ok: true,
      partner: { id: partner.id, label: partner.label, codes: partner.codes },
      wallet,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  res.cookies.set(partnerSessionCookieOptions(sealed));
  return res;
}
