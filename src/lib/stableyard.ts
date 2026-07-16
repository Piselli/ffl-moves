import { ENTRY_FEE_USDCX, usdcxMetadataForRpc, MOVEMENT_RPC_URL } from "./constants";

/** Settlement chain — excluded from “pay from” source count in UI copy. */
export const STABLEYARD_MOVEMENT_CHAIN_ID = 10002;

/** Highlight chains shown by name; remainder shown as “+N chains”. From routing-api.stableyard.fi/v1/chains. */
export const STABLEYARD_HIGHLIGHT_CHAINS = ["Ethereum", "Base", "Solana"] as const;

/** Supported mainnet source chains (routing API total minus Movement destination). */
export const STABLEYARD_SOURCE_CHAIN_COUNT = 12;

export function stableyardExtraChainCount(): number {
  return Math.max(0, STABLEYARD_SOURCE_CHAIN_COUNT - STABLEYARD_HIGHLIGHT_CHAINS.length);
}

export const STABLEYARD_USDCX_TOKEN = "USDCx";
export const STABLEYARD_USDCX_DECIMALS = 6;

export function isStableyardEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STABLEYARD_ENABLED !== "false";
}

export function stableyardUsdcxMetadata(): string {
  return usdcxMetadataForRpc(MOVEMENT_RPC_URL);
}

/** Human-readable entry fee for Stableyard `exact_output` deposits. */
export function stableyardDepositAmount(entryFeeRaw: number | null | undefined): string {
  if (entryFeeRaw != null && entryFeeRaw > 0) {
    return String(entryFeeRaw / 1_000_000);
  }
  return String(ENTRY_FEE_USDCX);
}
