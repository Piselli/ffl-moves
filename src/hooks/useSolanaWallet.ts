"use client";

import { useCallback, useMemo } from "react";
import {
  useConnection,
  useWallet as useAdapterWallet,
} from "@solana/wallet-adapter-react";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { useHeliusAuth } from "@/components/HeliusAppProvider";
import { useHeliusSolanaSession } from "@/components/HeliusSolanaSession";
import {
  fetchFeePayer,
  isForm8Sponsorable,
  submitSponsoredTransaction,
} from "@/lib/sponsorClient";

/**
 * App-facing wallet adapter. Pages only receive base58 addresses and submit
 * instruction arrays; Solana SDK details stay in this hook and chainClient.
 *
 * Phantom / Solflare / Jupiter stay on the wallet adapter. Email login uses a
 * Helius embedded Solana address when no extension is connected.
 *
 * Register / claim use Form8 fee sponsorship for both paths when configured,
 * so a USDC-only wallet can confirm a squad without holding SOL for gas.
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
  /** False while Helius is still resolving a cached email/passkey session. */
  const authReady = heliusAuth.ready;

  const signAndSubmit = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (adapter.publicKey && hasExternalWallet) {
        const userKey = adapter.publicKey;

        // Same gasless path as Helius email — Phantom signs as owner only.
        if (isForm8Sponsorable(instructions) && adapter.signTransaction) {
          const sponsor = await fetchFeePayer();
          if (sponsor) {
            try {
              return await submitSponsoredTransaction({
                instructions,
                userKey,
                connection,
                feePayer: sponsor,
                signPartial: async (serialized) => {
                  const tx = Transaction.from(serialized);
                  const signed = await adapter.signTransaction!(tx);
                  return signed.serialize({
                    requireAllSignatures: false,
                    verifySignatures: false,
                  });
                },
              });
            } catch (sponsorError) {
              // Rule rejections are final — paying the fee ourselves must not bypass them.
              const msg = sponsorError instanceof Error ? sponsorError.message : "";
              if (
                /registration for this gameweek is closed|legal attestation required/i.test(msg)
              ) {
                throw sponsorError;
              }
              console.warn(
                "Form8 fee sponsorship failed for extension wallet, falling back:",
                sponsorError,
              );
            }
          }
        }

        // Prefer sign + our RPC send. Phantom's sendTransaction often fails
        // preflight on its own RPC (especially admin ixs / localhost), while the
        // same tx simulates fine through `/api/solana/rpc`.
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        const transaction = new Transaction().add(...instructions);
        transaction.feePayer = userKey;
        transaction.recentBlockhash = blockhash;

        if (adapter.signTransaction) {
          try {
            const signed = await adapter.signTransaction(transaction);
            const sig = await connection.sendRawTransaction(signed.serialize(), {
              skipPreflight: false,
              preflightCommitment: "confirmed",
            });
            await connection.confirmTransaction(
              { signature: sig, blockhash, lastValidBlockHeight },
              "confirmed",
            );
            return sig;
          } catch (signSendError) {
            console.error("Wallet sign+sendRaw failed:", signSendError);
            const msg =
              signSendError instanceof Error ? signSendError.message : String(signSendError);
            // Don't open a second wallet popup if the user already cancelled.
            if (/user rejected|user denied|rejected the request|cancelled|canceled/i.test(msg)) {
              throw signSendError;
            }
            throw signSendError;
          }
        }

        if (!adapter.sendTransaction) {
          throw new Error("Connected wallet cannot send transactions.");
        }
        try {
          return await adapter.sendTransaction(transaction, connection);
        } catch (sendError) {
          console.error("Wallet sendTransaction failed:", sendError);
          throw sendError;
        }
      }
      if (heliusSession.signAndSubmit) {
        return heliusSession.signAndSubmit(instructions);
      }
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
      authReady,
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
      /** Form8 fee sponsor pubkey when known (Helius session caches it). */
      feePayer: heliusSession.feePayer,
      signAndSubmit,
      signTransaction: async (_legacyPayload?: unknown): Promise<any> => {
        throw new Error(
          "Build Solana instructions through chainClient and call signAndSubmit.",
        );
      },
      signAndSubmitTransaction: async (
        _legacyPayload?: unknown,
      ): Promise<any> => {
        throw new Error(
          "Build Solana instructions through chainClient and call signAndSubmit.",
        );
      },
    }),
    [
      address,
      adapter.connecting,
      adapter.connect,
      adapter.wallet,
      authReady,
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
