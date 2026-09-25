/**
 * Solana RPC resolution.
 *
 * Browser must NEVER call a domain-ACL Helius URL directly for app reads —
 * Allowed Domains / Allowed IPs return 403 and our UI treats that as 0 USDC.
 * All browser traffic goes through `/api/solana/rpc` (server uses an
 * unrestricted endpoint).
 */

function publicEnv(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

export type SolanaCluster = "mainnet-beta" | "devnet";

export function solanaCluster(): SolanaCluster {
  return publicEnv(process.env.NEXT_PUBLIC_SOLANA_CLUSTER) === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";
}

/** Unrestricted RPC for Node (Vercel, cron, proxy). Never rely on browser Origin. */
export function resolveServerSolanaRpcUrl(): string {
  const cluster = solanaCluster();
  const dedicated = publicEnv(process.env.SOLANA_SERVER_RPC_URL);
  if (dedicated) return dedicated;
  // Public cluster RPCs accept Node traffic; Helius domain-ACL keys do not.
  return cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

/**
 * Browser ConnectionProvider / chainClient endpoint — same-origin proxy.
 * Call only in the browser (after mount).
 */
export function resolveBrowserSolanaRpcUrl(): string {
  if (typeof window === "undefined") {
    return resolveServerSolanaRpcUrl();
  }
  return `${window.location.origin}/api/solana/rpc`;
}
