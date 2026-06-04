"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";

function HeroDeadlinePlaque({
  targetTime,
  gwId,
  metaLabel,
  copy,
}: {
  targetTime: string;
  gwId: number;
  metaLabel?: string;
  copy: {
    untilDeadline: string;
    deadlinePassed: string;
    daySuffix: string;
    hourSuffix: string;
    minSuffix: string;
  };
}) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ d: 0, h: 0, m: 0 });
        return;
      }
      setExpired(false);
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-start">
      <div className="mb-0.5 min-w-0 w-full shrink-0 space-y-px sm:mb-1 sm:space-y-0.5">
        <p className="text-[7px] font-bold uppercase leading-[1.2] tracking-[0.06em] text-white/40 sm:text-[9px] sm:tracking-[0.12em] md:tracking-[0.2em]">
          {copy.untilDeadline}
        </p>
        <p className="text-[6px] font-bold uppercase tracking-wider text-white/25 sm:text-[8px]">
          {metaLabel ?? `GW${gwId}`}
        </p>
      </div>
      <p className="mt-auto w-full min-w-0 max-w-full text-left whitespace-nowrap font-display text-base font-black tabular-nums text-white min-[380px]:text-lg sm:text-lg md:text-xl leading-none tracking-tight">
        {!timeLeft ? (
          <span className="text-white/20 animate-pulse">—</span>
        ) : expired ? (
          <span className="text-white/50">{copy.deadlinePassed}</span>
        ) : (
          <span className="inline-flex min-w-0 max-w-full flex-nowrap items-baseline justify-start gap-x-px sm:gap-x-0.5">
            <span className="shrink-0 tabular-nums">
              {String(timeLeft.d).padStart(2, "0")}
              {copy.daySuffix}
            </span>
            <span className="shrink-0 text-white/40 text-[0.85em]" aria-hidden>
              :
            </span>
            <span className="shrink-0 tabular-nums">
              {String(timeLeft.h).padStart(2, "0")}
              {copy.hourSuffix}
            </span>
            <span className="shrink-0 text-white/40 text-[0.85em]" aria-hidden>
              :
            </span>
            <span className="shrink-0 tabular-nums">
              {String(timeLeft.m).padStart(2, "0")}
              {copy.minSuffix}
            </span>
          </span>
        )}
      </p>
    </div>
  );
}

