"use client";

import { useMemo, type PropsWithChildren, createContext, useContext } from "react";
import { HeliusWalletProvider, useHeliusWallet } from "helius-wallet-kit";
import { heliusCluster } from "@/lib/helius";

type HeliusAuthValue = {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
  email: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const emptyAuth: HeliusAuthValue = {
  ready: false,
  authenticated: false,
  address: null,
  email: null,
  login: async () => {
    throw new Error("Helius wallet is not ready.");
  },
  logout: async () => {},
};

const HeliusAuthContext = createContext<HeliusAuthValue>(emptyAuth);

export function useHeliusAuth(): HeliusAuthValue {
  return useContext(HeliusAuthContext);
}

function HeliusAuthInner({ children }: PropsWithChildren) {
  const { status, address, user, login, logout } = useHeliusWallet();
  const value = useMemo<HeliusAuthValue>(
    () => ({
      ready: status !== "loading",
      authenticated: status === "authenticated" && Boolean(address),
      address: address ?? null,
      email: user?.email ?? null,
      login,
      logout,
    }),
    [address, login, logout, status, user?.email],
  );
  return <HeliusAuthContext.Provider value={value}>{children}</HeliusAuthContext.Provider>;
}

export function HeliusAppProvider({ children }: PropsWithChildren) {
  const cluster = heliusCluster();
  return (
    <HeliusWalletProvider
      config={{
        cluster,
        // Email / passkey only — Phantom, Solflare, Jupiter stay on wallet-adapter.
        authMethods: {
          email: true,
          passkey: true,
          sms: false,
          wallet: false,
          google: false,
          apple: false,
          discord: false,
          x: false,
        },
        theme: {
          darkMode: true,
          primaryColor: "#00f948",
          borderRadius: "12px",
        },
        onError: (error) => {
          console.error("Helius WaaS error:", error);
        },
      }}
    >
      <HeliusAuthInner>{children}</HeliusAuthInner>
    </HeliusWalletProvider>
  );
}
