import { NextResponse } from "next/server";
import {
  isFeeSponsorConfigured,
  loadFeeSponsorKeypair,
} from "@/lib/server/feeSponsor";

export const dynamic = "force-dynamic";

/** Public fee-payer address for client-built sponsored txs (no secrets). */
export async function GET() {
  if (!isFeeSponsorConfigured()) {
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
    const message = err instanceof Error ? err.message : "Fee sponsor error";
    return NextResponse.json({ configured: false, feePayer: null, error: message }, { status: 500 });
  }
}
