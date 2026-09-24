import { SOLANA_CLUSTER } from "@/lib/constants";

/** Client can always attempt WaaS; server needs `HELIUS_API_KEY` on Developer+. */
export function heliusCluster(): "mainnet-beta" | "devnet" {
  return SOLANA_CLUSTER === "mainnet-beta" ? "mainnet-beta" : "devnet";
}

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}
