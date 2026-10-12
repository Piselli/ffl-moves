"use client";

import { createContext, useContext } from "react";

export type DepositContextValue = {
  openDeposit: () => void;
  openWithdraw: () => void;
  balanceLabel: string | null;
  refreshBalance: () => void;
  /** Refresh now and again shortly after — RPC reads can lag a beat behind a confirmed tx. */
  refreshBalanceAfterTx: () => void;
};

export const DepositContext = createContext<DepositContextValue>({
  openDeposit: () => {},
  openWithdraw: () => {},
  balanceLabel: null,
  refreshBalance: () => {},
  refreshBalanceAfterTx: () => {},
});

export function useDeposit(): DepositContextValue {
  return useContext(DepositContext);
}
