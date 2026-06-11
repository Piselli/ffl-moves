"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { AplHeroSlide } from "@/components/home/AplHeroSlide";
import { WorldCupHeroPortal } from "@/components/WorldCupHeroPortal";

const SLIDE_COUNT = 2;
/** WC is slide 0 (primary), APL is slide 1. */
const WC_INDEX = 0;
const APL_INDEX = 1;

export function HomeHeroCarousel({
  prizePoolRaw,
  tourEntryCount,
  dataLoading,
  roundLabel,
  wcDeadlineTime,
  wcTourId,
  statsGwLabel,
  aplDeadlineTime,
  aplDeadlineGwId,
  connected,
  locale,
  aplPaused = false,
}: {
  prizePoolRaw: number | null;
  tourEntryCount: number | null;
  dataLoading: boolean;
  roundLabel: string | null;
  wcDeadlineTime: string | null;
  wcTourId: number | null;
  statsGwLabel: number | null;
  aplDeadlineTime: string | null;
  aplDeadlineGwId: number | null;
  connected: boolean;
  locale: "uk" | "en";
  aplPaused?: boolean;
}) {
  const m = useSiteMessages().home;
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(WC_INDEX);
  const isDragging = useRef(false);

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth <= 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, idx)));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: WC_INDEX * el.clientWidth, behavior: "auto" });
    setActiveIndex(WC_INDEX);
  }, [reduceMotion]);

  const goToSlide = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, index));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
      setActiveIndex(clamped);
    },
    [reduceMotion],
  );

  const tabs = [
    { label: m.heroCarouselWcTab, index: WC_INDEX },
    { label: m.heroCarouselAplTab, index: APL_INDEX },
  ];

  return (
    <div className="relative">
      {/* Full-screen horizontal snap carousel */}
      <div
        ref={scrollRef}
        className="flex h-[min(100dvh,900px)] snap-x snap-mandatory overflow-x-auto overflow-y-visible scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onScroll={syncIndexFromScroll}
        onPointerDown={() => {
          isDragging.current = false;
        }}
        onPointerMove={() => {
          isDragging.current = true;
        }}
        aria-roledescription="carousel"
      >
        <div className="w-full shrink-0 snap-center snap-always">
          <WorldCupHeroPortal
            deadlineTime={wcDeadlineTime}
            deadlineTourId={wcTourId}
            roundLabel={roundLabel}
          />
        </div>
        <div className="w-full shrink-0 snap-center snap-always">
          <AplHeroSlide
            prizePoolRaw={aplPaused ? null : prizePoolRaw}
            tourEntryCount={aplPaused ? null : tourEntryCount}
            dataLoading={aplPaused ? false : dataLoading}
            statsGwLabel={statsGwLabel}
            deadlineTime={aplDeadlineTime}
            deadlineGwId={aplDeadlineGwId}
            connected={connected}
            locale={locale}
            eventPaused={aplPaused}
          />
        </div>
      </div>

      {/* Bottom fade — blends both slides into page bg when scrolling down */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[12] h-28 sm:h-36"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(13,15,18,0.55) 55%, #0D0F12 100%)",
        }}
        aria-hidden
      />

      {/* Slide switch — single control (WC / APL), arrows flank the labelled tabs */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-3 px-4 sm:bottom-8">
        <button
          type="button"
          aria-label={m.heroCarouselPrev}
          onClick={() => goToSlide(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="pointer-events-auto hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white disabled:opacity-30 sm:flex"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-md"
          role="tablist"
          aria-label={m.heroCarouselAria}
        >
          {tabs.map((tab) => {
            const active = activeIndex === tab.index;
            return (
              <button
                key={tab.index}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => goToSlide(tab.index)}
                className={`relative rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors sm:px-4 sm:text-[10px] ${
                  active ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="heroCarouselTab"
                    className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={m.heroCarouselNext}
          onClick={() => goToSlide(activeIndex + 1)}
          disabled={activeIndex === SLIDE_COUNT - 1}
          className="pointer-events-auto hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white disabled:opacity-30 sm:flex"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
