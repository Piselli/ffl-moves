"use client";

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { PrivyProvider, usePrivy, type LoginModalOptions, type User } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import {
  isPrivyConfigured,
  PRIVY_APP_ID,
  PRIVY_CLIENT_ID,
} from "@/lib/privy";
import { SOLANA_RPC_URL } from "@/lib/constants";

type PrivyAuthValue = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  user: User | null;
  login: (options?: LoginModalOptions) => void;
  logout: () => Promise<void>;
};

const emptyAuth: PrivyAuthValue = {
  configured: false,
  ready: true,
  authenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
};

const PrivyAuthContext = createContext<PrivyAuthValue>(emptyAuth);

export function usePrivyAuth(): PrivyAuthValue {
  return useContext(PrivyAuthContext);
}

function PrivyAuthInner({ children }: PropsWithChildren) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const value = useMemo<PrivyAuthValue>(
    () => ({
      configured: true,
      ready,
      authenticated,
      user: user ?? null,
      login,
      logout: () => logout(),
    }),
    [authenticated, login, logout, ready, user],
  );

  return <PrivyAuthContext.Provider value={value}>{children}</PrivyAuthContext.Provider>;
}

/** Privy embedded wallet UIs need CAIP-2 RPC clients (`signTransaction` / `signAndSend`). */
function solanaRpcWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
}

const PRIVY_SOLANA_RPC_ENTRY = {
  rpc: createSolanaRpc(SOLANA_RPC_URL),
  rpcSubscriptions: createSolanaRpcSubscriptions(solanaRpcWsUrl(SOLANA_RPC_URL)),
};

export function PrivyAppProvider({ children }: PropsWithChildren) {
  if (!isPrivyConfigured()) {
    return <PrivyAuthContext.Provider value={emptyAuth}>{children}</PrivyAuthContext.Provider>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      {...(PRIVY_CLIENT_ID ? { clientId: PRIVY_CLIENT_ID } : {})}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#00f948",
          walletChainType: "solana-only",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "all-users" },
        },
        solana: {
          // Register both CAIP-2 keys so a mismatch with SOLANA_CLUSTER still resolves.
          rpcs: {
            "solana:mainnet": PRIVY_SOLANA_RPC_ENTRY,
            "solana:devnet": PRIVY_SOLANA_RPC_ENTRY,
          },
        },
      }}
    >
      <PrivyAuthInner>{children}</PrivyAuthInner>
    </PrivyProvider>
  );
}
