import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getUsdcBalance } from "@/lib/chainClient";

export const dynamic = "force-dynamic";

/**
 * USDC balance via server RPC (never blocked by Helius browser ACL).
 * GET /api/solana/balance?owner=<base58>
 */
export async function GET(request: Request) {
  const owner = new URL(request.url).searchParams.get("owner")?.trim() ?? "";
  if (!owner) {
    return NextResponse.json({ error: "Missing owner" }, { status: 400 });
  }
  try {
    // Validate pubkey early for a clear 400.
    // eslint-disable-next-line no-new
    new PublicKey(owner);
  } catch {
    return NextResponse.json({ error: "Invalid owner address" }, { status: 400 });
  }

  try {
    const raw = await getUsdcBalance(owner);
    return NextResponse.json(
      { owner, amount: raw.toString() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Balance lookup failed";
    console.error("[solana/balance]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
