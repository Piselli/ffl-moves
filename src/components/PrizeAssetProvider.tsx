"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPrizeDisplay, type PrizeDisplay } from "@/lib/entryFee";

export type PrizeAssetContextValue = PrizeDisplay;

const PRIZE_DISPLAY: PrizeAssetContextValue = createPrizeDisplay();

const PrizeAssetContext = createContext<PrizeAssetContextValue>(PRIZE_DISPLAY);

export function PrizeAssetProvider({ children }: { children: ReactNode }) {
  return (
    <PrizeAssetContext.Provider value={PRIZE_DISPLAY}>
      {children}
    </PrizeAssetContext.Provider>
  );
}

export function usePrizeAsset(): PrizeAssetContextValue {
  return useContext(PrizeAssetContext);
}
