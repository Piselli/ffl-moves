import { SOLANA_CLUSTER, SOLANA_USDC_MINT } from "@/lib/constants";

/** Solana mainnet genesis (CAIP-2). Stripe onramp does not support Solana testnets. */
export const SOLANA_MAINNET_CAIP2 =
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as const;

/** Circle USDC on Solana mainnet — destination for fiat onramp. */
export const PRIVY_ONRAMP_USDC_MINT =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const PRIVY_ONRAMP_DEFAULT_USD = "10";

export type PrivyOnrampEnvironment = "sandbox" | "production";

export function privyOnrampEnvironment(): PrivyOnrampEnvironment {
  const raw = (process.env.NEXT_PUBLIC_PRIVY_ONRAMP_ENV ?? "").trim().toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

/** Card → USDC only makes sense when the app itself is on Solana mainnet. */
export function isPrivyOnrampUsdcAvailable(): boolean {
  return (
    SOLANA_CLUSTER === "mainnet-beta" &&
    SOLANA_USDC_MINT === PRIVY_ONRAMP_USDC_MINT
  );
}
