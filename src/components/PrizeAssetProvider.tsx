"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createPrizeDisplay,
  ENTRY_FEE_ASSET_MOVE,
  type PrizeDisplay,
} from "@/lib/entryFee";
import { getConfig } from "@/lib/movement";

export type PrizeAssetContextValue = PrizeDisplay & {
  /** True only when deployed module exposes `get_entry_fee_asset` and asset = USDCx. */
  usdcxEntryLive: boolean;
};

const PrizeAssetContext = createContext<PrizeAssetContextValue | null>(null);

const DEFAULT: PrizeAssetContextValue = {
  ...createPrizeDisplay(ENTRY_FEE_ASSET_MOVE),
  usdcxEntryLive: false,
};

export function PrizeAssetProvider({ children }: { children: ReactNode }) {
  const [chainAsset, setChainAsset] = useState(ENTRY_FEE_ASSET_MOVE);
  const [usdcxEntryLive, setUsdcxEntryLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((cfg) => {
        if (!cancelled) {
          setChainAsset(cfg?.entryFeeAsset ?? ENTRY_FEE_ASSET_MOVE);
          setUsdcxEntryLive(cfg?.usdcxEntryLive ?? false);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const display = useMemo(
    (): PrizeAssetContextValue => ({
      ...createPrizeDisplay(chainAsset),
      usdcxEntryLive,
    }),
    [chainAsset, usdcxEntryLive],
  );

  return (
    <PrizeAssetContext.Provider value={ready ? display : DEFAULT}>
      {children}
    </PrizeAssetContext.Provider>
  );
}

export function usePrizeAsset(): PrizeAssetContextValue {
  return useContext(PrizeAssetContext) ?? DEFAULT;
}
