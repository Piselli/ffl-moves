"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { DepositPhase } from "@/hooks/useStableyardDeposit";
import { stableyardExtraChainCount } from "@/lib/stableyard";

type InsufficientFundsModalProps = {
  open: boolean;
  entryFeeLabel: string;
  onClose: () => void;
  onTopUp: () => void;
  topUpOpening?: boolean;
  depositPhase?: DepositPhase;
  depositError?: string | null;
};

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.75" fill="currentColor" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 12h18M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9M12 3C9.5 5.8 8.2 9 8.2 12s1.3 6.2 3.8 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 3L5 14h6l-1 7 9-13h-6l1-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FeatureRow({
  icon,
  title,
  description,
  descriptionLine2,
  badge,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  descriptionLine2?: string;
  badge?: string;
}) {
  return (
    <div className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/45">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold leading-snug text-white/90">{title}</p>
          {badge ? (
            <span className="rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-wide text-white/55">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[12px] leading-snug text-white/42">{description}</p>
        {descriptionLine2 ? (
          <p className="mt-0.5 text-[12px] leading-snug text-white/42">{descriptionLine2}</p>
        ) : null}
      </div>
    </div>
  );
}

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
  const extraChains = stableyardExtraChainCount();

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
      <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" />

      <div className="relative w-full max-w-[400px] rounded-2xl border border-white/[0.10] bg-[#141518] shadow-2xl">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00f948]/60 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          disabled={topUpOpening}
          aria-label={g.insufficientFundsCancel}
          className="absolute right-3.5 top-3.5 rounded-lg p-2 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60 disabled:pointer-events-none disabled:opacity-40"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-7 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/55">
            <AlertIcon className="h-5 w-5" />
          </div>

          <h2
            id="insufficient-funds-title"
            className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-white"
          >
            {g.insufficientFundsTitle}
          </h2>

          <p className="mt-2 text-[14px] leading-relaxed text-white/45 whitespace-nowrap tabular-nums">
            {g.insufficientFundsBody(entryFeeLabel)}
          </p>

          <div className="mx-auto mt-5 max-w-[320px] border-t border-white/[0.06] pt-1 text-left">
            <div className="divide-y divide-white/[0.06]">
              <FeatureRow
                icon={<GlobeIcon className="h-[18px] w-[18px]" />}
                title={g.insufficientFundsDepositTitle}
                description={g.insufficientFundsDepositDescLine1(extraChains)}
                descriptionLine2={g.insufficientFundsDepositDescLine2}
              />
              <FeatureRow
                icon={<ZapIcon className="h-[18px] w-[18px]" />}
                title={g.insufficientFundsGasTitle}
                description={g.insufficientFundsGasDesc}
                badge={g.insufficientFundsGasBadge}
              />
            </div>
          </div>

          {statusLine ? (
            <p
              className={cn(
                "mt-4 rounded-xl border px-3 py-2.5 text-left text-[12px] leading-relaxed",
                depositPhase === "ready"
                  ? "border-[#00f948]/20 bg-[#00f948]/8 text-[#00f948]"
                  : depositError
                    ? "border-rose-400/20 bg-rose-400/8 text-rose-200/90"
                    : "border-white/[0.06] bg-white/[0.02] text-white/45",
              )}
            >
              {statusLine}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onTopUp}
              disabled={topUpOpening}
              className={cn(
                "w-full rounded-xl py-3.5 font-display text-[13px] font-bold uppercase tracking-wide transition-all",
                "bg-gradient-to-r from-emerald-500 to-[#00f948] text-black hover:brightness-110",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {topUpOpening ? g.stableyardDepositOpening : g.insufficientFundsTopUp}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={topUpOpening}
              className="w-full py-2 text-[13px] font-medium text-white/38 transition-colors hover:text-white/60 disabled:opacity-40"
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
