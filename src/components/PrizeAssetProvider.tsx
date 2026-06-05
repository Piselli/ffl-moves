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
  /** False until on-chain entry fee asset has been fetched — avoids MOVE flash on USDCx fees. */
  ready: boolean;
};

const PrizeAssetContext = createContext<PrizeAssetContextValue | null>(null);

const DEFAULT: PrizeAssetContextValue = {
  ...createPrizeDisplay(ENTRY_FEE_ASSET_MOVE),
  usdcxEntryLive: false,
  ready: false,
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
      ready,
    }),
    [chainAsset, usdcxEntryLive, ready],
  );

  return (
    <PrizeAssetContext.Provider value={display}>
      {children}
    </PrizeAssetContext.Provider>
  );
}

export function usePrizeAsset(): PrizeAssetContextValue {
  return useContext(PrizeAssetContext) ?? DEFAULT;
}
