import type { User } from "@privy-io/react-auth";

export const PRIVY_APP_ID = (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "").trim();
export const PRIVY_CLIENT_ID = (process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID ?? "").trim();

export function isPrivyConfigured(): boolean {
  return PRIVY_APP_ID.length > 0;
}

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
}

export function privyLinkedSolanaAddress(user: User | null | undefined): string | null {
  if (!user) return null;
  for (const account of user.linkedAccounts) {
    if (account.type === "wallet" && account.chainType === "solana" && account.address) {
      return account.address;
    }
  }
  if (user.wallet?.chainType === "solana") return user.wallet.address;
  return null;
}

export function privyLoginLabel(user: User | null | undefined): "Google" | "Email" | null {
  if (!user) return null;
  return user.google ? "Google" : "Email";
}

/** Wallet-adapter / Wallet Standard name for Privy's embedded Solana wallet. */
export function isPrivyWalletName(name: string | null | undefined): boolean {
  return Boolean(name && /privy/i.test(name));
}
