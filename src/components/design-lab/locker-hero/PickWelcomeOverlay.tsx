"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { LOCKER_CTA } from "@/components/design-lab/locker-hero/ctaStyles";
import type { SiteMessages } from "@/i18n/messages";
import { modalOverlayMotion, modalPanelMotion } from "@/lib/uiMotion";

const DISPLAY = { fontFamily: "var(--lt-font-display), sans-serif" } as const;
const BACKPLATE = "rounded-2xl bg-[#080a0e]";

type Props = {
  open: boolean;
  onStart: () => void;
  messages: SiteMessages;
};

/**
 * One-screen first visit — what this is + first action. No tour steps.
 */
export function PickWelcomeOverlay({ open, onStart, messages: m }: Props) {
  const reduce = Boolean(useReducedMotion());
  const pick = m.pages.lockerPick;
  const titleId = "lt-pick-welcome-title";
  const overlay = modalOverlayMotion(reduce);
  const panel = modalPanelMotion(reduce);

  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.button
            type="button"
            aria-label={pick.close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            onClick={onStart}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-[380px]"
            initial={panel.initial}
            animate={panel.animate}
            exit={panel.exit}
            transition={panel.transition}
          >
            <div className={BACKPLATE}>
              <GlassPanel crystal className="w-full !rounded-2xl p-5 sm:p-6">
                <h2
                  id={titleId}
                  className="text-[22px] font-black uppercase tracking-[-0.02em] text-white"
                  style={DISPLAY}
                >
                  {pick.welcomeTitle}
                </h2>
                <p className="mt-3 text-[14px] font-medium leading-snug text-white/88">
                  {pick.welcomeLead}
                </p>
                <p className="mt-2.5 text-[14px] font-medium leading-snug text-white/55">
                  {pick.welcomeAction}
                </p>
                <button
                  type="button"
                  onClick={onStart}
                  className="mt-5 w-full rounded-xl px-4 py-3.5 text-[13px] font-black uppercase tracking-[0.06em] transition active:scale-[0.98]"
                  style={LOCKER_CTA.style}
                >
                  {pick.welcomeCta}
                </button>
              </GlassPanel>
            </div>

            <button
              type="button"
              onClick={onStart}
              aria-label={pick.close}
              className="absolute right-1.5 top-1.5 z-30 grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.96]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
