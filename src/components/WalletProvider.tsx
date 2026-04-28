"use client";

import { PropsWithChildren } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NETWORK } from "@/lib/constants";

const queryClient = new QueryClient();

/**
 * Movement deploys use `Network.CUSTOM` + `NEXT_PUBLIC_MOVEMENT_RPC_URL` in `src/lib/aptos.ts`.
 * Passing `MAINNET`/`TESTNET` here makes some wallets resolve modules against canonical Aptos RPC
 * (e.g. rpc.aptos.nightly.app) → `module_not_found` for Movement-only packages.
 */
export function WalletProvider({ children }: PropsWithChildren) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      optInWallets={["Nightly"]}
      dappConfig={{
        network: NETWORK,
      }}
      onError={(error) => {
        console.error("Wallet adapter error:", error);
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}
