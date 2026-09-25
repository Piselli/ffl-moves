"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { getCtaStyle } from "@/components/design-lab/locker-hero/ctaStyles";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type RegisterErrorModalProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

const CRYSTAL_SHEET = {
  ["--lt-glass-bg" as string]: "rgba(8,10,14,0.42)",
  ["--lt-glass-blur" as string]: "48px",
  ["--lt-glass-ring" as string]: "rgba(255,255,255,0.38)",
  ["--lt-glass-shadow" as string]:
    "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -20px 40px rgba(0,0,0,0.5), 0 18px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
  ["--lt-glass-sheen" as string]:
    "linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 18%, transparent 42%), linear-gradient(320deg, rgba(120,180,255,0.08) 0%, transparent 35%)",
};

const SHEET_SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };
const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

export function RegisterErrorModal({
  open,
  message,
  onClose,
}: RegisterErrorModalProps) {
  const g = useSiteMessages().pages.gameweek;
  const reduce = Boolean(useReducedMotion());
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const cta = getCtaStyle("convex-green");

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="register-error-sheet-root"
          className="fixed inset-0 z-[210] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-error-title"
        >
          <motion.button
            type="button"
            aria-label={g.registerErrorDismiss}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm px-4 pb-4"
            initial={reduce ? { opacity: 0 } : { y: "110%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "110%" }}
            transition={reduce ? { duration: 0.16 } : SHEET_SPRING}
          >
            <div className="rounded-2xl bg-[#080a0e]">
              <GlassPanel
                crystal
                className="w-full !rounded-2xl p-5"
                style={CRYSTAL_SHEET}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
                <h2
                  id="register-error-title"
                  className="text-lg font-black uppercase tracking-tight text-white"
                  style={DISPLAY}
                >
                  {g.registerErrorTitle}
                </h2>
                <p className="mt-2 max-h-40 overflow-y-auto text-sm leading-relaxed text-white/55">
                  {message}
                </p>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={reduce ? undefined : { scale: 0.94 }}
                  style={cta.style}
                  className="mt-5 w-full rounded-xl py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:brightness-110"
                >
                  {g.registerErrorDismiss}
                </motion.button>
              </GlassPanel>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
