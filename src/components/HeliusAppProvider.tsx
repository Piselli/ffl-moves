"use client";

import { useMemo, type PropsWithChildren, createContext, useContext } from "react";
import { HeliusWalletProvider, useHeliusWallet } from "helius-wallet-kit";
import { FORM8_MARK_SRC } from "@/components/Form8Mark";
import { heliusCluster } from "@/lib/helius";

function form8LogoUrl(): string {
  if (typeof window === "undefined") return FORM8_MARK_SRC;
  return `${window.location.origin}${FORM8_MARK_SRC}`;
}

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
  const logoUrl = useMemo(() => form8LogoUrl(), []);
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
          // Turnkey modal shows a broken <img> without these (defaults to
          // /Helius-Horizontal-Logo-*.svg which we don't host).
          logoLight: logoUrl,
          logoDark: logoUrl,
        },
        onError: (error) => {
          const code =
            typeof error === "object" && error && "code" in error
              ? String((error as { code?: unknown }).code ?? "")
              : "";
          console.error("Helius WaaS error:", code || error.name, error.message, error);
        },
      }}
    >
      <HeliusAuthInner>{children}</HeliusAuthInner>
    </HeliusWalletProvider>
  );
}
