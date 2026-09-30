import { NextResponse } from "next/server";
import {
  isFeeSponsorConfigured,
  loadFeeSponsorKeypair,
} from "@/lib/server/feeSponsor";
import { isSponsorDisabled } from "@/lib/server/sponsorRateLimit";

export const dynamic = "force-dynamic";

/** Public fee-payer address for client-built sponsored txs (no secrets). */
export async function GET() {
  // Kill switch reads as "not configured" so wallets that hold SOL fall back to paying themselves.
  if (!isFeeSponsorConfigured() || isSponsorDisabled()) {
    return NextResponse.json(
      { configured: false, feePayer: null as string | null },
      { status: 200 },
    );
  }
  try {
    const kp = loadFeeSponsorKeypair();
    return NextResponse.json({
      configured: true,
      feePayer: kp.publicKey.toBase58(),
    });
  } catch (err) {
    console.error("[fee-payer]", err);
    return NextResponse.json({ configured: false, feePayer: null }, { status: 500 });
  }
}
