import { NextResponse } from "next/server";
import { Transaction } from "@solana/web3.js";
import {
  completeSponsoredSend,
  findRegisterTeamOwners,
  findSponsoredCoSigners,
  isFeeSponsorConfigured,
  loadFeeSponsorKeypair,
} from "@/lib/server/feeSponsor";
import { hasAcceptedCurrentLegal } from "@/lib/legal/acceptanceStore";
import { allowSponsoredSend } from "@/lib/server/sponsorRateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  /** Base64-encoded partially signed legacy Transaction (user signatures present). */
  transaction?: string;
};

function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Completes a player-signed tx by signing as fee payer and broadcasting.
 * Pays Solana network fee, the player's own USDC ATA rent when needed, and
 * (for register_team / claim_prize) a capped SOL rent top-up to the player.
 * Does not create recipient ATAs for withdraws (see feeSponsor allowlist).
 */
export async function POST(request: Request) {
  if (!isFeeSponsorConfigured()) {
    return NextResponse.json(
      {
        error:
          "Fee sponsorship is not configured. Set SOLANA_FEE_SPONSOR_KEYPAIR (or ADMIN_KEYPAIR) with SOL.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b64 = typeof body.transaction === "string" ? body.transaction.trim() : "";
  if (!b64) {
    return NextResponse.json({ error: "Missing transaction." }, { status: 400 });
  }

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(b64, "base64"));
  } catch {
    return NextResponse.json({ error: "Transaction must be base64." }, { status: 400 });
  }
  if (bytes.length < 64 || bytes.length > 1232) {
    return NextResponse.json({ error: "Transaction size out of range." }, { status: 400 });
  }

  try {
    const tx = Transaction.from(bytes);
    const sponsorPk = loadFeeSponsorKeypair().publicKey.toBase58();
    const wallets = findSponsoredCoSigners(tx).filter((w) => w !== sponsorPk);
    const limited = allowSponsoredSend({ ip: clientIp(request), wallets });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many sponsored transactions. Try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const registerOwners = findRegisterTeamOwners(tx);
    for (const wallet of registerOwners) {
      if (!(await hasAcceptedCurrentLegal(wallet))) {
        return NextResponse.json(
          {
            error: "Legal attestation required before entry.",
            code: "LEGAL_NOT_ACCEPTED",
          },
          { status: 403 },
        );
      }
    }

    const result = await completeSponsoredSend(bytes);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sponsor send failed";
    console.error("[sponsor-send]", message, err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
