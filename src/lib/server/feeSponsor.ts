/**
 * Server-only Solana fee sponsor (pays network fees + own-wallet USDC ATA rent +
 * capped PDA rent top-ups for Helius embedded register/claim).
 * Env (first match wins):
 *   SOLANA_FEE_SPONSOR_KEYPAIR — dedicated fee wallet (preferred)
 *   ADMIN_KEYPAIR              — fallback for local/ops
 *
 * Security: never pay ATA rent for arbitrary recipients. Dust USDC transfers to
 * fresh wallets previously drained the sponsor (~0.002 SOL per createIdempotent).
 */
import { sha256 } from "@noble/hashes/sha2.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { MOVEMATCH_PROGRAM_ID, SOLANA_RPC_URL, SOLANA_USDC_MINT, solanaConnectionOptions } from "@/lib/constants";

const USDC_MINT = new PublicKey(SOLANA_USDC_MINT);
const PROGRAM_ID = new PublicKey(MOVEMATCH_PROGRAM_ID);

/** Cap on SystemProgram.transfer sponsor → player (PDA rent for Entry/Claim). */
export const MAX_RENT_TOPUP_LAMPORTS = 10_000_000n; // 0.01 SOL

const SYSTEM_TRANSFER_IX = 2;

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
  return new Connection(SOLANA_RPC_URL, solanaConnectionOptions());
}

function anchorDisc(name: string): string {
  const bytes = sha256(new TextEncoder().encode(`global:${name}`)).slice(0, 8);
  return Buffer.from(bytes).toString("hex");
}

const ALLOWED_MOVEMATCH_IX = new Set([
  anchorDisc("register_team"),
  anchorDisc("claim_prize"),
]);

const REGISTER_TEAM_DISC = anchorDisc("register_team");

function discHex(data: Uint8Array): string {
  return Buffer.from(data.slice(0, 8)).toString("hex");
}

/** Wallets signing a sponsored `register_team` (empty if claim-only / other). */
export function findRegisterTeamOwners(tx: Transaction): string[] {
  const owners: string[] = [];
  for (const ix of tx.instructions) {
    if (!ix.programId.equals(PROGRAM_ID)) continue;
    if (discHex(ix.data) !== REGISTER_TEAM_DISC) continue;
    const owner = ix.keys[2]?.pubkey;
    if (owner) owners.push(owner.toBase58());
  }
  return owners;
}

/** SPL Token ix tags we allow under sponsorship (must touch USDC mint). */
const TOKEN_IX_TRANSFER = 3;
const TOKEN_IX_TRANSFER_CHECKED = 12;

/**
 * Allowlist for fee-sponsored txs:
 * - USDC transfer / transferChecked (authority must co-sign)
 * - USDC ATA create only for that same co-signer (never for arbitrary recipients —
 *   otherwise dust USDC → fresh wallets drains sponsor SOL as ATA rent)
 * - movematch register_team / claim_prize (owner signer required)
 * - SystemProgram.transfer sponsor → that owner, amount ≤ MAX_RENT_TOPUP_LAMPORTS (rent)
 * - SystemProgram.transfer player → recipient (SOL withdraw; player must have signed)
 */
