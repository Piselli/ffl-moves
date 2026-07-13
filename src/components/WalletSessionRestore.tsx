"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { movementWalletDefByAdapterName } from "@/lib/walletNightly";

const RESTORE_WINDOW_MS = 8000;
const POLL_MS = 450;
const MAX_ATTEMPTS = 10;

/**
 * Nightly injects into the page after first paint. Built-in autoConnect can miss it;
 * this restores the previous session once the extension appears in `wallets`.
 *
 * Motion is available immediately and already handled by `autoConnect` on the provider.
 * Retrying `connect()` here spams the Motion unlock popup (Nightly restores silently).
 */
export function WalletSessionRestore() {
  const { connected, connect, wallets, isLoading } = useWallet();
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || connected) return;

    const saved = localStorage.getItem("AptosWalletName");
    if (!saved) return;

    const savedDef = movementWalletDefByAdapterName(saved);
    if (!savedDef || savedDef.id !== "nightly") return;

    let cancelled = false;
    const deadline = Date.now() + RESTORE_WINDOW_MS;

    const tryRestore = () => {
      if (cancelled || connected || isLoading) return;
      if (attemptsRef.current >= MAX_ATTEMPTS) return;
      if (!wallets.some((w) => w.name === saved)) return;

      attemptsRef.current += 1;
      const result = connect(saved) as unknown;
      Promise.resolve(result).catch(() => {
        /* user dismissed popup or wallet busy — allow another attempt */
      });
    };

    tryRestore();

    const id = window.setInterval(() => {
      if (cancelled || connected || Date.now() > deadline) {
        clearInterval(id);
        return;
      }
      tryRestore();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connected, connect, wallets, isLoading]);

  return null;
}
