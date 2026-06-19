"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  WALLET_DESKTOP_SCAN_MS,
  isMobileBrowser,
  movementWalletConnectRows,
  movementWalletDefByAdapterName,
} from "@/lib/walletNightly";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { useWalletAdapterError } from "@/components/WalletProvider";

function openingMessage(
  walletName: string,
  m: ReturnType<typeof useSiteMessages>,
): string {
  const def = movementWalletDefByAdapterName(walletName);
  if (def?.id === "motion") return m.nav.openingMotion;
  return m.nav.openingNightly;
}

/**
 * Connect to a Movement wallet from a direct click handler.
 * `connect()` must run synchronously in the click stack (browser extension popup).
 */
export function useWalletConnect() {
  const { connect, connected, wallets, notDetectedWallets, isLoading } = useWallet();
  const { lastError, clearError } = useWalletAdapterError();
  const m = useSiteMessages();
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const connectedRef = useRef(connected);
  connectedRef.current = connected;

  const walletRows = useMemo(
    () => movementWalletConnectRows(wallets, notDetectedWallets),
    [wallets, notDetectedWallets],
  );

  const hasInstalled = walletRows.some((r) => r.mode === "installed");
  const desktop = !isMobileBrowser();

  const [scanDone, setScanDone] = useState(() => !desktop || hasInstalled);

  useEffect(() => {
    if (!desktop || hasInstalled) {
      setScanDone(true);
      return;
    }
    setScanDone(false);
    const t = window.setTimeout(() => setScanDone(true), WALLET_DESKTOP_SCAN_MS);
    return () => window.clearTimeout(t);
  }, [desktop, hasInstalled, wallets.length, notDetectedWallets.length]);

  const adapterReady = !isLoading && (scanDone || hasInstalled);

  const connectWallet = (walletName: string) => {
    if (pending) return;

    clearError();
    setHint(null);
    setStatusLine(openingMessage(walletName, m));
    setPending(true);

    const watchdog = window.setTimeout(() => {
      if (!connectedRef.current) {
        setHint(hasInstalled ? m.nav.connectHintInstalled : m.nav.connectHintNightly);
        setStatusLine(null);
      }
    }, 3500);

    try {
      const result = connect(walletName) as unknown;
      Promise.resolve(result)
        .catch((e) => {
          console.error("Failed to connect:", e);
          const msg = e instanceof Error ? e.message : m.nav.connectHintFailed;
          setHint(msg);
          setStatusLine(null);
        })
        .finally(() => {
          window.clearTimeout(watchdog);
          setPending(false);
          if (connectedRef.current) setStatusLine(null);
        });
    } catch (e) {
      console.error("Failed to connect:", e);
      window.clearTimeout(watchdog);
      setPending(false);
      setStatusLine(null);
      setHint(m.nav.connectHintFailed);
    }
  };

  return {
    walletRows,
    /** @deprecated Use walletRows */
    nightlyRows: walletRows,
    adapterReady,
    scanDone,
    hasInstalled,
    pending,
    hint,
    statusLine,
    lastError,
    connectWallet,
    /** @deprecated Use connectWallet */
    connectNightly: connectWallet,
    connected,
  };
}

/** @deprecated Use useWalletConnect */
export const useNightlyConnect = useWalletConnect;
