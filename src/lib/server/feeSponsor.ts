/**
 * Server-only Solana fee sponsor (pays network fees + ATA rent for players).
 * Env (first match wins):
 *   SOLANA_FEE_SPONSOR_KEYPAIR — dedicated fee wallet (preferred)
 *   ADMIN_KEYPAIR              — fallback for local/ops
 */
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { SOLANA_RPC_URL, SOLANA_USDC_MINT } from "@/lib/constants";

const USDC_MINT = new PublicKey(SOLANA_USDC_MINT);

let cached: Keypair | null = null;

function parseKeypairJson(raw: string, label: string): Keypair {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be a JSON array of numbers.`);
  }
  if (!Array.isArray(parsed) || parsed.length < 32) {
    throw new Error(`${label} must be a Solana secret key byte array.`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
}

export function isFeeSponsorConfigured(): boolean {
  return Boolean(
    process.env.SOLANA_FEE_SPONSOR_KEYPAIR?.trim() ||
      process.env.ADMIN_KEYPAIR?.trim(),
  );
}

export function loadFeeSponsorKeypair(): Keypair {
  if (cached) return cached;
  const dedicated = process.env.SOLANA_FEE_SPONSOR_KEYPAIR?.trim();
  if (dedicated) {
    cached = parseKeypairJson(dedicated, "SOLANA_FEE_SPONSOR_KEYPAIR");
    return cached;
  }
  const admin = process.env.ADMIN_KEYPAIR?.trim();
  if (admin) {
    cached = parseKeypairJson(admin, "ADMIN_KEYPAIR");
    return cached;
  }
  throw new Error(
    "Fee sponsor not configured (set SOLANA_FEE_SPONSOR_KEYPAIR or ADMIN_KEYPAIR).",
  );
}

export function getFeeSponsorConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

const ALLOWED_PROGRAMS = new Set([
  TOKEN_PROGRAM_ID.toBase58(),
  ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
  ComputeBudgetProgram.programId.toBase58(),
]);

/**
 * Only allow fee-sponsored txs that move our USDC (or create its ATA / set CU).
 * Rejects any SystemProgram drain of the sponsor wallet.
 */
export function assertSponsorableTransaction(
  tx: Transaction,
  sponsor: PublicKey,
): void {
  if (!tx.feePayer || !tx.feePayer.equals(sponsor)) {
    throw new Error("Transaction fee payer must be the Form8 fee sponsor.");
  }
  if (tx.instructions.length === 0 || tx.instructions.length > 8) {
    throw new Error("Transaction instruction count is out of range.");
  }
  for (const ix of tx.instructions) {
    const program = ix.programId.toBase58();
    if (!ALLOWED_PROGRAMS.has(program)) {
      throw new Error(`Disallowed program in sponsored tx: ${program}`);
    }
    if (ix.programId.equals(TOKEN_PROGRAM_ID)) {
      const touchesUsdc = ix.keys.some((k) => k.pubkey.equals(USDC_MINT));
      if (!touchesUsdc) {
        throw new Error("Sponsored token ops must use Form8 USDC mint.");
      }
    }
    if (ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      // ATA create: keys[0] = payer — must be sponsor so rent is sponsored.
      const payer = ix.keys[0]?.pubkey;
      if (!payer || !payer.equals(sponsor)) {
        throw new Error("ATA rent payer must be the Form8 fee sponsor.");
      }
      const mint = ix.keys[3]?.pubkey;
      if (!mint || !mint.equals(USDC_MINT)) {
        throw new Error("Sponsored ATA create must be for Form8 USDC.");
      }
    }
  }
}

export async function completeSponsoredSend(
  serializedTx: Uint8Array,
): Promise<{ signature: string; feePayer: string }> {
  const sponsor = loadFeeSponsorKeypair();
  const connection = getFeeSponsorConnection();
  const tx = Transaction.from(serializedTx);
  assertSponsorableTransaction(tx, sponsor.publicKey);

  // User signature(s) must already be present; we add the fee payer.
  tx.partialSign(sponsor);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction(signature, "confirmed");
  return { signature, feePayer: sponsor.publicKey.toBase58() };
}
