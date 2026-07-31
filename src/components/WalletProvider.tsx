"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SOLANA_RPC_URL } from "@/lib/constants";

type WalletAdapterErrorContextValue = {
  lastError: string | null;
  clearError: () => void;
};

const WalletAdapterErrorContext = createContext<WalletAdapterErrorContextValue>({
  lastError: null,
  clearError: () => {},
});

export function useWalletAdapterError(): WalletAdapterErrorContextValue {
  return useContext(WalletAdapterErrorContext);
}

const queryClient = new QueryClient();

export function WalletProvider({ children }: PropsWithChildren) {
  const [lastError, setLastError] = useState<string | null>(null);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <WalletAdapterErrorContext.Provider
      value={{ lastError, clearError: () => setLastError(null) }}
    >
      <ConnectionProvider endpoint={SOLANA_RPC_URL}>
        <SolanaWalletProvider
          autoConnect
          wallets={wallets}
          onError={(error) => {
            const msg = error instanceof Error ? error.message : "Wallet connection failed";
            setLastError(msg);
            console.error("Wallet adapter error:", error);
          }}
        >
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    </WalletAdapterErrorContext.Provider>
  );
}
