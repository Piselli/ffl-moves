"use client";

import { type ComponentProps, type PropsWithChildren } from "react";
import { Network } from "@aptos-labs/ts-sdk";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MOVEMENT_RPC_URL } from "@/lib/constants";

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

export function WalletProvider({ children }: PropsWithChildren) {
  /** Runtime adapter reads `fullnode` (see wallet-adapter-core `getAptosConfig`); duplicate `.d.ts` in pnpm may omit `fullnode`. */
  const dappConfig = {
    network: walletAdapterDappNetwork(),
    fullnode: MOVEMENT_RPC_URL,
  } as ComponentProps<typeof AptosWalletAdapterProvider>["dappConfig"];

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      optInWallets={["Nightly"]}
      dappConfig={dappConfig}
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
