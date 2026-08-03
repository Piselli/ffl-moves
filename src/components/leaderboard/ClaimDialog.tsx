"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  claiming?: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  amountLabel?: string;
};

/**
 * Rare claim ceremony — blur overlay + spring scale (TripleD Native Dialog DNA).
 */
export function ClaimDialog({
  open,
  onClose,
  onConfirm,
  claiming = false,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  amountLabel,
}: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !claiming) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, claiming, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <MotionConfig reducedMotion="user">
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (!claiming) onClose();
              }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="claim-dialog-title"
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.95, filter: "blur(10px)" }
              }
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.95, filter: "blur(10px)" }
              }
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
              className={cn(
                "relative z-10 w-full max-w-md rounded-2xl border border-white/15",
                "bg-black/80 p-6 shadow-2xl backdrop-blur-xl",
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_28%)]"
              />
              <div className="relative">
                <h2
                  id="claim-dialog-title"
                  className="font-display text-xl font-black uppercase tracking-tight text-white"
                >
                  {title}
                </h2>
                <p className="mt-2 text-sm text-white/55">{description}</p>
                {amountLabel ? (
                  <p className="mt-4 font-display text-3xl font-black tabular-nums text-[#00f948]">
                    {amountLabel}
                  </p>
                ) : null}
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={onClose}
                    className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={onConfirm}
                    className="flex-1 rounded-full bg-[#00f948] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-black shadow-[0_0_24px_rgba(0,249,72,0.25)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  >
                    {claiming ? "…" : confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </MotionConfig>
      ) : null}
    </AnimatePresence>
  );
}
