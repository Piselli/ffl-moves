"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import {
  useCreateWallet,
  useSignTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { usePrivyAuth } from "@/components/PrivyAppProvider";
import { isPrivyConfigured, isPrivyWalletName, privyLinkedSolanaAddress } from "@/lib/privy";
import { SOLANA_CLUSTER } from "@/lib/constants";

type PrivySolanaSessionValue = {
  address: string | null;
  signAndSubmit: ((instructions: TransactionInstruction[]) => Promise<string>) | null;
};

const EMPTY: PrivySolanaSessionValue = { address: null, signAndSubmit: null };

const PrivySolanaSessionContext = createContext<PrivySolanaSessionValue>(EMPTY);

export function usePrivySolanaSession(): PrivySolanaSessionValue {
  return useContext(PrivySolanaSessionContext);
}

function PrivySolanaSessionInner({ children }: PropsWithChildren) {
  const { authenticated, ready, user } = usePrivyAuth();
  const { wallets: privyWallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { signTransaction } = useSignTransaction();
  const { connection } = useConnection();
  const adapter = useWallet();
  const creatingRef = useRef(false);
  const connectingRef = useRef(false);

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

  const signAndSubmit = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (!embedded || !address) throw new Error("Connect a Solana wallet first.");
      const payer = new PublicKey(address);
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = payer;
      transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      const { signedTransaction } = await signTransaction({
        transaction: serialized,
        wallet: embedded,
        chain: SOLANA_CLUSTER === "mainnet-beta" ? "solana:mainnet" : "solana:devnet",
      });
      return connection.sendRawTransaction(signedTransaction, { skipPreflight: false });
    },
    [address, connection, embedded, signTransaction],
  );

  const value = useMemo<PrivySolanaSessionValue>(
    () => ({
      address,
      signAndSubmit: embedded && address ? signAndSubmit : null,
    }),
    [address, signAndSubmit],
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
