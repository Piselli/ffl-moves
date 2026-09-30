import { NextResponse } from "next/server";
import { Transaction } from "@solana/web3.js";
import {
  analyzeSponsoredTransaction,
  assertPresentSignaturesValid,
  assertSponsorableTransaction,
  completeSponsoredSend,
  findRegisterTeamGameweeks,
  findRegisterTeamOwners,
  findSponsoredCoSigners,
  isFeeSponsorConfigured,
  loadFeeSponsorKeypair,
} from "@/lib/server/feeSponsor";
import { hasAcceptedCurrentLegal } from "@/lib/legal/acceptanceStore";
import {
  allowSponsorIpAttempt,
  allowSponsorWalletAttempts,
  checkSponsorBudgets,
  isSponsorDisabled,
  recordSponsorSpend,
} from "@/lib/server/sponsorRateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { isRegistrationClosed } from "@/lib/server/registrationWindow";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  /** Base64-encoded partially signed legacy Transaction (user signatures present). */
  transaction?: string;
};

function tooMany(message: string, retryAfterSec: number) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

/**
 * Completes a player-signed tx by signing as fee payer and broadcasting.
 * Pays Solana network fee, the player's own USDC ATA rent when needed, and
 * (for register_team / claim_prize) a justified SOL rent top-up to the player.
 * Does not create recipient ATAs for withdraws (see feeSponsor allowlist).
 *
 * Abuse controls, in order: kill switch → per-IP attempts → structural allowlist →
 * signature validity → per-wallet attempts → legal gate → registration window →
 * daily spend budgets → top-up justification (live balance) → send → record spend.
 */
export async function POST(request: Request) {
  if (isSponsorDisabled()) {
    return NextResponse.json(
      { error: "Fee sponsorship is temporarily disabled." },
      { status: 503 },
    );
  }
  if (!isFeeSponsorConfigured()) {
    return NextResponse.json(
      {
        error:
          "Fee sponsorship is not configured. Set SOLANA_FEE_SPONSOR_KEYPAIR with SOL.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const ipGate = await allowSponsorIpAttempt(ip);
  if (!ipGate.ok) {
    return tooMany("Too many sponsored transactions. Try again shortly.", ipGate.retryAfterSec);
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
    const sponsor = loadFeeSponsorKeypair();
    const sponsorPk = sponsor.publicKey.toBase58();

    // Structure + signatures first, so nothing below can be triggered (or blamed on
    // a victim wallet) by an unsigned/forged payload.
    assertSponsorableTransaction(tx, sponsor.publicKey);
    assertPresentSignaturesValid(tx);

    const wallets = findSponsoredCoSigners(tx).filter((w) => w !== sponsorPk);
    const walletGate = await allowSponsorWalletAttempts(wallets);
    if (!walletGate.ok) {
      return tooMany("Too many sponsored transactions. Try again shortly.", walletGate.retryAfterSec);
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

    for (const gameweekId of findRegisterTeamGameweeks(tx)) {
      if (await isRegistrationClosed(gameweekId)) {
        return NextResponse.json(
          { error: "Registration for this gameweek is closed.", code: "REGISTRATION_CLOSED" },
          { status: 403 },
        );
      }
    }

    const { costLamports, topUpLamports } = analyzeSponsoredTransaction(tx, sponsor.publicKey);
    const budget = await checkSponsorBudgets({ ip, wallets, costLamports, topUpLamports });
    if (!budget.ok) {
      return tooMany(budget.error, budget.retryAfterSec);
    }

    const result = await completeSponsoredSend(tx);
    await recordSponsorSpend({ ip, wallets, costLamports, topUpLamports });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sponsor send failed";
    console.error("[sponsor-send]", message, err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
