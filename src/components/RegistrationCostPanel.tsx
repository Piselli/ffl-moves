"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type RegistrationCostPanelProps = {
  entryFeeLabel: string;
  onTopUp: () => void;
  topUpOpening?: boolean;
  className?: string;
};

export function RegistrationCostPanel({
  entryFeeLabel,
  onTopUp,
  topUpOpening = false,
  className,
}: RegistrationCostPanelProps) {
  const g = useSiteMessages().pages.gameweek;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30 mb-3">
        {g.entryFeeLabel}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/usdc-logo.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full"
            aria-hidden
          />
          <p className="font-display font-black text-xl sm:text-2xl text-white tabular-nums leading-none tracking-tight">
            {entryFeeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={onTopUp}
          disabled={topUpOpening}
          className={cn(
            "w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl font-display font-bold text-[11px] uppercase tracking-wide transition-all",
            "border border-white/[0.14] bg-white/[0.04] text-[#00f948] hover:bg-white/[0.07] hover:border-[#00f948]/35",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {topUpOpening ? (
            g.stableyardDepositOpening
          ) : (
            <>
              <span className="sm:hidden">{g.registrationTopUpBtnShort}</span>
              <span className="hidden sm:inline">{g.registrationTopUpBtn}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
