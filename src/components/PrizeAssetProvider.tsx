"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPrizeDisplay, ENTRY_FEE_ASSET_USDCX, type PrizeDisplay } from "@/lib/entryFee";
import { getConfig } from "@/lib/movement";

const PrizeAssetContext = createContext<PrizeDisplay | null>(null);

const DEFAULT = createPrizeDisplay(ENTRY_FEE_ASSET_USDCX);

export function PrizeAssetProvider({ children }: { children: ReactNode }) {
  const [chainAsset, setChainAsset] = useState(ENTRY_FEE_ASSET_USDCX);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((cfg) => {
        if (!cancelled) setChainAsset(cfg?.entryFeeAsset ?? ENTRY_FEE_ASSET_USDCX);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const display = useMemo(() => createPrizeDisplay(chainAsset), [chainAsset]);

  return (
    <PrizeAssetContext.Provider value={ready ? display : DEFAULT}>
      {children}
    </PrizeAssetContext.Provider>
  );
}

export function usePrizeAsset(): PrizeDisplay {
  return useContext(PrizeAssetContext) ?? DEFAULT;
}
