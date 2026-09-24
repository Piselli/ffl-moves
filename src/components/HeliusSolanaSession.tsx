"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Connection,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useHeliusWallet } from "helius-wallet-kit";
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
  return Array.from(data.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

const FEELESS_PROGRAMS = new Set([
  TOKEN_PROGRAM_ID.toBase58(),
  ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
  ComputeBudgetProgram.programId.toBase58(),
]);

function isUsdcTransferLike(instructions: TransactionInstruction[]): boolean {
  return (
    instructions.length > 0 &&
    instructions.every((ix) => FEELESS_PROGRAMS.has(ix.programId.toBase58()))
  );
}

function isSolTransferLike(instructions: TransactionInstruction[]): boolean {
  return (
    instructions.length > 0 &&
    instructions.every(
      (ix) =>
        ix.programId.equals(SystemProgram.programId) ||
        ix.programId.equals(ComputeBudgetProgram.programId),
    )
  );
}

function isForm8GameAction(instructions: TransactionInstruction[]): boolean {
  return instructions.some((ix) => ix.programId.equals(PROGRAM_ID));
}

function isForm8Sponsorable(instructions: TransactionInstruction[]): boolean {
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

async function prepareSponsoredInstructions(
  instructions: TransactionInstruction[],
  sponsor: PublicKey,
  userKey: PublicKey,
  connection: Connection,
): Promise<TransactionInstruction[]> {
  let prepared = instructions.map((ix) => rewriteAtaPayer(ix, sponsor));

  if (isForm8GameAction(prepared)) {
    const space = pdaSpaceForGameAction(prepared);
    const rent = await connection.getMinimumBalanceForRentExemption(space);
    const balance = await connection.getBalance(userKey, "confirmed");
    const need = rent;
    if (balance < need) {
      const topUp = Math.min(need - balance, MAX_RENT_TOPUP_LAMPORTS);
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

type HeliusSolanaSessionValue = {
  address: string | null;
  /** Form8 fee payer when server sponsorship is configured. */
  feePayer: string | null;
  signAndSubmit: ((instructions: TransactionInstruction[]) => Promise<string>) | null;
};

const EMPTY: HeliusSolanaSessionValue = {
  address: null,
  feePayer: null,
  signAndSubmit: null,
};

const HeliusSolanaSessionContext = createContext<HeliusSolanaSessionValue>(EMPTY);

export function useHeliusSolanaSession(): HeliusSolanaSessionValue {
  return useContext(HeliusSolanaSessionContext);
}

async function fetchFeePayer(): Promise<string | null> {
  try {
    const res = await fetch("/api/solana/fee-payer", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { configured?: boolean; feePayer?: string | null };
    if (data.configured && typeof data.feePayer === "string" && data.feePayer.length > 30) {
      return data.feePayer;
    }
  } catch (err) {
    console.warn("Fee payer lookup failed:", err);
  }
  return null;
}

function HeliusSolanaSessionInner({ children }: PropsWithChildren) {
  const { address, status, signTransaction, signAndSendTransaction } = useHeliusWallet();
  const { connection } = useConnection();
  const feePayerRef = useRef<string | null>(null);
  const [feePayer, setFeePayer] = useState<string | null>(null);
  const authenticated = status === "authenticated" && Boolean(address);

  useEffect(() => {
    let cancelled = false;
    void fetchFeePayer().then((fp) => {
      if (cancelled) return;
      feePayerRef.current = fp;
      setFeePayer(fp);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signAndSubmit = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (!authenticated || !address) throw new Error("Connect a Solana wallet first.");

      const userKey = new PublicKey(address);
      const form8Sponsorable = isForm8Sponsorable(instructions);

      // —— Form8 server pays SOL fees (+ ATA rent + capped PDA rent top-up) ——
      if (form8Sponsorable) {
        let sponsor = feePayerRef.current ?? (await fetchFeePayer());
        feePayerRef.current = sponsor;
        if (sponsor) setFeePayer(sponsor);

        if (sponsor) {
          try {
            const sponsorKey = new PublicKey(sponsor);
            const prepared = await prepareSponsoredInstructions(
              instructions,
              sponsorKey,
              userKey,
              connection,
            );
            const transaction = new Transaction().add(...prepared);
            transaction.feePayer = sponsorKey;
            transaction.recentBlockhash = (
              await connection.getLatestBlockhash("confirmed")
            ).blockhash;
            const serialized = transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            });
            const signedTransaction = await signTransaction(serialized);
            const res = await fetch("/api/solana/sponsor-send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transaction: bytesToBase64(
                  signedTransaction instanceof Uint8Array
                    ? signedTransaction
                    : new Uint8Array(signedTransaction),
                ),
              }),
            });
            const data = (await res.json().catch(() => ({}))) as {
              signature?: string;
              error?: string;
            };
            if (!res.ok || !data.signature) {
              throw new Error(
                data.error ||
                  "Fee sponsorship failed. Top up the fee wallet with SOL, or try again.",
              );
            }
            return data.signature;
          } catch (sponsorError) {
            console.warn("Form8 fee sponsorship failed, trying fallbacks:", sponsorError);
          }
        }
      }

      // —— User-paid fee (needs SOL on the embedded wallet) ——
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = userKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const lamports = await connection.getBalance(userKey, "confirmed");
      const rentNeed =
        form8Sponsorable && isForm8GameAction(instructions)
          ? await connection.getMinimumBalanceForRentExemption(
              pdaSpaceForGameAction(instructions),
            )
          : 5000;
      if (lamports < rentNeed) {
        throw new Error(
          isForm8GameAction(instructions)
            ? "Registration needs a tiny bit of SOL for account rent, and sponsorship is unavailable right now. Try again in a moment, or connect a wallet extension."
            : "This action needs a tiny bit of SOL for network fees, and sponsorship is unavailable right now. Try again in a moment, or connect a wallet extension.",
        );
      }

      try {
        return await signAndSendTransaction(serialized);
      } catch (sendError) {
        console.warn("Helius signAndSend failed, trying sign + RPC send:", sendError);
        const signedTransaction = await signTransaction(serialized);
        const raw =
          signedTransaction instanceof Uint8Array
            ? signedTransaction
            : new Uint8Array(signedTransaction);
        return connection.sendRawTransaction(raw, { skipPreflight: false });
      }
    },
    [address, authenticated, connection, signAndSendTransaction, signTransaction],
  );

  const value = useMemo<HeliusSolanaSessionValue>(
    () => ({
      address: authenticated ? address : null,
      feePayer,
      signAndSubmit: authenticated && address ? signAndSubmit : null,
    }),
    [address, authenticated, feePayer, signAndSubmit],
  );

  return (
    <HeliusSolanaSessionContext.Provider value={value}>
      {children}
    </HeliusSolanaSessionContext.Provider>
  );
}

export function HeliusSolanaSession({ children }: PropsWithChildren) {
  return <HeliusSolanaSessionInner>{children}</HeliusSolanaSessionInner>;
}
