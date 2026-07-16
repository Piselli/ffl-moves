import { ENTRY_FEE_USDCX, usdcxMetadataForRpc, MOVEMENT_RPC_URL } from "./constants";

/** Stableyard routing chain id for Movement (mainnet). */
export const STABLEYARD_MOVEMENT_CHAIN_ID = 10002;

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
