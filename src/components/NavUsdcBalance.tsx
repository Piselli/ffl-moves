"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useDeposit } from "@/components/depositContext";
import { useWallet } from "@/hooks/useSolanaWallet";
import { ENTRY_FEE_SYMBOL } from "@/lib/entryFee";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "chip" | "cluster";
};

export function NavUsdcBalance({ variant = "chip" }: Props) {
  const { connected } = useWallet();
  const { openDeposit, balanceLabel } = useDeposit();
  const d = useSiteMessages().deposit;
  const reduce = Boolean(useReducedMotion());

  if (!connected) return null;

  const amount = balanceLabel ?? "—";

  return (
    <button
      type="button"
      onClick={openDeposit}
      aria-label={`${d.balanceLabel} ${amount} ${ENTRY_FEE_SYMBOL}`}
      title={d.balanceLabel}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 tabular-nums transition-[transform,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
        variant === "chip" &&
          "h-8 rounded-lg border border-white/20 bg-black/40 px-2.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:border-white/35",
        variant === "cluster" &&
          "rounded-lg px-2 py-1.5 hover:bg-white/[0.06]",
      )}
    >
      <motion.span
        key={amount}
        className={cn(
          "font-semibold tracking-tight",
          variant === "cluster" && "font-display text-[10px] font-black min-[400px]:text-[11px]",
        )}
        initial={reduce ? false : { opacity: 0.65, filter: "blur(2px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      >
        {amount}
      </motion.span>
      <span
        className={cn(
          "font-semibold tracking-[0.06em] text-white/45",
          variant === "cluster" && "hidden font-display text-[9px] min-[400px]:inline",
        )}
      >
        {ENTRY_FEE_SYMBOL}
      </span>
    </button>
  );
}
