"use client";

import { useEffect, useRef } from "react";
import { useHeliusAuth } from "@/components/HeliusAppProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import { trackAuthConnect } from "@/lib/authConnectClient";

/**
 * Invisible: when the user connects (extension wallet or Helius email/passkey),
 * fire a session-deduped track event. Mounted once in the root layout.
 */
export function AuthConnectTracker() {
  const { address, connected, authReady, hasExternalWallet, walletName } = useWallet();
  const helius = useHeliusAuth();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady || !connected || !address) return;

    const method = hasExternalWallet
      ? "wallet"
      : helius.email
        ? "email"
        : "passkey";

    const key = `${method}:${address}`;
    if (lastSent.current === key) return;
    lastSent.current = key;

    trackAuthConnect({
      wallet: address,
      method,
      provider: method === "wallet" ? walletName : null,
    });
  }, [
    address,
    authReady,
    connected,
    hasExternalWallet,
    helius.email,
    walletName,
  ]);

  return null;
}
