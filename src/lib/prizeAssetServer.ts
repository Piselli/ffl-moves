import { createPrizeDisplay, type PrizeDisplay } from "./entryFee";
import { getConfig } from "./movement";

/** Server components (PrizeTicker, etc.) — reads chain config once. */
export async function getPrizeDisplayFromChain(): Promise<PrizeDisplay> {
  const cfg = await getConfig();
  return createPrizeDisplay(cfg?.entryFeeAsset);
}
