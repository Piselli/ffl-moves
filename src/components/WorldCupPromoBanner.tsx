"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { WC_ROUNDS } from "@/lib/worldcup";
import { WcGrassStripeBg, WcHostNationBars, WcPitchLinesSvg } from "@/components/wc/WcDecor";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function WorldCupPromoBanner() {
  const m = useSiteMessages().home;
  const reduceMotion = useReducedMotion();
  const roundCount = WC_ROUNDS.length;

  const container = {
    hidden: {},
    show: {
      transition: reduceMotion ? { duration: 0 } : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.48, ease: EASE_OUT },
    },
  };

  return (
    <div className="relative z-10 mt-6 px-4 sm:mt-8 sm:px-10 lg:px-16">
      <Link href="/world-cup" className="group mx-auto block max-w-7xl outline-none focus-visible:ring-2 focus-visible:ring-[#00f948]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0F12]">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0c0f] transition-[border-color,box-shadow] duration-300 group-hover:border-[#00f948]/20 group-hover:shadow-[inset_3px_0_0_#00f948]">
          <WcGrassStripeBg className="opacity-[0.35]" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#00f948]/[0.04] blur-3xl" aria-hidden />

          <div className="relative grid min-h-[168px] grid-cols-1 md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_260px]">
            {/* Content */}
            <motion.div
              className="flex flex-col justify-between gap-6 p-5 sm:p-7 md:pr-4"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
            >
              <div className="space-y-3">
                <motion.div variants={item} className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center border-l-2 border-[#00f948] pl-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00f948]">
                    {m.wcPromoBadge}
                  </span>
                  <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-white/25 sm:inline">
                    {m.wcPromoHosts}
                  </span>
                </motion.div>

                <motion.div variants={item} className="space-y-1">
                  <h3 className="font-display text-[clamp(1.65rem,4vw,2.35rem)] font-black uppercase leading-[0.95] tracking-tight text-white">
                    {m.wcPromoTitleMain}
                  </h3>
                  <p className="font-display text-[clamp(2.5rem,7vw,4rem)] font-black uppercase leading-none tracking-tighter text-[#00f948]">
                    {m.wcPromoTitleYear}
                  </p>
                </motion.div>

                <motion.p variants={item} className="max-w-xl text-sm leading-relaxed text-white/50 sm:text-[15px]">
                  {m.wcPromoDesc}
                </motion.p>

                <motion.div variants={item} className="flex flex-wrap items-center gap-3 sm:hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{m.wcPromoHosts}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">{m.wcPromoStagePath}</span>
                </motion.div>
              </div>

              <motion.div variants={item} className="flex flex-wrap items-center gap-4 sm:gap-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                  {m.wcPromoFootnote(roundCount)}
                </p>
                <span className="inline-flex items-center gap-2 rounded-xl bg-[#00f948] px-5 py-3 font-display text-xs font-black uppercase tracking-wide text-black transition-transform duration-150 group-hover:brightness-105 group-active:scale-[0.98] sm:text-sm">
                  {m.wcPromoCta}
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </motion.div>
            </motion.div>

            {/* Decorative panel */}
            <div className="relative hidden overflow-hidden border-l border-white/[0.06] md:block">
              <WcPitchLinesSvg className="opacity-[0.14]" />
              <p
                className="pointer-events-none absolute bottom-3 right-4 select-none font-display text-[5.5rem] font-black leading-none tracking-tighter text-white/[0.04]"
                aria-hidden
              >
                26
              </p>
              <WcHostNationBars className="absolute left-4 top-4" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex items-end justify-between gap-2">
                  {[40, 68, 52, 88, 61].map((h, i) => (
                    <span
                      key={i}
                      className="w-full rounded-t-sm bg-[#00f948]/20 transition-all duration-500 group-hover:bg-[#00f948]/35"
                      style={{ height: h }}
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">{m.wcPromoStagePath}</p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
