"use client";

import { useCallback, useMemo } from "react";
import { useConnection, useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { useHeliusAuth } from "@/components/HeliusAppProvider";
import { useHeliusSolanaSession } from "@/components/HeliusSolanaSession";

/**
 * App-facing wallet adapter. Pages only receive base58 addresses and submit
 * instruction arrays; Solana SDK details stay in this hook and chainClient.
 *
 * Phantom / Solflare / Jupiter stay on the wallet adapter. Email login uses a
 * Helius embedded Solana address when no extension is connected.
 */
export function useWallet() {
  const { connection } = useConnection();
  const adapter = useAdapterWallet();
  const heliusAuth = useHeliusAuth();
  const heliusSession = useHeliusSolanaSession();
  const adapterAddress = adapter.publicKey?.toBase58() ?? null;
  const hasExternalWallet = Boolean(adapter.connected && adapter.publicKey);
  const address =
    adapterAddress ??
    heliusSession.address ??
    (heliusAuth.authenticated ? heliusAuth.address : null);
  const connected = Boolean(adapter.connected || heliusAuth.authenticated);
  const connecting =
    adapter.connecting || Boolean(heliusAuth.authenticated && !address);

  const signAndSubmit = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (adapter.publicKey && adapter.sendTransaction && hasExternalWallet) {
        const transaction = new Transaction().add(...instructions);
        transaction.feePayer = adapter.publicKey;
        transaction.recentBlockhash = (
          await connection.getLatestBlockhash("confirmed")
        ).blockhash;
        return adapter.sendTransaction(transaction, connection);
      }
      if (heliusSession.signAndSubmit) return heliusSession.signAndSubmit(instructions);
      throw new Error("Connect a Solana wallet first.");
    },
    [adapter, connection, hasExternalWallet, heliusSession],
  );

  const disconnect = useCallback(async () => {
    try {
      if (adapter.connected) await adapter.disconnect();
    } catch (error) {
      console.error("Wallet disconnect failed:", error);
    }
    try {
      if (heliusAuth.authenticated) await heliusAuth.logout();
    } catch (error) {
      console.error("Email session logout failed:", error);
    }
  }, [adapter, heliusAuth]);

  return useMemo(
    () => ({
      address,
      account: address ? { address } : null,
      connected,
      connecting,
      disconnect,
      connect: adapter.connect,
      walletName:
        adapter.wallet?.adapter.name ??
        (heliusAuth.authenticated
          ? heliusAuth.email
            ? "Email"
            : "Helius"
          : null),
      /** Phantom / Solflare / Jupiter — pay by signing in the extension. */
      hasExternalWallet,
      /** Form8 fee sponsor for Helius embedded wallets (USDC/SOL + register/claim). */
      feePayer: hasExternalWallet ? null : heliusSession.feePayer,
      signAndSubmit,
      signTransaction: async (_legacyPayload?: unknown): Promise<any> => {
        throw new Error("Build Solana instructions through chainClient and call signAndSubmit.");
      },
      signAndSubmitTransaction: async (_legacyPayload?: unknown): Promise<any> => {
        throw new Error("Build Solana instructions through chainClient and call signAndSubmit.");
      },
    }),
    [
      address,
      adapter.connecting,
      adapter.connect,
      adapter.wallet,
      connected,
      connecting,
      disconnect,
      hasExternalWallet,
      heliusAuth.authenticated,
      heliusAuth.email,
      heliusSession.feePayer,
      signAndSubmit,
    ],
  );
}