export function assertSponsorableTransaction(
  tx: Transaction,
  sponsor: PublicKey,
): void {
  if (!tx.feePayer || !tx.feePayer.equals(sponsor)) {
    throw new Error("Transaction fee payer must be the Form8 fee sponsor.");
  }
  if (tx.instructions.length === 0 || tx.instructions.length > 10) {
    throw new Error("Transaction instruction count is out of range.");
  }

  // Pass 1: collect player owners from allowed movematch ixs (rent top-up may precede them).
  const playerOwners = new Set<string>();
  for (const ix of tx.instructions) {
    if (!ix.programId.equals(PROGRAM_ID)) continue;
    const d = discHex(ix.data);
    if (!ALLOWED_MOVEMATCH_IX.has(d)) {
      throw new Error(`Disallowed movematch instruction in sponsored tx: ${d}`);
    }
    // RegisterTeam / ClaimPrize: accounts[2] = owner (signer, writable).
    const owner = ix.keys[2];
    if (!owner?.isSigner) {
      throw new Error("Sponsored game instruction requires the player as signer.");
    }
    playerOwners.add(owner.pubkey.toBase58());
  }

  const requiredSigners = new Set<string>(playerOwners);

  // Pass 1b: USDC token authorities (withdraw path has no movematch ix).
  for (const ix of tx.instructions) {
    if (!ix.programId.equals(TOKEN_PROGRAM_ID) || ix.data.length < 1) continue;
    const tag = ix.data[0]!;
    if (tag === TOKEN_IX_TRANSFER) {
      const authority = ix.keys[2];
      if (!authority?.isSigner) {
        throw new Error("Sponsored USDC transfer requires the token authority as signer.");
      }
      requiredSigners.add(authority.pubkey.toBase58());
    } else if (tag === TOKEN_IX_TRANSFER_CHECKED) {
      const authority = ix.keys[3];
      if (!authority?.isSigner) {
        throw new Error(
          "Sponsored USDC transferChecked requires the token authority as signer.",
        );
      }
      requiredSigners.add(authority.pubkey.toBase58());
    }
  }

  // Pass 2: allowlist every instruction.
  for (const ix of tx.instructions) {
    if (ix.programId.equals(PROGRAM_ID)) {
      continue;
    }

    if (ix.programId.equals(TOKEN_PROGRAM_ID)) {
      if (ix.data.length < 1) {
        throw new Error("Invalid token instruction in sponsored tx.");
      }
      const tag = ix.data[0]!;
      if (tag !== TOKEN_IX_TRANSFER && tag !== TOKEN_IX_TRANSFER_CHECKED) {
        throw new Error(
          `Disallowed token instruction in sponsored tx (tag ${tag}).`,
        );
      }
      const touchesUsdc = ix.keys.some((k) => k.pubkey.equals(USDC_MINT));
      if (!touchesUsdc) {
        throw new Error("Sponsored token ops must use Form8 USDC mint.");
      }
      continue;
    }

    if (ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      const payer = ix.keys[0]?.pubkey;
      if (!payer || !payer.equals(sponsor)) {
        throw new Error("ATA rent payer must be the Form8 fee sponsor.");
      }
      const ataOwner = ix.keys[2]?.pubkey;
      if (!ataOwner || !requiredSigners.has(ataOwner.toBase58())) {
        // Blocks dust-to-fresh-wallet drains: sponsor must not fund recipient ATAs.
        throw new Error(
          "Sponsored ATA create is only allowed for the co-signing player's own USDC account.",
        );
      }
      const mint = ix.keys[3]?.pubkey;
      if (!mint || !mint.equals(USDC_MINT)) {
        throw new Error("Sponsored ATA create must be for Form8 USDC.");
      }
      continue;
    }

    if (ix.programId.equals(ComputeBudgetProgram.programId)) {
      continue;
    }

    if (ix.programId.equals(SystemProgram.programId)) {
      if (ix.data.length < 12) {
        throw new Error("Invalid SystemProgram instruction in sponsored tx.");
      }
      const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
      const type = view.getUint32(0, true);
      if (type !== SYSTEM_TRANSFER_IX) {
        throw new Error("Only SystemProgram.transfer is allowed in sponsored txs.");
      }
      const amount = view.getBigUint64(4, true);
      if (amount === 0n) {
        throw new Error("Sponsored SystemProgram.transfer amount must be positive.");
      }
      const fromMeta = ix.keys[0];
      const to = ix.keys[1]?.pubkey;
      const from = fromMeta?.pubkey;
      if (!from || !to || !fromMeta.isSigner) {
        throw new Error("SystemProgram.transfer requires a signer sender and a recipient.");
      }

      if (from.equals(sponsor)) {
        // Rent top-up: sponsor → registering/claiming player, capped.
        if (playerOwners.size === 0) {
          throw new Error("Rent top-up requires a register_team or claim_prize instruction.");
        }
        if (amount > MAX_RENT_TOPUP_LAMPORTS) {
          throw new Error("Sponsored rent top-up amount is out of range.");
        }
        if (!playerOwners.has(to.toBase58())) {
          throw new Error("Rent top-up recipient must be the registering/claiming player.");
        }
      } else {
        // SOL withdraw: player sends their own lamports; sponsor only pays network fee.
        requiredSigners.add(from.toBase58());
      }
      continue;
    }

    throw new Error(`Disallowed program in sponsored tx: ${ix.programId.toBase58()}`);
  }

  if (requiredSigners.size === 0) {
    throw new Error(
      "Sponsored transaction requires a player co-signer (register, claim, or USDC/SOL send).",
    );
  }

  // Require player / SOL-sender signatures already present before sponsor completes.
  for (const signerB58 of requiredSigners) {
    if (signerB58 === sponsor.toBase58()) {
      throw new Error("Sponsor cannot be the only required signer.");
    }
    const signer = new PublicKey(signerB58);
    const entry = tx.signatures.find((s) => s.publicKey.equals(signer));
    if (!entry?.signature) {
      throw new Error("Player must sign before the Form8 fee sponsor completes the tx.");
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

  // User signature(s) must already be present; we add the fee payer (+ rent from).
  tx.partialSign(sponsor);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction(signature, "confirmed");
  return { signature, feePayer: sponsor.publicKey.toBase58() };
}
