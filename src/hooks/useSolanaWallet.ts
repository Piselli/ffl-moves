"use client";

import { useCallback, useMemo } from "react";
import { useConnection, useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { usePrivyAuth } from "@/components/PrivyAppProvider";
import { usePrivySolanaSession } from "@/components/PrivySolanaSession";
import { isPrivyWalletName, privyLinkedSolanaAddress, privyLoginLabel } from "@/lib/privy";

/**
 * App-facing wallet adapter. Pages only receive base58 addresses and submit
 * instruction arrays; Solana SDK details stay in this hook and chainClient.
 *
 * Phantom / Solflare / Jupiter stay on the wallet adapter. Email login uses a
 * Privy embedded Solana address as a fallback when no extension is connected.
 */
export function useWallet() {
  const { connection } = useConnection();
  const adapter = useAdapterWallet();
  const privyAuth = usePrivyAuth();
  const privySession = usePrivySolanaSession();
  const adapterAddress = adapter.publicKey?.toBase58() ?? null;
  const adapterName = adapter.wallet?.adapter.name ?? null;
  const hasExternalWallet = Boolean(
    adapter.connected && adapter.publicKey && !isPrivyWalletName(adapterName),
  );
  const address =
    adapterAddress ??
    privySession.address ??
    (privyAuth.authenticated ? privyLinkedSolanaAddress(privyAuth.user) : null);
  const connected = Boolean(adapter.connected || privyAuth.authenticated);
  const connecting =
    adapter.connecting || Boolean(privyAuth.authenticated && !address);

  const signAndSubmit = useCallback(async (instructions: TransactionInstruction[]) => {
    const adapterName = adapter.wallet?.adapter.name;
    if (
      adapter.publicKey &&
      adapter.sendTransaction &&
      !isPrivyWalletName(adapterName)
    ) {
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = adapter.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      return adapter.sendTransaction(transaction, connection);
    }
    if (privySession.signAndSubmit) return privySession.signAndSubmit(instructions);
    throw new Error("Connect a Solana wallet first.");
  }, [adapter, connection, privySession]);

  const disconnect = useCallback(async () => {
    try {
      if (adapter.connected) await adapter.disconnect();
    } catch (error) {
      console.error("Wallet disconnect failed:", error);
    }
    try {
      if (privyAuth.authenticated) await privyAuth.logout();
    } catch (error) {
      console.error("Email session logout failed:", error);
    }
  }, [adapter, privyAuth]);

  return useMemo(() => ({
    address,
    account: address ? { address } : null,
    connected,
    connecting,
    disconnect,
    connect: adapter.connect,
    walletName:
      adapter.wallet?.adapter.name ??
      (privyAuth.authenticated ? privyLoginLabel(privyAuth.user) : null),
    /** Phantom / Solflare / Jupiter — pay by signing in the extension, not an in-app deposit. */
    hasExternalWallet,
    signAndSubmit,
    /** Legacy transaction builders are deliberately unsupported after Solana migration. */
    signTransaction: async (_legacyPayload?: unknown): Promise<any> => {
      throw new Error("Build Solana instructions through chainClient and call signAndSubmit.");
    },
    signAndSubmitTransaction: async (_legacyPayload?: unknown): Promise<any> => {
      throw new Error("Build Solana instructions through chainClient and call signAndSubmit.");
    },
  }), [
    address,
    adapter.connecting,
    adapter.connect,
    adapter.wallet,
    connected,
    connecting,
    disconnect,
    hasExternalWallet,
    privyAuth.authenticated,
    privyAuth.user,
    privySession.address,
    signAndSubmit,
  ]);
}
