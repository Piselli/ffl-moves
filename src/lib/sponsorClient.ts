/**
 * Browser helpers for Form8 fee sponsorship (register / claim / USDC).
 * Server still co-signs via `/api/solana/sponsor-send`.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Connection,
} from "@solana/web3.js";
import { MOVEMATCH_PROGRAM_ID } from "@/lib/constants";

/** Matches on-chain `Entry::SPACE` (TEAM_SIZE = 14). */
const ENTRY_ACCOUNT_SPACE = 168;
/** Matches on-chain `ClaimReceipt::SPACE`. */
const CLAIM_ACCOUNT_SPACE = 65;
/** Same cap as server `MAX_RENT_TOPUP_LAMPORTS`. */
const MAX_RENT_TOPUP_LAMPORTS = 10_000_000;
const PROGRAM_ID = new PublicKey(MOVEMATCH_PROGRAM_ID);

function anchorDisc(name: string): string {
  const bytes = sha256(new TextEncoder().encode(`global:${name}`)).slice(0, 8);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const REGISTER_TEAM_DISC = anchorDisc("register_team");
const CLAIM_PRIZE_DISC = anchorDisc("claim_prize");

function discHex(data: Uint8Array): string {
  return Array.from(data.slice(0, 8), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const FEELESS_PROGRAMS = new Set([
  TOKEN_PROGRAM_ID.toBase58(),
  ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
  ComputeBudgetProgram.programId.toBase58(),
]);

export function isUsdcTransferLike(
  instructions: TransactionInstruction[],
): boolean {
  return (
    instructions.length > 0 &&
    instructions.every((ix) => FEELESS_PROGRAMS.has(ix.programId.toBase58()))
  );
}

export function isSolTransferLike(
  instructions: TransactionInstruction[],
): boolean {
  return (
    instructions.length > 0 &&
    instructions.every(
      (ix) =>
        ix.programId.equals(SystemProgram.programId) ||
        ix.programId.equals(ComputeBudgetProgram.programId),
    )
  );
}

export function isForm8GameAction(
  instructions: TransactionInstruction[],
): boolean {
  return instructions.some((ix) => ix.programId.equals(PROGRAM_ID));
}

export function isForm8Sponsorable(
  instructions: TransactionInstruction[],
): boolean {
  return (
    isUsdcTransferLike(instructions) ||
    isSolTransferLike(instructions) ||
    isForm8GameAction(instructions)
  );
}

function rewriteAtaPayer(
  ix: TransactionInstruction,
  payer: PublicKey,
): TransactionInstruction {
  if (!ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) return ix;
  const keys = ix.keys.map((k, i) =>
    i === 0 ? { pubkey: payer, isSigner: true, isWritable: true } : k,
  );
  return new TransactionInstruction({
    programId: ix.programId,
    keys,
    data: ix.data,
  });
}

function pdaSpaceForGameAction(instructions: TransactionInstruction[]): number {
  let space = 0;
  for (const ix of instructions) {
    if (!ix.programId.equals(PROGRAM_ID) || ix.data.length < 8) continue;
    const d = discHex(ix.data);
    if (d === REGISTER_TEAM_DISC) space = Math.max(space, ENTRY_ACCOUNT_SPACE);
    else if (d === CLAIM_PRIZE_DISC) space = Math.max(space, CLAIM_ACCOUNT_SPACE);
  }
  return space || ENTRY_ACCOUNT_SPACE;
}

export async function prepareSponsoredInstructions(
  instructions: TransactionInstruction[],
  sponsor: PublicKey,
  userKey: PublicKey,
  connection: Connection,
): Promise<TransactionInstruction[]> {
  let prepared = instructions.map((ix) => rewriteAtaPayer(ix, sponsor));

  if (isForm8GameAction(prepared)) {
    const space = pdaSpaceForGameAction(prepared);
    // Entry/claim PDA rent is paid by the player (`init, payer = owner`).
    // Top up entry rent PLUS the empty-wallet rent floor — otherwise the
    // player account is left with dust and simulation fails
    // `InsufficientFundsForRent` (account still below rent-exempt).
    const [entryRent, walletFloor] = await Promise.all([
      connection.getMinimumBalanceForRentExemption(space),
      connection.getMinimumBalanceForRentExemption(0),
    ]);
    const balance = await connection.getBalance(userKey, "confirmed");
    const need = entryRent + walletFloor;
    if (balance < need) {
      const topUp = Math.min(need - balance, Number(MAX_RENT_TOPUP_LAMPORTS));
      if (topUp > 0) {
        prepared = [
          SystemProgram.transfer({
            fromPubkey: sponsor,
            toPubkey: userKey,
            lamports: topUp,
          }),
          ...prepared,
        ];
      }
    }
  }

  return prepared;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export async function fetchFeePayer(): Promise<string | null> {
  try {
    const res = await fetch("/api/solana/fee-payer", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      configured?: boolean;
      feePayer?: string | null;
    };
    if (
      data.configured &&
      typeof data.feePayer === "string" &&
      data.feePayer.length > 30
    ) {
      return data.feePayer;
    }
  } catch (err) {
    console.warn("Fee payer lookup failed:", err);
  }
  return null;
}

/**
 * Build a sponsor-fee-payer tx, have the user sign as owner, POST to sponsor-send.
 * `signPartial` must return the partially-signed serialized tx bytes.
 */
export async function submitSponsoredTransaction(opts: {
  instructions: TransactionInstruction[];
  userKey: PublicKey;
  connection: Connection;
  feePayer: string;
  signPartial: (serialized: Uint8Array) => Promise<Uint8Array>;
}): Promise<string> {
  const sponsorKey = new PublicKey(opts.feePayer);
  const prepared = await prepareSponsoredInstructions(
    opts.instructions,
    sponsorKey,
    opts.userKey,
    opts.connection,
  );
  const transaction = new Transaction().add(...prepared);
  transaction.feePayer = sponsorKey;
  transaction.recentBlockhash = (
    await opts.connection.getLatestBlockhash("confirmed")
  ).blockhash;
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  if (serialized.length > 1232) {
    throw new Error(
      `Sponsored transaction is too large (${serialized.length} bytes; max 1232).`,
    );
  }

  let signed: Uint8Array;
  try {
    signed = await opts.signPartial(
      serialized instanceof Uint8Array ? serialized : new Uint8Array(serialized),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Wallet could not co-sign the sponsored registration: ${msg}`);
  }

  // Ensure the player signature is present before asking the fee sponsor to finish.
  try {
    const signedTx = Transaction.from(signed);
    const playerEntry = signedTx.signatures.find((s) =>
      s.publicKey.equals(opts.userKey),
    );
    if (!playerEntry?.signature) {
      throw new Error(
        "Wallet signed the transaction but the player signature is missing. Try again, or reconnect email login.",
      );
    }
    if (!signedTx.feePayer?.equals(sponsorKey)) {
      throw new Error(
        "Wallet changed the fee payer; sponsored registration requires the Form8 fee wallet.",
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Wallet")) throw err;
    throw new Error(
      `Could not read the signed sponsored transaction: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const res = await fetch("/api/solana/sponsor-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: bytesToBase64(signed) }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    signature?: string;
    error?: string;
  };
  if (!res.ok || !data.signature) {
    throw new Error(
      data.error ||
        `Fee sponsorship failed (HTTP ${res.status}). Top up the fee wallet with SOL, or try again.`,
    );
  }
  return data.signature;
}
