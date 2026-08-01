import { createPrizeDisplay, type PrizeDisplay } from "./entryFee";

/** Server components (PrizeTicker, etc.) — prizes are always SPL USDC on Solana. */
export async function getPrizeDisplayFromChain(): Promise<PrizeDisplay> {
  return createPrizeDisplay();
}
