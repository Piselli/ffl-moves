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
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  useCreateWallet,
  useSignAndSendTransaction,
  useSignTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { usePrivyAuth } from "@/components/PrivyAppProvider";
import { isPrivyConfigured, isPrivyWalletName, privyLinkedSolanaAddress } from "@/lib/privy";
import { SOLANA_CLUSTER } from "@/lib/constants";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encodeSigBase58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let s = "";
  while (n > 0n) {
    const r = n % 58n;
    n /= 58n;
    s = B58[Number(r)] + s;
  }
  for (const b of bytes) {
    if (b === 0) s = "1" + s;
    else break;
  }
  return s || "1";
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

type PrivySolanaSessionValue = {
  address: string | null;
  /** Form8 fee payer when server sponsorship is configured. */
  feePayer: string | null;
  signAndSubmit: ((instructions: TransactionInstruction[]) => Promise<string>) | null;
};

const EMPTY: PrivySolanaSessionValue = {
  address: null,
  feePayer: null,
  signAndSubmit: null,
};

const PrivySolanaSessionContext = createContext<PrivySolanaSessionValue>(EMPTY);

export function usePrivySolanaSession(): PrivySolanaSessionValue {
  return useContext(PrivySolanaSessionContext);
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

function PrivySolanaSessionInner({ children }: PropsWithChildren) {
  const { authenticated, ready, user } = usePrivyAuth();
  const { wallets: privyWallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { signTransaction } = useSignTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { connection } = useConnection();
  const adapter = useWallet();
  const creatingRef = useRef(false);
  const connectingRef = useRef(false);
  const feePayerRef = useRef<string | null>(null);
  const [feePayer, setFeePayer] = useState<string | null>(null);

  const embedded =
    privyWallets.find((w) => /privy/i.test(w.standardWallet?.name ?? "")) ?? null;
  const address =
    (authenticated && embedded?.address ? embedded.address : null) ??
    (authenticated ? privyLinkedSolanaAddress(user) : null);

  useEffect(() => {
    if (!ready || !authenticated || !walletsReady || embedded || creatingRef.current) return;
    creatingRef.current = true;
    void createWallet()
      .catch((error) => {
        console.error("Privy Solana wallet create failed:", error);
      })
      .finally(() => {
        creatingRef.current = false;
      });
  }, [authenticated, createWallet, embedded, ready, walletsReady]);

  useEffect(() => {
    if (!address || adapter.connected || connectingRef.current) return;
    if (adapter.wallet && !isPrivyWalletName(adapter.wallet.adapter.name)) return;
    const match = adapter.wallets.find(({ adapter: item }) => isPrivyWalletName(item.name));
    if (!match) return;
    connectingRef.current = true;
    adapter.select(match.adapter.name as WalletName);
    void Promise.resolve(match.adapter.connect())
      .catch((error) => {
        console.error("Privy wallet-adapter connect failed:", error);
      })
      .finally(() => {
        connectingRef.current = false;
      });
  }, [adapter.connected, adapter.select, adapter.wallet, adapter.wallets, address]);

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

  const chain = SOLANA_CLUSTER === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";

  const signAndSubmit = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (!embedded || !address) throw new Error("Connect a Solana wallet first.");

      const userKey = new PublicKey(address);
      const transferLike = isUsdcTransferLike(instructions);

      // —— USDC withdraw/deposit-style: Form8 server pays SOL fees ——
      if (transferLike) {
        let sponsor = feePayerRef.current ?? (await fetchFeePayer());
        feePayerRef.current = sponsor;
        if (sponsor) setFeePayer(sponsor);

        if (sponsor) {
          const transaction = new Transaction().add(...instructions);
          transaction.feePayer = new PublicKey(sponsor);
          transaction.recentBlockhash = (
            await connection.getLatestBlockhash("confirmed")
          ).blockhash;
          const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
          const { signedTransaction } = await signTransaction({
            transaction: serialized,
            wallet: embedded,
            chain,
          });
          const res = await fetch("/api/solana/sponsor-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction: bytesToBase64(signedTransaction) }),
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
        }
      }

      // —— Program txs (register/claim/…) or no Form8 sponsor ——
      // Prefer Privy dashboard gas sponsorship when enabled.
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = userKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      try {
        const sent = await signAndSendTransaction({
          transaction: serialized,
          wallet: embedded,
          chain,
          options: { sponsor: true } as { sponsor?: boolean },
        });
        const sig = (sent as { signature?: string | Uint8Array })?.signature ?? sent;
        if (typeof sig === "string") return sig;
        if (sig instanceof Uint8Array) return encodeSigBase58(sig);
      } catch (sponsoredError) {
        console.warn("Privy gas sponsorship failed, trying user-paid fee:", sponsoredError);
      }

      const lamports = await connection.getBalance(userKey, "confirmed");
      if (lamports < 5000) {
        throw new Error(
          "Not enough SOL for network fees (~0.001 SOL). Form8 can sponsor USDC send/withdraw when SOLANA_FEE_SPONSOR_KEYPAIR is set; for squad register enable Privy Gas sponsorship or add a little SOL.",
        );
      }

      const { signedTransaction } = await signTransaction({
        transaction: serialized,
        wallet: embedded,
        chain,
      });
      return connection.sendRawTransaction(signedTransaction, { skipPreflight: false });
    },
    [address, chain, connection, embedded, signAndSendTransaction, signTransaction],
  );

  const value = useMemo<PrivySolanaSessionValue>(
    () => ({
      address,
      feePayer,
      signAndSubmit: embedded && address ? signAndSubmit : null,
    }),
    [address, embedded, feePayer, signAndSubmit],
  );

  return (
    <PrivySolanaSessionContext.Provider value={value}>{children}</PrivySolanaSessionContext.Provider>
  );
}

export function PrivySolanaSession({ children }: PropsWithChildren) {
  if (!isPrivyConfigured()) {
    return (
      <PrivySolanaSessionContext.Provider value={EMPTY}>{children}</PrivySolanaSessionContext.Provider>
    );
  }
  return <PrivySolanaSessionInner>{children}</PrivySolanaSessionInner>;
}
