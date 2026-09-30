/**
 * Server-only Solana fee sponsor (pays network fees + own-wallet USDC ATA rent +
 * justified PDA rent top-ups for Helius embedded register/claim).
 *
 * Env:
 *   SOLANA_FEE_SPONSOR_KEYPAIR — dedicated, low-balance fee wallet (REQUIRED).
 *                                There is deliberately NO fallback to ADMIN_KEYPAIR:
 *                                the admin key controls the program and must never
 *                                be exposed to the public sponsor relay.
 *   SOLANA_FEE_SPONSOR_PUBKEY  — optional pin; the loaded key must match it.
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

/** Cap on total SystemProgram.transfer sponsor → player per tx (PDA rent). */
export const MAX_RENT_TOPUP_LAMPORTS = 10_000_000n; // 0.01 SOL

/** Max compute-unit price the sponsor will pay (µ-lamports per CU). Client uses 1_000. */
export const MAX_SPONSOR_CU_PRICE_MICRO_LAMPORTS = 25_000n;
/** Max compute-unit limit in a sponsored tx. */
export const MAX_SPONSOR_CU_LIMIT = 400_000;
/** Max signatures (fee payer + player co-signers) in one sponsored tx. */
export const MAX_SPONSOR_SIGNATURES = 4;
/** Slack on the justified rent top-up (covers tiny balance changes between build and send). */
const TOPUP_SLACK_LAMPORTS = 20_000;
/** Matches on-chain `Entry::SPACE` / `ClaimReceipt::SPACE` (upper bound across program versions). */
const ENTRY_ACCOUNT_SPACE = 168;
const CLAIM_ACCOUNT_SPACE = 65;
const USDC_DECIMALS = 6;
/** Approximate rent-exempt minimum of an SPL token account (165 bytes). */
const ATA_RENT_LAMPORTS = 2_039_280;
const LAMPORTS_PER_SIGNATURE = 5_000;

const SYSTEM_TRANSFER_IX = 2;

/** ComputeBudgetProgram instruction tags (solana_sdk::compute_budget). */
const CU_IX_REQUEST_HEAP_FRAME = 1;
const CU_IX_SET_COMPUTE_UNIT_LIMIT = 2;
const CU_IX_SET_COMPUTE_UNIT_PRICE = 3;

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
  return Boolean(process.env.SOLANA_FEE_SPONSOR_KEYPAIR?.trim());
}

