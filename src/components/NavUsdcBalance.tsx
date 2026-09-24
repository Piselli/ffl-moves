"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useDeposit } from "@/components/depositContext";
import { useWallet } from "@/hooks/useSolanaWallet";
import { ENTRY_FEE_SYMBOL } from "@/lib/entryFee";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "chip" | "cluster";
  className?: string;
};

/** Balance — click opens Deposit / Withdraw. Cluster = flat aligned type (interim). */
export function NavUsdcBalance({ variant = "chip", className }: Props) {
  const { connected } = useWallet();
  const { openDeposit, openWithdraw, balanceLabel } = useDeposit();
  const d = useSiteMessages().deposit;
  const w = useSiteMessages().withdraw;
  const reduce = Boolean(useReducedMotion());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!connected) return null;

  const amount = balanceLabel ?? "—";

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        aria-label={`${d.balanceLabel} ${amount} ${ENTRY_FEE_SYMBOL}`}
        title={d.balanceLabel}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 tabular-nums transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
          variant === "chip" &&
            "h-8 rounded-lg border border-white/20 bg-black/40 px-2.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:border-white/35",
          variant === "cluster" &&
            "h-9 rounded-xl px-2.5 hover:bg-white/[0.06]",
        )}
      >
        <motion.span
          key={amount}
          className={cn(
            "leading-none",
            variant === "chip" && "font-semibold tracking-tight text-white",
            variant === "cluster" &&
              "font-display text-[13px] font-black tracking-tight text-white",
          )}
          initial={reduce ? false : { opacity: 0.65, filter: "blur(2px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {amount}
        </motion.span>
        <span
          className={cn(
            "leading-none",
            variant === "chip" && "font-semibold tracking-[0.06em] text-white/50",
            variant === "cluster" &&
              "font-display text-[10px] font-black uppercase tracking-[0.1em] text-white/45",
          )}
        >
          {ENTRY_FEE_SYMBOL}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reduce ? 0.1 : 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] z-[80] min-w-[9.5rem] overflow-hidden rounded-xl border border-white/15 bg-[#0a0c0a]/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openDeposit();
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left font-display text-[11px] font-black uppercase tracking-wide text-white transition-colors hover:bg-white/[0.08]"
            >
              {d.open}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openWithdraw();
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left font-display text-[11px] font-black uppercase tracking-wide text-white/85 transition-colors hover:bg-white/[0.08]"
            >
              {w.open}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
