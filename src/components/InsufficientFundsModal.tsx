"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { DepositPhase } from "@/hooks/useStableyardDeposit";

type InsufficientFundsModalProps = {
  open: boolean;
  entryFeeLabel: string;
  onClose: () => void;
  onTopUp: () => void;
  topUpOpening?: boolean;
  depositPhase?: DepositPhase;
  depositError?: string | null;
};

export function InsufficientFundsModal({
  open,
  entryFeeLabel,
  onClose,
  onTopUp,
  topUpOpening = false,
  depositPhase = "idle",
  depositError = null,
}: InsufficientFundsModalProps) {
  const g = useSiteMessages().pages.gameweek;
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !topUpOpening) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, topUpOpening]);

  if (!open || !portalRoot) return null;

  const statusLine =
    depositPhase === "confirming"
      ? g.stableyardDepositProcessing
      : depositPhase === "ready"
        ? g.stableyardDepositSuccess
        : depositPhase === "timeout"
          ? g.stableyardDepositDelayed
          : depositError;

  const modal = (
    <div
      className="fixed inset-0 z-[210] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insufficient-funds-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !topUpOpening) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#111214] shadow-2xl">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00f948]/60 to-transparent" />

        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/25">
            <span className="text-xl" aria-hidden>
              🚀
            </span>
          </div>

          <h2
            id="insufficient-funds-title"
            className="text-lg font-display font-black uppercase tracking-tight text-white"
          >
            {g.insufficientFundsTitle}
          </h2>

          <p className="mt-3 text-sm text-white/55 leading-relaxed">
            {g.insufficientFundsBody(entryFeeLabel)}
          </p>

          {statusLine ? (
            <p
              className={cn(
                "mt-3 text-xs leading-relaxed",
                depositPhase === "ready" ? "text-[#00f948]" : "text-white/45",
                depositError ? "text-rose-300/90" : null,
              )}
            >
              {statusLine}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onTopUp}
              disabled={topUpOpening}
              className={cn(
                "w-full py-3.5 rounded-xl font-display font-black text-sm uppercase tracking-wide transition-all",
                "bg-gradient-to-r from-emerald-500 to-[#00f948] text-black hover:brightness-110",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {topUpOpening ? g.stableyardDepositOpening : g.insufficientFundsTopUp}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={topUpOpening}
              className="w-full py-2.5 text-sm font-semibold text-white/40 hover:text-white/65 transition-colors disabled:opacity-40"
            >
              {g.insufficientFundsCancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
