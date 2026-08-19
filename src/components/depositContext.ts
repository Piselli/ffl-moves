"use client";

import { createContext, useContext } from "react";

export type DepositContextValue = {
  openDeposit: () => void;
  balanceLabel: string | null;
  refreshBalance: () => void;
};

export const DepositContext = createContext<DepositContextValue>({
  openDeposit: () => {},
  balanceLabel: null,
  refreshBalance: () => {},
});

export function useDeposit(): DepositContextValue {
  return useContext(DepositContext);
}
