"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SOCIAL_TG_ALERTS_URL } from "@/lib/constants";
import { useSiteMessages } from "@/i18n/LocaleProvider";

const STORAGE_KEY = "form8_tg_alerts_nudge_v1";

/**
 * Homepage discovery for @Form8AlertsBot. Does not touch the tablet.
 * Dismiss persists. Lives bottom-right on desktop; sits higher on phones
 * so it does not cover Register.
 *
 * Dark glass card + official circular Telegram mark (not a full-blue ad bar):
 * long CTA copy does not fit a #5-style lockup without becoming a fat brick.
 */
export function TelegramAlertsNudge() {
  const m = useSiteMessages();
  const reduceMotion = useReducedMotion() ?? false;
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setOpen(true);
    }
    setReady(true);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!ready) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none fixed bottom-[calc(9.75rem+env(safe-area-inset-bottom,0px))] right-3 z-[85] w-max max-w-[calc(100vw-1.5rem)] md:bottom-7 md:right-5"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/12 bg-[#0c0e11]/92 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <a
              href={SOCIAL_TG_ALERTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="flex items-center gap-3 py-3.5 pl-3.5 pr-10 transition-colors hover:bg-white/[0.04] active:scale-[0.99]"
            >
              <Image
                src="/icons/telegram-mark.png"
                alt=""
                width={52}
                height={52}
                className="h-[3.25rem] w-[3.25rem] shrink-0"
                priority
              />
              <span className="flex min-w-0 flex-col justify-center gap-2">
                <span className="block whitespace-nowrap font-display text-[17px] font-black uppercase leading-none tracking-[0.08em] text-white">
                  {m.telegramAlerts.nudgeTitle}
                </span>
                <span className="block whitespace-nowrap font-display text-[11px] font-medium uppercase leading-none tracking-[0.04em] text-white/95">
                  {m.telegramAlerts.nudgeBody}
                </span>
              </span>
            </a>
            <button
              type="button"
              onClick={dismiss}
              aria-label={m.telegramAlerts.nudgeClose}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
