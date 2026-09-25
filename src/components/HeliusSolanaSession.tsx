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
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useHeliusWallet } from "helius-wallet-kit";
import {
  fetchFeePayer,
  isForm8GameAction,
  isForm8Sponsorable,
  submitSponsoredTransaction,
} from "@/lib/sponsorClient";

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

function HeliusSolanaSessionInner({ children }: PropsWithChildren) {
  const { address, status, signTransaction, signAndSendTransaction } =
    useHeliusWallet();
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
      if (!authenticated || !address) {
        throw new Error("Connect a Solana wallet first.");
      }

      const userKey = new PublicKey(address);
      const form8Sponsorable = isForm8Sponsorable(instructions);

      // —— Form8 server pays SOL fees (+ ATA rent + capped PDA rent top-up) ——
      if (form8Sponsorable) {
        let sponsor = feePayerRef.current ?? (await fetchFeePayer());
        feePayerRef.current = sponsor;
        if (sponsor) setFeePayer(sponsor);

        if (sponsor) {
          try {
            return await submitSponsoredTransaction({
              instructions,
              userKey,
              connection,
              feePayer: sponsor,
              signPartial: async (serialized) => {
                const signed = await signTransaction(serialized);
                return signed instanceof Uint8Array
                  ? signed
                  : new Uint8Array(signed);
              },
            });
          } catch (sponsorError) {
            console.warn(
              "Form8 fee sponsorship failed, trying fallbacks:",
              sponsorError,
            );
          }
        }
      }

      // —— User-paid fee (needs SOL on the embedded wallet) ——
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = userKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash("confirmed")
      ).blockhash;
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const lamports = await connection.getBalance(userKey, "confirmed");
      const rentNeed =
        form8Sponsorable && isForm8GameAction(instructions)
          ? await connection.getMinimumBalanceForRentExemption(168)
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
