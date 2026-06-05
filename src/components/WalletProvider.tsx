"use client";

import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from "react";
import { Network } from "@aptos-labs/ts-sdk";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MOVEMENT_RPC_URL } from "@/lib/constants";
import { WalletSessionRestore } from "@/components/WalletSessionRestore";

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

/**
 * Wallet adapter only applies the Movement fullnode if `dappConfig.fullnode` contains
 * "movementnetwork". Without it, Nightly may report `custom` and throw
 * "Invalid network… custom not supported".
 * @see wallet-adapter-core `getAptosConfig` (internal name in upstream package)
 */
function walletAdapterDappNetwork(): Network {
  const u = MOVEMENT_RPC_URL.toLowerCase();
  if (u.includes("mainnet")) return Network.MAINNET;
  return Network.TESTNET;
}

/**
 * `wallet-adapter-core` only treats the dapp as “Movement” if `dappConfig.fullnode` is a
 * string containing `movementnetwork`. Custom RPCs without that substring (or a broken env)
 * make Nightly report `custom` and throw — even though reads use `MOVEMENT_RPC_URL`.
 */
function walletAdapterFullnodeOverride(): string {
  const raw = MOVEMENT_RPC_URL.trim();
  const lower = raw.toLowerCase();
  if (lower.includes("movementnetwork")) return raw;
  if (lower.includes("testnet")) return "https://testnet.movementnetwork.xyz/v1";
  return "https://mainnet.movementnetwork.xyz/v1";
}

export function WalletProvider({ children }: PropsWithChildren) {
  const [lastError, setLastError] = useState<string | null>(null);

  /** Runtime adapter reads `fullnode` (see wallet-adapter-core `getAptosConfig`); duplicate `.d.ts` in pnpm may omit `fullnode`. */
  const dappConfig = {
    network: walletAdapterDappNetwork(),
    fullnode: walletAdapterFullnodeOverride(),
  } as ComponentProps<typeof AptosWalletAdapterProvider>["dappConfig"];

  return (
    <WalletAdapterErrorContext.Provider
      value={{ lastError, clearError: () => setLastError(null) }}
    >
      <AptosWalletAdapterProvider
        autoConnect
        optInWallets={["Nightly"]}
        dappConfig={dappConfig}
        onError={(error) => {
          const msg =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Wallet connection failed";
          setLastError(msg);
          console.error("Wallet adapter error:", error);
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WalletSessionRestore />
          {children}
        </QueryClientProvider>
      </AptosWalletAdapterProvider>
    </WalletAdapterErrorContext.Provider>
  );
}
