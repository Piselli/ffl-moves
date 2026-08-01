"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
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

/**
 * Connect to a Solana wallet from a direct click handler.
 * The selected adapter is connected directly in the click stack so browser
 * extensions can open their approval window without a React-state race.
 */
export function useWalletConnect() {
  const { connected, wallets, select, connecting } = useWallet();
  const { lastError, clearError } = useWalletAdapterError();
  const m = useSiteMessages();
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const connectedRef = useRef(connected);
  connectedRef.current = connected;

  const walletRows = useMemo(
    () => solanaWalletConnectRows(wallets.map(({ adapter }) => ({
      name: adapter.name,
      icon: adapter.icon,
    }))),
    [wallets],
  );

  const hasInstalled = walletRows.some((r) => r.mode === "installed");
  const desktop = !isMobileBrowser();

  const scanDone = !desktop || hasInstalled;
  const adapterReady = !connecting;

  const connectWallet = (walletName: string) => {
    if (pending) return;

    clearError();
    setHint(null);
    setStatusLine(openingMessage(walletName, m));
    setPending(true);

    const watchdog = window.setTimeout(() => {
      if (!connectedRef.current) {
        setHint(hasInstalled ? m.nav.connectHintInstalled : m.nav.connectHintNotInstalled);
        setStatusLine(null);
      }
    }, 3500);

    try {
      select(walletName as never);
      const selected = wallets.find(({ adapter }) => adapter.name === walletName)?.adapter;
      if (!selected) throw new Error(`Wallet ${walletName} is unavailable.`);
      const result = selected.connect() as unknown;
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