export function loadFeeSponsorKeypair(): Keypair {
  if (cached) return cached;
  const dedicated = process.env.SOLANA_FEE_SPONSOR_KEYPAIR?.trim();
  if (!dedicated) {
    throw new Error("Fee sponsor not configured (set SOLANA_FEE_SPONSOR_KEYPAIR).");
  }
  const kp = parseKeypairJson(dedicated, "SOLANA_FEE_SPONSOR_KEYPAIR");

  // Hard separation: the public relay must never sign with the program admin key.
  const adminRaw = process.env.ADMIN_KEYPAIR?.trim();
  if (adminRaw) {
    try {
      const admin = parseKeypairJson(adminRaw, "ADMIN_KEYPAIR");
      if (admin.publicKey.equals(kp.publicKey)) {
        throw new Error(
          "SOLANA_FEE_SPONSOR_KEYPAIR must not be the same key as ADMIN_KEYPAIR.",
        );
      }
    } catch (err) {
      // A malformed ADMIN_KEYPAIR is not the sponsor's problem; a key clash is.
      if (err instanceof Error && err.message.includes("must not be the same key")) {
        throw err;
      }
    }
  }

  const pinned = process.env.SOLANA_FEE_SPONSOR_PUBKEY?.trim();
  if (pinned && pinned !== kp.publicKey.toBase58()) {
    throw new Error(
      `SOLANA_FEE_SPONSOR_KEYPAIR (${kp.publicKey.toBase58()}) does not match SOLANA_FEE_SPONSOR_PUBKEY.`,
    );
  }

  cached = kp;
  return cached;
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

/** Wallets that must co-sign a sponsored tx (owners / token authorities / SOL senders). */
export function findSponsoredCoSigners(tx: Transaction): string[] {
  const out = new Set<string>();
  for (const ix of tx.instructions) {
    if (ix.programId.equals(PROGRAM_ID)) {
      const d = discHex(ix.data);
      if (!ALLOWED_MOVEMATCH_IX.has(d)) continue;
      const owner = ix.keys[2]?.pubkey;
      if (owner) out.add(owner.toBase58());
      continue;
    }
    if (ix.programId.equals(TOKEN_PROGRAM_ID) && ix.data.length >= 1) {
      const tag = ix.data[0]!;
      if (tag === TOKEN_IX_TRANSFER && ix.keys[2]?.pubkey) {
        out.add(ix.keys[2]!.pubkey.toBase58());
      } else if (tag === TOKEN_IX_TRANSFER_CHECKED && ix.keys[3]?.pubkey) {
        out.add(ix.keys[3]!.pubkey.toBase58());
      }
      continue;
    }
    if (ix.programId.equals(SystemProgram.programId) && ix.data.length >= 12) {
      const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
      if (view.getUint32(0, true) !== SYSTEM_TRANSFER_IX) continue;
      const from = ix.keys[0]?.pubkey;
      if (from) out.add(from.toBase58());
    }
  }
  return [...out];
}

/**
 * Allowlist for fee-sponsored txs:
 * - USDC transferChecked only (USDC mint, 6 decimals, authority must co-sign)
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
  // Every extra signature is another 5000 lamports the sponsor pays.
  if (tx.signatures.length > MAX_SPONSOR_SIGNATURES) {
    throw new Error("Sponsored transaction has too many signers.");
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

  let sponsorRentTopUpTotal = 0n;
  let ataCreates = 0;
  let cuPriceCount = 0;
  let cuLimitCount = 0;

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
      // Only TransferChecked: it binds the mint + decimals into the instruction, so
      // the USDC-mint check below cannot be faked with a decoy account on a plain Transfer.
      if (tag !== TOKEN_IX_TRANSFER_CHECKED) {
        throw new Error(
          `Disallowed token instruction in sponsored tx (tag ${tag}).`,
        );
      }
      // TransferChecked: amount is u64 LE at offset 1, decimals u8 at offset 9.
      if (ix.data.length < 10) {
        throw new Error("Invalid sponsored USDC transfer (missing amount).");
      }
      if (ix.data[9] !== USDC_DECIMALS) {
        throw new Error("Sponsored USDC transfer must use 6 decimals.");
      }
      if (!ix.keys[1]?.pubkey.equals(USDC_MINT)) {
        throw new Error("Sponsored token ops must use Form8 USDC mint.");
      }
      const amountView = new DataView(
        ix.data.buffer,
        ix.data.byteOffset,
        ix.data.byteLength,
      );
      const tokenAmount = amountView.getBigUint64(1, true);
      if (tokenAmount === 0n) {
        // Blocks "create own ATA + transfer 0" fee grief without real USDC move.
        throw new Error("Sponsored USDC transfer amount must be positive.");
      }
      continue;
    }

    if (ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      // Only `Create` (empty data or 0) and `CreateIdempotent` (1). Never RecoverNested etc.
      if (ix.data.length > 1 || (ix.data.length === 1 && ix.data[0]! > 1)) {
        throw new Error("Disallowed associated-token instruction in sponsored tx.");
      }
      if (ix.keys.length < 6) {
        throw new Error("Invalid ATA instruction in sponsored tx.");
      }
      const payerMeta = ix.keys[0];
      const payer = payerMeta?.pubkey;
      const ataOwner = ix.keys[2]?.pubkey;
      const mint = ix.keys[3]?.pubkey;
      if (!payer || !ataOwner || !mint) {
        throw new Error("Invalid ATA instruction in sponsored tx.");
      }
      if (!mint.equals(USDC_MINT)) {
        throw new Error("Sponsored ATA create must be for Form8 USDC.");
      }

      if (payer.equals(sponsor)) {
        // Sponsor-funded ATA: only the co-signing player's own account, and only
        // during register/claim (never bare withdraw / ATA grief).
        if (playerOwners.size === 0) {
          throw new Error(
            "Sponsored ATA create is only allowed with register_team or claim_prize.",
          );
        }
        if (!requiredSigners.has(ataOwner.toBase58())) {
          throw new Error(
            "Sponsored ATA create is only allowed for the co-signing player's own USDC account.",
          );
        }
        ataCreates += 1;
        if (ataCreates > 1) {
          throw new Error("Sponsored tx may create at most one USDC ATA.");
        }
        continue;
      }

      // Player-funded ATA (e.g. idempotent house ATA create in register_team).
      // Sponsor pays no rent; player must already be a required co-signer.
      if (!payerMeta.isSigner || !requiredSigners.has(payer.toBase58())) {
        throw new Error(
          "Non-sponsor ATA payer must be a co-signing player.",
        );
      }
      continue;
    }

    if (ix.programId.equals(ComputeBudgetProgram.programId)) {
      if (ix.data.length < 1) {
        throw new Error("Invalid compute-budget instruction in sponsored tx.");
      }
      const tag = ix.data[0]!;
      const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
      if (tag === CU_IX_SET_COMPUTE_UNIT_LIMIT) {
        if (ix.data.length < 5) {
          throw new Error("Invalid SetComputeUnitLimit in sponsored tx.");
        }
        const units = view.getUint32(1, true);
        if (units === 0 || units > MAX_SPONSOR_CU_LIMIT) {
          throw new Error(
            `Sponsored compute-unit limit must be 1..${MAX_SPONSOR_CU_LIMIT}.`,
          );
        }
        cuLimitCount += 1;
        if (cuLimitCount > 1) {
          throw new Error("Sponsored tx may set compute-unit limit at most once.");
        }
        continue;
      }
      if (tag === CU_IX_SET_COMPUTE_UNIT_PRICE) {
        if (ix.data.length < 9) {
          throw new Error("Invalid SetComputeUnitPrice in sponsored tx.");
        }
        const microLamports = view.getBigUint64(1, true);
        if (microLamports > MAX_SPONSOR_CU_PRICE_MICRO_LAMPORTS) {
          throw new Error(
            `Sponsored compute-unit price exceeds max ${MAX_SPONSOR_CU_PRICE_MICRO_LAMPORTS} µ-lamports.`,
          );
        }
        cuPriceCount += 1;
        if (cuPriceCount > 1) {
          throw new Error("Sponsored tx may set compute-unit price at most once.");
        }
        continue;
      }
      if (tag === CU_IX_REQUEST_HEAP_FRAME) {
        // Rarely needed; reject to shrink fee-grief surface.
        throw new Error("RequestHeapFrame is not allowed in sponsored txs.");
      }
      throw new Error(`Disallowed compute-budget instruction tag ${tag}.`);
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
        // Rent top-up: sponsor → registering/claiming player, capped in aggregate.
        if (playerOwners.size === 0) {
          throw new Error("Rent top-up requires a register_team or claim_prize instruction.");
        }
        if (!playerOwners.has(to.toBase58())) {
          throw new Error("Rent top-up recipient must be the registering/claiming player.");
        }
        sponsorRentTopUpTotal += amount;
        if (sponsorRentTopUpTotal > MAX_RENT_TOPUP_LAMPORTS) {
          throw new Error(
            `Sponsored rent top-up total exceeds max ${MAX_RENT_TOPUP_LAMPORTS} lamports.`,
          );
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

/**
 * Cryptographically verify every signature that is already present (the sponsor's
 * own is added later). Without this, a forged "signature" from a victim wallet
 * would pass the presence check and could be used to burn that wallet's rate limits.
 */
export function assertPresentSignaturesValid(tx: Transaction): void {
  if (!tx.verifySignatures(false)) {
    throw new Error("Transaction contains an invalid signature.");
  }
}

/** Gameweek ids of every `register_team` in the tx (u32 LE right after the discriminator). */
export function findRegisterTeamGameweeks(tx: Transaction): number[] {
  const out: number[] = [];
  for (const ix of tx.instructions) {
    if (!ix.programId.equals(PROGRAM_ID)) continue;
    if (discHex(ix.data) !== REGISTER_TEAM_DISC) continue;
    if (ix.data.length < 12) continue;
    const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
    out.push(view.getUint32(8, true));
  }
  return out;
}

export type SponsorTxAnalysis = {
  /** Upper-bound estimate of what this tx costs the sponsor (fee + ATA rent + top-up). */
  costLamports: number;
  /** SOL moved sponsor → player (PDA rent). */
  topUpLamports: number;
};

/** Must run after `assertSponsorableTransaction`. */
export function analyzeSponsoredTransaction(
  tx: Transaction,
  sponsor: PublicKey,
): SponsorTxAnalysis {
  let topUp = 0n;
  let sponsorAtas = 0;
  let cuLimit = 0;
  let cuPrice = 0n;

  for (const ix of tx.instructions) {
    if (ix.programId.equals(SystemProgram.programId) && ix.data.length >= 12) {
      const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
      if (view.getUint32(0, true) === SYSTEM_TRANSFER_IX && ix.keys[0]?.pubkey.equals(sponsor)) {
        topUp += view.getBigUint64(4, true);
      }
    } else if (ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      if (ix.keys[0]?.pubkey.equals(sponsor)) sponsorAtas += 1;
    } else if (ix.programId.equals(ComputeBudgetProgram.programId)) {
      const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
      if (ix.data[0] === CU_IX_SET_COMPUTE_UNIT_LIMIT && ix.data.length >= 5) {
        cuLimit = view.getUint32(1, true);
      } else if (ix.data[0] === CU_IX_SET_COMPUTE_UNIT_PRICE && ix.data.length >= 9) {
        cuPrice = view.getBigUint64(1, true);
      }
    }
  }

  const effectiveLimit = cuLimit > 0 ? cuLimit : 200_000;
  const priority = Number((cuPrice * BigInt(effectiveLimit) + 999_999n) / 1_000_000n);
  const base = Math.max(1, tx.signatures.length) * LAMPORTS_PER_SIGNATURE;
  const topUpNum = Number(topUp);
  return {
    costLamports: base + priority + sponsorAtas * ATA_RENT_LAMPORTS + topUpNum,
    topUpLamports: topUpNum,
  };
}

/**
 * The client only tops a player up by what their Entry / Claim PDA + rent floor
 * actually needs. A hostile client could ask for the maximum every time, so the
 * server re-derives the justified amount from the player's live balance.
 */
export async function assertRentTopUpJustified(
  tx: Transaction,
  sponsor: PublicKey,
  connection: Connection,
): Promise<void> {
  const topUps = new Map<string, bigint>();
  for (const ix of tx.instructions) {
    if (!ix.programId.equals(SystemProgram.programId) || ix.data.length < 12) continue;
    const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
    if (view.getUint32(0, true) !== SYSTEM_TRANSFER_IX) continue;
    if (!ix.keys[0]?.pubkey.equals(sponsor)) continue;
    const to = ix.keys[1]?.pubkey.toBase58();
    if (!to) continue;
    topUps.set(to, (topUps.get(to) ?? 0n) + view.getBigUint64(4, true));
  }
  if (topUps.size === 0) return;

  let space = 0;
  for (const ix of tx.instructions) {
    if (!ix.programId.equals(PROGRAM_ID)) continue;
    const d = discHex(ix.data);
    if (d === REGISTER_TEAM_DISC) space = Math.max(space, ENTRY_ACCOUNT_SPACE);
    else if (d === anchorDisc("claim_prize")) space = Math.max(space, CLAIM_ACCOUNT_SPACE);
  }
  const [pdaRent, walletFloor] = await Promise.all([
    connection.getMinimumBalanceForRentExemption(space),
    connection.getMinimumBalanceForRentExemption(0),
  ]);

  for (const [to, amount] of topUps) {
    const balance = await connection.getBalance(new PublicKey(to), "confirmed");
    const needed = Math.max(0, pdaRent + walletFloor - balance);
    if (amount > BigInt(needed + TOPUP_SLACK_LAMPORTS)) {
      throw new Error("Rent top-up is larger than this wallet needs.");
    }
  }
}

async function waitForConfirmation(
  connection: Connection,
  signature: string,
  timeoutMs = 45_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];
    if (status) {
      if (status.err) {
        throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`);
      }
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(
    `Transaction ${signature} was submitted but not confirmed in time; check the explorer before retrying.`,
  );
}

/**
 * Signs as fee payer and broadcasts an already-validated tx
 * (`assertSponsorableTransaction` + `assertRentTopUpJustified` must have passed).
 */
export async function completeSponsoredSend(
  tx: Transaction,
): Promise<{ signature: string; feePayer: string }> {
  const sponsor = loadFeeSponsorKeypair();
  const connection = getFeeSponsorConnection();
  assertSponsorableTransaction(tx, sponsor.publicKey);
  await assertRentTopUpJustified(tx, sponsor.publicKey, connection);

  // User signature(s) must already be present; we add the fee payer (+ rent from).
  tx.partialSign(sponsor);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });
  await waitForConfirmation(connection, signature);
  return { signature, feePayer: sponsor.publicKey.toBase58() };
}
