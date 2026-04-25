"use client";

import { PropsWithChildren } from "react";
import { Network } from "@aptos-labs/ts-sdk";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MOVEMENT_RPC_URL } from "@/lib/constants";

const queryClient = new QueryClient();

/**
 * Aptos Connect (Google/Apple SDK wallets) rejects Network.CUSTOM.
 * We still use Network.CUSTOM + fullnode in `src/lib/aptos.ts` for reads; here we only
 * satisfy the adapter so it can construct SDK wallets without throwing.
 */
function walletAdapterDappNetwork(): Network {
  const u = MOVEMENT_RPC_URL.toLowerCase();
  if (u.includes("mainnet")) return Network.MAINNET;
  return Network.TESTNET;
}

export function WalletProvider({ children }: PropsWithChildren) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      optInWallets={["Nightly"]}
      dappConfig={{ network: walletAdapterDappNetwork() }}
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
