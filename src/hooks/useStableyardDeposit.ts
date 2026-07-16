"use client";

import { useCallback, useState } from "react";
import type { PaymentResult } from "@stableyard/widget";
import { waitForUsdcxBalance } from "@/lib/usdcxBalance";
import { loadStableyardClient } from "@/lib/stableyardClient";
import {
  STABLEYARD_MOVEMENT_CHAIN_ID,
  STABLEYARD_USDCX_DECIMALS,
  STABLEYARD_USDCX_TOKEN,
  stableyardDepositAmount,
  stableyardUsdcxMetadata,
} from "@/lib/stableyard";
import { useSiteMessages } from "@/i18n/LocaleProvider";

export type DepositPhase = "idle" | "confirming" | "ready" | "timeout";

export function useStableyardDeposit(
  walletAddress: string | undefined,
  entryFeeRaw: number | null | undefined,
) {
  const g = useSiteMessages().pages.gameweek;
  const [opening, setOpening] = useState(false);
  const [phase, setPhase] = useState<DepositPhase>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const requiredRaw = entryFeeRaw && entryFeeRaw > 0 ? entryFeeRaw : 5_000_000;
  const depositAmount = stableyardDepositAmount(entryFeeRaw);

  const reset = useCallback(() => {
    setPhase("idle");
    setLoadError(null);
    setOpening(false);
  }, []);

  const handleSuccess = useCallback(
    async (_result: PaymentResult) => {
      if (!walletAddress) return;
      setPhase("confirming");
      const raw = await waitForUsdcxBalance(walletAddress, requiredRaw, {
        attempts: 15,
        intervalMs: 2000,
      });
      setPhase(raw >= requiredRaw ? "ready" : "timeout");
    },
    [walletAddress, requiredRaw],
  );

  const openDeposit = useCallback(async () => {
    if (!walletAddress || opening) return;
    setOpening(true);
    setLoadError(null);
    try {
      const stableyard = await loadStableyardClient();
      stableyard.pay({
        recipient: walletAddress,
        destination: {
          chainId: STABLEYARD_MOVEMENT_CHAIN_ID,
          token: STABLEYARD_USDCX_TOKEN,
          tokenAddress: stableyardUsdcxMetadata(),
          decimals: STABLEYARD_USDCX_DECIMALS,
          amount: depositAmount,
        },
        routeMode: "exact_output",
        theme: "dark",
        onSuccess: (result) => {
          void handleSuccess(result);
        },
        onError: (err) => setLoadError(err.message || g.stableyardDepositError),
        onCancel: () => setOpening(false),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : g.stableyardDepositError;
      setLoadError(msg);
      console.error("Stableyard load error:", err);
    } finally {
      setOpening(false);
    }
  }, [walletAddress, opening, depositAmount, handleSuccess, g.stableyardDepositError]);

  return {
    openDeposit,
    opening,
    phase,
    loadError,
    reset,
    depositReady: phase === "ready",
  };
}
