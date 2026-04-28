"use client";

import { PropsWithChildren } from "react";
import { Network } from "@aptos-labs/ts-sdk";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MOVEMENT_RPC_URL } from "@/lib/constants";

const queryClient = new QueryClient();

/**
 * Wallet adapter's `getAptosConfig` (core) only allows Movement / custom fullnode if
 * `dappConfig.fullnode` contains "movementnetwork" — otherwise it falls back to the
 * wallet's `networkInfo.name`, which is often "custom" on Nightly and throws
 * "Invalid network, network custom not supported…".
 * @see node_modules/@aptos-labs/wallet-adapter-core (getAptosConfig)
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
      dappConfig={{ network: walletAdapterDappNetwork(), fullnode: MOVEMENT_RPC_URL }}
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