function SlotDigit({ target, index }: { target: string; index: number }) {
  const isDigit = /\d/.test(target);
  const [displayed, setDisplayed] = useState(() => (isDigit ? String(Math.floor(Math.random() * 10)) : target));

  useEffect(() => {
    if (!isDigit) return;
    const ticks = [40, 40, 50, 60, 75, 95, 120, 160, 210, 270];
    const baseDelay = index * 60;
    let cumulative = baseDelay;
    const timers: ReturnType<typeof setTimeout>[] = [];
    ticks.forEach((gap, i) => {
      cumulative += gap;
      timers.push(
        setTimeout(() => {
          setDisplayed(i === ticks.length - 1 ? target : String(Math.floor(Math.random() * 10)));
        }, cumulative),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [target, index, isDigit]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={displayed}
        initial={{ y: "-60%", opacity: 0, scaleY: 0.6 }}
        animate={{ y: "0%", opacity: 1, scaleY: 1 }}
        exit={{ y: "60%", opacity: 0, scaleY: 0.6 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        style={{ display: "inline-block" }}
      >
        {displayed}
      </motion.span>
    </AnimatePresence>
  );
}

function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const numText = String(Number(to.toFixed(decimals)));
  return (
    <span className="inline-flex items-baseline gap-[0.25em]">
      <span className="inline-flex overflow-hidden" style={{ lineHeight: "inherit" }}>
        {numText.split("").map((char, i) => (
          <span key={i} className="relative inline-block overflow-hidden" style={{ lineHeight: "inherit" }}>
            <SlotDigit target={char} index={i} />
          </span>
        ))}
      </span>
      {suffix.trim() && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: numText.length * 0.06 + 0.3, duration: 0.3 }}
        >
          {suffix.trim()}
        </motion.span>
      )}
    </span>
  );
}

function formatHeroPoolMove(n: number, locale: "uk" | "en"): string {
  if (!Number.isFinite(n)) return "—";
  const loc = locale === "uk" ? "uk-UA" : "en-US";
  const rounded = Number(n.toFixed(2));
  const whole = Math.round(rounded);
  if (Math.abs(rounded - whole) < 1e-6) {
    return whole.toLocaleString(loc);
  }
  return rounded.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function AplHeroSlide({
  prizePool,
  tourEntryCount,
  dataLoading,
  statsGwLabel,
  deadlineTime,
  deadlineGwId,
  connected,
  locale,
  eventPaused = false,
}: {
  prizePool: number | null;
  tourEntryCount: number | null;
  dataLoading: boolean;
  statsGwLabel: number | null;
  deadlineTime: string | null;
  deadlineGwId: number | null;
  connected: boolean;
  locale: "uk" | "en";
  eventPaused?: boolean;
}) {
  const m = useSiteMessages();
  const loc = locale === "uk" ? "uk" : "en";
  const deadlineCopy = {
    untilDeadline: m.home.untilDeadline,
    deadlinePassed: m.home.deadlinePassed,
    daySuffix: m.home.daySuffix,
    hourSuffix: m.home.hourSuffix,
    minSuffix: m.home.minSuffix,
  };

  return (
    <section className="relative flex min-h-[min(100dvh,900px)] flex-col justify-start overflow-x-hidden px-4 pb-16 pt-24 sm:px-10 lg:px-16 lg:pt-28">
      <div className="absolute inset-0 z-0">
        <img
          src="/images/manager-bg.png"
          alt={m.home.heroAlt}
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 from-20% via-[#0D0F12]/90 via-50% to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_52%,rgba(13,15,18,0.65)_78%,#0D0F12_92%,#0D0F12_100%)]" />
      </div>

      <div className="relative z-10 flex w-full min-w-0 max-w-2xl flex-col gap-8 sm:gap-10">
        <div className="flex flex-col gap-5">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="pb-2 font-display text-4xl font-black uppercase leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-5xl"
          >
            {m.home.heroLine1}
            <br />
            <span className="text-[#00f948]">{m.home.heroLine2}</span>
            <br />
            {m.home.heroLine3}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="max-w-xl text-lg leading-relaxed text-white/50"
          >
            {m.home.heroSub1}
            <br />
            {m.home.heroSub2}
            <br />
            {m.home.heroSub3}
          </motion.p>
        </div>

        {eventPaused ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="inline-flex max-w-md items-center gap-2 rounded-lg border border-[#00f948]/20 bg-[#00f948]/5 px-3 py-2 text-xs font-medium text-white/55"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f948]/60" aria-hidden />
            {m.home.eplPausedNote}
          </motion.p>
        ) : null}

        <div className="flex flex-col items-start gap-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid w-full min-w-0 grid-cols-[minmax(0,1.22fr)_minmax(0,0.89fr)_minmax(0,0.89fr)] gap-1.5 min-[400px]:gap-2 sm:gap-3 md:gap-4"
          >
            <div className="relative flex h-full min-h-0 min-w-0 w-full flex-col items-start self-stretch overflow-visible rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 shadow-lg shadow-black/20 backdrop-blur-sm sm:rounded-xl sm:px-5 sm:py-2.5 md:px-6">
              <div className="relative z-10 mb-0.5 min-w-0 w-full space-y-px sm:mb-1 sm:space-y-0.5">
                <p className="text-[7px] font-bold uppercase leading-[1.2] tracking-[0.06em] text-white/40 sm:text-[9px] sm:tracking-[0.12em] md:tracking-[0.2em]">
                  {m.home.statPrizePool}
                </p>
                {statsGwLabel != null ? (
                  <p className="text-[6px] font-bold uppercase tracking-wider text-white/25 sm:text-[8px]">
                    GW{statsGwLabel}
                  </p>
                ) : null}
              </div>
              <p className="relative z-10 mt-auto w-full min-w-0 font-display text-[0.9375rem] font-black tabular-nums tracking-tight text-white min-[380px]:text-base sm:text-xl md:text-[1.5rem] lg:text-[1.65rem] leading-none">
                {dataLoading ? (
                  <span className="text-white/20 animate-pulse">—</span>
                ) : prizePool == null ? (
                  <span className="text-white/20">N/A</span>
                ) : (
                  <span className="inline-flex max-w-full flex-none flex-nowrap items-baseline gap-x-[0.18em] whitespace-nowrap">
                    <span className="shrink-0 tabular-nums">{formatHeroPoolMove(prizePool, loc)}</span>
                    <span className="shrink-0 text-white/95">$MOVE</span>
                  </span>
                )}
              </p>
            </div>

            <div className="flex h-full min-h-0 min-w-0 flex-col items-start self-stretch rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm sm:rounded-xl sm:px-5 sm:py-2">
              <div className="mb-0.5 min-w-0 w-full space-y-px sm:mb-1 sm:space-y-0.5">
                <p className="text-[7px] font-bold uppercase leading-[1.2] tracking-[0.06em] text-white/40 sm:text-[9px] sm:tracking-[0.12em] md:tracking-[0.2em]">
                  {m.home.statParticipants}
                </p>
                <p className="text-[6px] font-bold uppercase leading-tight tracking-wider text-white/25 sm:text-[8px]">
                  {m.home.statRegistered}
                </p>
              </div>
              <p className="mt-auto w-full min-w-0 font-display text-base font-black tabular-nums text-white min-[380px]:text-lg sm:text-2xl md:text-3xl leading-none">
                {dataLoading ? (
                  <span className="text-white/20 animate-pulse">—</span>
                ) : tourEntryCount !== null ? (
                  <Counter to={tourEntryCount} suffix="" decimals={0} />
                ) : (
                  <span className="text-white/20">N/A</span>
                )}
              </p>
            </div>

            {deadlineTime && deadlineGwId != null ? (
              <div className="flex h-full min-h-0 min-w-0 flex-col items-start self-stretch overflow-visible rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 shadow-lg shadow-black/20 backdrop-blur-sm sm:rounded-xl sm:px-5 sm:py-2.5">
                <HeroDeadlinePlaque targetTime={deadlineTime} gwId={deadlineGwId} copy={deadlineCopy} />
              </div>
            ) : (
              <div
                className="min-w-0 self-stretch rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 sm:px-5 sm:py-2"
                aria-hidden
              />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex w-full flex-col items-center gap-4 sm:w-auto sm:items-start"
          >
            {connected ? (
              <Link
                href="/gameweek"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00f948] px-10 py-5 font-display text-lg font-black uppercase tracking-widest text-black shadow-lg shadow-black/25 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 sm:w-auto sm:min-w-[280px]"
              >
                {m.home.ctaStart}
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <div
                className="group relative inline-block w-full cursor-pointer sm:w-auto"
                onClick={() => (document.getElementById("wallet-connect-btn") as HTMLButtonElement)?.click()}
              >
                <div className="relative flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0D0F12] px-10 py-4 text-center font-display text-lg font-black uppercase tracking-widest text-white transition-colors hover:border-white/20 sm:w-auto sm:min-w-[260px]">
                  <span>{m.home.ctaStart}</span>
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            )}

            <motion.a
              href="#how-it-works"
              whileHover={{ y: 2 }}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-white/40 transition-colors hover:text-white/80 sm:ml-4"
            >
              {m.home.howItWorks}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
