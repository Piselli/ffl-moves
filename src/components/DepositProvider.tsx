"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { DepositContext } from "@/components/depositContext";
import { useWallet } from "@/hooks/useSolanaWallet";
import { formatFeeUnits } from "@/lib/entryFee";

const DepositModal = dynamic(
  () => import("@/components/DepositModal").then((m) => m.DepositModal),
  { ssr: false },
);

const WithdrawModal = dynamic(
  () => import("@/components/WithdrawModal").then((m) => m.WithdrawModal),
  { ssr: false },
);

export { useDeposit } from "@/components/depositContext";

async function fetchUsdcBalanceRaw(owner: string): Promise<bigint> {
  const res = await fetch(
    `/api/solana/balance?owner=${encodeURIComponent(owner)}`,
    { cache: "no-store" },
  );
  const data = (await res.json().catch(() => ({}))) as {
    amount?: string;
    error?: string;
  };
  if (!res.ok || data.amount == null) {
    throw new Error(data.error || `Balance HTTP ${res.status}`);
  }
  return BigInt(data.amount);
}

export function DepositProvider({ children }: PropsWithChildren) {
  const { address, connected } = useWallet();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [balanceLabel, setBalanceLabel] = useState<string | null>(null);
  const requestId = useRef(0);

  const refreshBalance = useCallback(() => {
    if (!connected || !address) {
      setBalanceLabel(null);
      return;
    }
    const id = ++requestId.current;
    fetchUsdcBalanceRaw(address)
      .then((raw) => {
        if (id === requestId.current) setBalanceLabel(formatFeeUnits(raw));
      })
      .catch((err) => {
        console.warn("USDC balance refresh failed:", err);
        // Never replace a known balance with a fake empty state on RPC blips.
      });
  }, [address, connected]);

  useEffect(() => {
    refreshBalance();
    const onFocus = () => refreshBalance();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshBalance();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshBalance]);

  const openDeposit = useCallback(() => {
    setWithdrawOpen(false);
    setDepositOpen(true);
  }, []);
  const closeDeposit = useCallback(() => {
    setDepositOpen(false);
    refreshBalance();
  }, [refreshBalance]);

  const openWithdraw = useCallback(() => {
    setDepositOpen(false);
    setWithdrawOpen(true);
  }, []);
  const closeWithdraw = useCallback(() => {
    setWithdrawOpen(false);
    refreshBalance();
  }, [refreshBalance]);

  return (
    <DepositContext.Provider
      value={{ openDeposit, openWithdraw, balanceLabel, refreshBalance }}
    >
      {children}
      {depositOpen ? (
        <DepositModal open={depositOpen} onClose={closeDeposit} />
      ) : null}
      {withdrawOpen ? (
        <WithdrawModal open={withdrawOpen} onClose={closeWithdraw} />
      ) : null}
    </DepositContext.Provider>
  );
}
