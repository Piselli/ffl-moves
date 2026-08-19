"use client";

import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import type { SiteLocale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const OPTIONS: { code: SiteLocale; short: string }[] = [
  { code: "en", short: "EN" },
  { code: "uk", short: "UA" },
];

/** TripleD Native Tabs spring — local transform, not layoutId (nav reflow would yank the pill). */
const PILL_SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.15 };

/** Compact EN/UA toggle — white pill slides inside a fixed well. */
export function LanguageSwitcher({ embedded = false }: { embedded?: boolean }) {
  const { locale, setLocale } = useSiteLocale();
  const aria = useSiteMessages().pages.languageSwitcherAria;
  const reduce = useReducedMotion() ?? false;
  const uk = locale === "uk";

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="group"
        aria-label={aria}
        className={cn(
          "relative isolate grid shrink-0 grid-cols-2 overflow-hidden rounded-lg p-0.5",
          embedded
            ? "h-8 border border-white/10 bg-black/40"
            : "rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm",
        )}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-white"
          initial={false}
          animate={{ x: uk ? "100%" : "0%" }}
          transition={reduce ? { duration: 0 } : PILL_SPRING}
        />
        {OPTIONS.map(({ code, short }) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              aria-pressed={active}
              className={cn(
                "relative z-10 flex min-w-[2.25rem] items-center justify-center rounded-md px-2 font-display text-[10px] font-black uppercase leading-none tracking-wider transition-colors duration-200",
                embedded ? "h-full" : "py-1.5",
                active ? "text-black" : "text-white/40 hover:text-white/80",
              )}
            >
              {short}
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}
