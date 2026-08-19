"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WalletAdapter, WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWallet as useAppWallet } from "@/hooks/useSolanaWallet";
import {
  isMobileBrowser,
  solanaWalletConnectRows,
  solanaWalletDefByAdapterName,
} from "@/lib/solanaWallets";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { useWalletAdapterError } from "@/components/WalletProvider";

function openingMessage(
  walletName: string,
  m: ReturnType<typeof useSiteMessages>,
): string {
  const def = solanaWalletDefByAdapterName(walletName);
  return def ? `Opening ${def.displayName}…` : m.nav.loading;
}

/** Re-emit connect after WalletProvider attaches listeners (Phantom race). */
function syncAdapterConnect(adapter: WalletAdapter, appConnected: boolean) {
  if (appConnected || !adapter.connected || !adapter.publicKey) return;
  queueMicrotask(() => {
    if (adapter.connected && adapter.publicKey) {
      adapter.emit("connect", adapter.publicKey);
    }
  });
}

/**
 * Connect to a Solana wallet from a direct click handler.
 * The selected adapter is connected directly in the click stack so browser
 * extensions can open their approval window without a React-state race.
 *
 * After logout, Phantom (Wallet Standard) often still has an authorized
 * account, so `connect()` resolves immediately and emits `connect` before
 * WalletProvider has attached listeners to the newly selected adapter.
 * Re-emit once the provider is listening so the app session updates
 * without a full page reload.
 */
export function useWalletConnect() {
  const { wallets, wallet, select, connecting } = useWallet();
  const { connected } = useAppWallet();
  const { lastError, clearError } = useWalletAdapterError();
  const m = useSiteMessages();
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  const pendingNameRef = useRef<string | null>(null);

  const walletRows = useMemo(
    () => solanaWalletConnectRows(wallets.map(({ adapter, readyState }) => ({
      name: adapter.name,
      icon: adapter.icon,
      readyState,
    }))),
    [wallets],
  );

  const hasInstalled = walletRows.some((r) => r.mode === "installed");
  const desktop = !isMobileBrowser();

  const scanDone = !desktop || hasInstalled;
  const adapterReady = !connecting;

  useEffect(() => {
    if (!connected) return;
    pendingNameRef.current = null;
    setPending(false);
    setStatusLine(null);
  }, [connected]);

  useEffect(() => {
    if (!pendingNameRef.current || !wallet) return;
    if (wallet.adapter.name !== pendingNameRef.current) return;
    if (connected || !wallet.adapter.connected || !wallet.adapter.publicKey) return;
    wallet.adapter.emit("connect", wallet.adapter.publicKey);
  }, [
    connected,
    wallet,
    wallet?.adapter.connected,
    wallet?.adapter.publicKey?.toBase58(),
  ]);

  const connectWallet = (walletName: string) => {
    if (pending) return;

    clearError();
    setHint(null);
    setStatusLine(openingMessage(walletName, m));
    setPending(true);
    pendingNameRef.current = walletName;

    const watchdog = window.setTimeout(() => {
      if (!connectedRef.current) {
        pendingNameRef.current = null;
        setHint(hasInstalled ? m.nav.connectHintInstalled : m.nav.connectHintNotInstalled);
        setStatusLine(null);
        setPending(false);
      }
    }, 3500);

    try {
      const found = wallets.find(({ adapter }) => adapter.name === walletName);
      const def = solanaWalletDefByAdapterName(walletName);
      if (!found || found.readyState === "NotDetected" || found.readyState === "Unsupported") {
        window.clearTimeout(watchdog);
        pendingNameRef.current = null;
        setPending(false);
        setStatusLine(null);
        if (def) {
          window.open(
            isMobileBrowser() ? def.downloadUrl : def.chromeExtensionUrl,
            "_blank",
            "noopener,noreferrer",
          );
        }
        setHint(m.nav.connectHintNotInstalled);
        return;
      }
      select(walletName as WalletName);
      const adapter = found.adapter;
      const result = adapter.connect() as unknown;
      syncAdapterConnect(adapter, connectedRef.current);
      Promise.resolve(result)
        .then(() => {
          syncAdapterConnect(adapter, connectedRef.current);
          window.clearTimeout(watchdog);
          if (connectedRef.current) {
            pendingNameRef.current = null;
            setPending(false);
            setStatusLine(null);
          }
        })
        .catch((e) => {
          window.clearTimeout(watchdog);
          pendingNameRef.current = null;
          console.error("Failed to connect:", e);
          const msg = e instanceof Error ? e.message : m.nav.connectHintFailed;
          setHint(msg);
          setStatusLine(null);
          setPending(false);
        });
    } catch (e) {
      console.error("Failed to connect:", e);
      window.clearTimeout(watchdog);
      pendingNameRef.current = null;
      setPending(false);
      setStatusLine(null);
      setHint(m.nav.connectHintFailed);
    }
  };

  return {
    walletRows,
    adapterReady,
    scanDone,
    hasInstalled,
    pending,
    hint,
    statusLine,
    lastError,
    connectWallet,
    connected,
  };
}
