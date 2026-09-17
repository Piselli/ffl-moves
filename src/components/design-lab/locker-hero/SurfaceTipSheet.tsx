"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { LOCKER_CTA } from "@/components/design-lab/locker-hero/ctaStyles";
import { cn } from "@/lib/utils";
import { modalOverlayMotion, modalPanelMotion } from "@/lib/uiMotion";
import {
  markSurfaceTipSeen,
  shouldShowSurfaceTip,
  type SurfaceTipId,
} from "@/components/design-lab/locker-hero/onboardingStorage";

const DISPLAY = { fontFamily: "var(--lt-font-display), sans-serif" } as const;
const BACKPLATE = "rounded-2xl bg-[#080a0e]";

type Placement = "center" | "bottom" | "bottom-end";

type Props = {
  tipId: SurfaceTipId;
  title: string;
  body: string;
  cta: string;
  /** Delay before showing so the page can settle. */
  delayMs?: number;
  /** Where the tip sits — bottom keeps the board visible. */
  placement?: Placement;
};

/** One-shot first-visit tip for Leaderboard / Season — not a multi-step tour. */
export function SurfaceTipSheet({
  tipId,
  title,
  body,
  cta,
  delayMs = 600,
  placement = "bottom",
}: Props) {
  const reduce = Boolean(useReducedMotion());
  const [open, setOpen] = useState(false);
  const overlay = modalOverlayMotion(reduce);
  const panel = modalPanelMotion(reduce);
  const titleId = `surface-tip-${tipId}`;

  useEffect(() => {
    if (!shouldShowSurfaceTip(tipId)) return;
    const t = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs, tipId]);

  const dismiss = () => {
    markSurfaceTipSeen(tipId);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[80] flex p-4 sm:p-5",
            placement === "center" && "items-center justify-center",
            placement === "bottom" &&
              "items-end justify-center pb-[max(1rem,env(safe-area-inset-bottom))]",
            placement === "bottom-end" &&
              "items-end justify-end pb-[max(1rem,env(safe-area-inset-bottom))] sm:pr-6",
          )}
        >
          <motion.button
            type="button"
            aria-label={cta}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            onClick={dismiss}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative z-10 w-full",
              placement === "bottom-end"
                ? "max-w-[320px]"
                : "max-w-[360px]",
            )}
            initial={panel.initial}
            animate={panel.animate}
            exit={panel.exit}
            transition={panel.transition}
          >
            <div className={BACKPLATE}>
              <GlassPanel crystal className="w-full !rounded-2xl p-4 sm:p-5">
                <h2
                  id={titleId}
                  className="text-[18px] font-black uppercase tracking-[-0.02em] text-white sm:text-[20px]"
                  style={DISPLAY}
                >
                  {title}
                </h2>
                <p className="mt-2.5 text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
                  {body}
                </p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-4 w-full rounded-xl px-4 py-3 text-[12px] font-black uppercase tracking-[0.06em] transition active:scale-[0.98] sm:py-3.5 sm:text-[13px]"
                  style={LOCKER_CTA.style}
                >
                  {cta}
                </button>
              </GlassPanel>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
