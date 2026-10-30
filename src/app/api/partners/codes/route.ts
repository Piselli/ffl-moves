import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { createPartnerCode } from "@/lib/partners/partnerCodes";
import {
  readPartnerSession,
  resolvePartnerFromSession,
} from "@/lib/partners/session";
import {
  decodeEd25519Signature,
  isFreshPartnerTs,
  partnerCreateCodeMessage,
  verifyWalletMessageSignature,
} from "@/lib/partners/walletAuth";
import { normalizeWallet } from "@/lib/walletNormalize";
import { buildPartnerStatsPayload } from "@/lib/partners/statsPayload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { code, wallet, ts, signature } — create a new referral code for this partner.
 * Requires an active partner session for the same wallet.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`partner:create-code:${clientIp(req)}`, 20, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  const resolved = resolvePartnerFromSession(readPartnerSession(req));
  if (!resolved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    code?: unknown;
    wallet?: unknown;
    ts?: unknown;
    signature?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wallet = normalizeWallet(typeof body.wallet === "string" ? body.wallet : "");
  const codeRaw = typeof body.code === "string" ? body.code : "";
  const ts = Number(body.ts);
  const sigRaw = typeof body.signature === "string" ? body.signature : "";

  if (!wallet || wallet !== resolved.session.wallet) {
    return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
  }
  if (!isFreshPartnerTs(ts)) {
    return NextResponse.json({ error: "Signature expired. Try again." }, { status: 400 });
  }

  const preview = codeRaw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  const signature = decodeEd25519Signature(sigRaw);
  if (!signature || !preview) {
    return NextResponse.json({ error: "Invalid code or signature" }, { status: 400 });
  }
  if (
    !verifyWalletMessageSignature(
      wallet,
      partnerCreateCodeMessage(wallet, preview, ts),
      signature,
    )
  ) {
    return NextResponse.json(
      { error: "Signature does not match this wallet" },
      { status: 401 },
    );
  }

  const created = await createPartnerCode(resolved.partner.id, preview);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 409 });
  }

  const payload = await buildPartnerStatsPayload(resolved.partner);
  return NextResponse.json(
    { ok: true, code: created.code, ...payload },
    { headers: { "Cache-Control": "no-store" } },
  );
}
