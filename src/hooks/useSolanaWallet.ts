"use client";

import { useCallback, useMemo } from "react";
import { useConnection, useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { Transaction, TransactionInstruction } from "@solana/web3.js";

/**
 * App-facing wallet adapter. Pages only receive base58 addresses and submit
 * instruction arrays; Solana SDK details stay in this hook and chainClient.
 */
export function useWallet() {
  const { connection } = useConnection();
  const adapter = useAdapterWallet();
  const address = adapter.publicKey?.toBase58() ?? null;

  const signAndSubmit = useCallback(async (instructions: TransactionInstruction[]) => {
    if (!adapter.publicKey || !adapter.sendTransaction) throw new Error("Connect a Solana wallet first.");
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = adapter.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
    return adapter.sendTransaction(transaction, connection);
  }, [adapter, connection]);

  return useMemo(() => ({
    address,
    account: address ? { address } : null,
    connected: adapter.connected,
    connecting: adapter.connecting,
    disconnect: adapter.disconnect,
    connect: adapter.connect,
    signAndSubmit,
    /** Legacy transaction builders are deliberately unsupported after Solana migration. */
    signTransaction: async (_legacyPayload?: unknown): Promise<any> => {
      throw new Error("Build Solana instructions through chainClient and call signAndSubmit.");
    },
    signAndSubmitTransaction: async (_legacyPayload?: unknown): Promise<any> => {
      throw new Error("Build Solana instructions through chainClient and call signAndSubmit.");
    },
  }), [address, adapter.connected, adapter.connecting, adapter.disconnect, adapter.connect, signAndSubmit]);
}
