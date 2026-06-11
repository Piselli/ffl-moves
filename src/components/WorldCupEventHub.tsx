"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  WC_ROUNDS,
  findActiveWorldCupTourFromChain,
  getWorldCupRound,
  getWorldCupTourSummaries,
} from "@/lib/worldcup";
import type { GameweekSummary } from "@/lib/movement";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { WcHowItWorksDemo } from "@/components/wc/WcHowItWorksDemo";
import { WcPitchLinesSvg } from "@/components/wc/WcDecor";
import { WcSectionEyebrow } from "@/components/wc/WcSectionEyebrow";
import { WcUpcomingMatches } from "@/components/wc/WcUpcomingMatches";
import { fetchWcTourDeadlineMs } from "@/lib/wc-deadline";

const pad2 = (n: number) => String(n).padStart(2, "0");

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const PRIZE_SHARES = [30, 20, 15, 10, 8, 6, 5, 3, 2, 1];

/** Brushed-metal masthead fill — the premium "foil" feel shared with the home hero. */
const FOIL_FILL = "linear-gradient(180deg, #ffffff 0%, #eef1f5 44%, #b9bfca 100%)";
/** Warm trophy-gold fill for the host-nations line. */
const GOLD_FILL = "linear-gradient(180deg, #f8e7ad 0%, #e9c873 48%, #c79a3b 100%)";

const PODIUM_ACCENT: Record<number, { border: string; text: string }> = {
  1: { border: "border-t-[#FFD700]", text: "text-[#FFD700]" },
  2: { border: "border-t-[#C0C0C0]", text: "text-[#C0C0C0]" },
  3: { border: "border-t-[#CD7F32]", text: "text-[#CD7F32]" },
};

/** One hero KPI tile — label + optional round meta + a big tabular value. */
function HeroStat({
  label,
  meta,
  value,
  suffix,
}: {
  label: string;
  meta?: string;
  value: React.ReactNode | null;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-start rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left shadow-lg shadow-black/20 backdrop-blur-md sm:px-4">
      <p className="text-[8px] font-bold uppercase leading-[1.2] tracking-[0.16em] text-white/40 sm:text-[9px]">
        {label}
      </p>
      <p className="mt-0.5 min-h-[10px] text-[8px] font-bold uppercase tracking-wider text-[#00f948]/70">
        {meta ?? ""}
      </p>
      <p className="mt-1.5 font-wc-hero text-xl font-black leading-none tabular-nums text-white sm:text-2xl">
        {value == null ? (
          <span className="animate-pulse text-white/20">—</span>
        ) : (
          <span className="inline-flex items-baseline gap-1">
            {value}
            {suffix ? <span className="text-xs font-bold text-white/40">{suffix}</span> : null}
          </span>
        )}
      </p>
    </div>
  );
}

function PrizeBreakdown({
  prizePool,
  loading,
  roundLabel,
}: {
  prizePool: number | null;
  loading: boolean;
  roundLabel: string | null;
}) {
  const m = useSiteMessages();
  const wc = m.pages.worldCup;
  const prize = usePrizeAsset();
  const reduceMotion = useReducedMotion();
  const hasPool = !loading && prizePool != null && prizePool > 0;

  const amount = (share: number): string | null =>
    hasPool ? prize.formatUnits((prizePool! * share) / 100) : null;

  const ranks = PRIZE_SHARES.map((share, i) => ({ rank: i + 1, share }));
  const maxShare = PRIZE_SHARES[0];

  const fade = reduceMotion
    ? { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 } };

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
      {/* Section header — same pattern as Matches / Tournament rounds */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <WcSectionEyebrow>{wc.prizeBadge}</WcSectionEyebrow>
          <h2 className="mt-4 font-wc-display text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
            {wc.prizeTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/45">{wc.prizeDesc(prize.symbol)}</p>
        </div>
        <Link
          href="/world-cup/leaderboard"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 font-wc-hero text-xs font-bold uppercase tracking-[0.06em] text-white/90 transition-colors hover:border-[#00f948]/30 hover:bg-[#00f948]/[0.08] hover:text-[#00f948]"
        >
          {wc.leaderboardCta}
          <svg className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      <motion.div
        {...fade}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0c0f]"
      >
        <WcPitchLinesSvg className="opacity-[0.04]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-56 w-56 rounded-full bg-[#00f948]/[0.04] blur-3xl" aria-hidden />

        <div className="relative grid gap-4 p-5 sm:p-7 lg:grid-cols-[minmax(0,260px)_1fr] lg:gap-6">
          {/* Left: current-round pool highlight — stretches full height so the card never reads empty */}
          <div className="flex h-full flex-col justify-center rounded-xl border border-white/[0.08] bg-[#0D0F12]/80 p-5 shadow-[inset_3px_0_0_#00f948]">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{wc.prizePoolNowLabel}</p>
            {roundLabel ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#00f948]/80">{roundLabel}</p>
            ) : null}
            <p className="mt-2 font-display text-4xl font-black tabular-nums leading-none text-white sm:text-5xl">
              {loading ? (
                <span className="animate-pulse text-white/20">—</span>
              ) : hasPool ? (
                prize.formatUnits(prizePool!)
              ) : (
                <span className="text-white/25">—</span>
              )}
              <span className="ml-1.5 text-sm text-white/40">{prize.symbol}</span>
            </p>
            {!hasPool && !loading ? (
              <p className="mt-3 text-xs leading-relaxed text-white/35">{wc.prizeEmptyHint}</p>
            ) : null}
            <p className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/25">
              <span className="h-1 w-1 rounded-full bg-[#00f948]" />
              {wc.prizeClaimNote}
            </p>
          </div>

          {/* Right: payout distribution — a broadcast-style descending curve.
              Height encodes each place's share, so it reads instantly and stays
              meaningful even before the pool fills (no rows of "—"). */}
          <div className="flex h-full flex-col">
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                {wc.prizeDistribution}
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#00f948]/70">
                {wc.prizeRankLabel(1)} · {maxShare}% {wc.prizeShareSuffix}
              </span>
            </div>

            <div className="mt-3 flex h-40 items-end gap-1.5 sm:h-56 sm:gap-2.5">
              {ranks.map(({ rank, share }, i) => {
                const accent = PODIUM_ACCENT[rank];
                const fill =
                  rank === 1
                    ? "bg-gradient-to-t from-[#FFD700]/10 to-[#FFD700]"
                    : rank === 2
                      ? "bg-gradient-to-t from-[#C0C0C0]/10 to-[#C0C0C0]"
                      : rank === 3
                        ? "bg-gradient-to-t from-[#CD7F32]/15 to-[#CD7F32]"
                        : "bg-gradient-to-t from-[#00f948]/8 to-[#00f948]/40";
                const amt = amount(share);
                return (
                  <div
                    key={rank}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                    title={amt ? `${wc.prizeRankLabel(rank)} · ${share}% · ${amt} ${prize.symbol}` : `${wc.prizeRankLabel(rank)} · ${share}%`}
                  >
                    <span
                      className={cn(
                        "mb-1.5 font-display text-[10px] font-black tabular-nums sm:text-xs",
                        accent ? accent.text : "text-white/45",
                      )}
                    >
                      {share}%
                    </span>
                    <motion.div
                      initial={reduceMotion ? false : { scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.5, delay: 0.1 + i * 0.045, ease: EASE_OUT }}
                      style={{ height: `${Math.max(7, (share / maxShare) * 86)}%`, transformOrigin: "bottom" }}
                      className={cn(
                        "w-full rounded-t-[3px] ring-1 ring-inset ring-white/10 transition-[filter] duration-150 group-hover:brightness-110",
                        fill,
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex gap-1.5 border-t border-white/[0.06] pt-2 sm:gap-2.5">
              {ranks.map(({ rank }) => {
                const accent = PODIUM_ACCENT[rank];
                return (
                  <span
                    key={rank}
                    className={cn(
                      "flex-1 text-center font-display text-[10px] font-black tabular-nums sm:text-xs",
                      accent ? accent.text : "text-white/35",
                    )}
                  >
                    {wc.prizeRankLabel(rank)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function WorldCupEventHub() {
  const prize = usePrizeAsset();
  const m = useSiteMessages();
  const wc = m.pages.worldCup;
  const hm = m.home;
  const reduceMotion = useReducedMotion();
  const [tours, setTours] = useState<Record<number, GameweekSummary>>({});
  const [activeTour, setActiveTour] = useState<GameweekSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [kickoff, setKickoff] = useState<{ d: number; h: number; m: number } | null>(null);
  const [kickoffTargetMs, setKickoffTargetMs] = useState<number | null>(null);

  const activeRound = activeTour ? getWorldCupRound(activeTour.id) : undefined;
  const openRound = WC_ROUNDS.find((r) => tours[r.tourId]?.status === "open");
  const openTourId = openRound?.tourId;
  const deadlineTourId = openTourId ?? activeTour?.id ?? WC_ROUNDS[0].tourId;

  useEffect(() => {
    let cancelled = false;
    fetchWcTourDeadlineMs(deadlineTourId).then((ms) => {
      if (!cancelled) setKickoffTargetMs(ms);
    });
    return () => {
      cancelled = true;
    };
  }, [deadlineTourId]);

  useEffect(() => {
    if (kickoffTargetMs == null) return;
    const tick = () => {
      const diff = Math.max(0, kickoffTargetMs - Date.now());
      setKickoff({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [kickoffTargetMs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [summaries, active] = await Promise.all([
          getWorldCupTourSummaries(),
          findActiveWorldCupTourFromChain(),
        ]);
        if (cancelled) return;
        const byId: Record<number, GameweekSummary> = {};
        for (const s of summaries) byId[s.id] = s;
        setTours(byId);
        setActiveTour(active);
      } catch (e) {
        console.error("WC hub load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hero KPI source — the live/open round if any, else whatever's active on-chain.
  const statSummary = activeTour ?? (openTourId ? tours[openTourId] : undefined);
  const statRound = activeRound ?? openRound;
  const statPool = statSummary?.prizePool ?? null;
  const hasStatPool = statPool != null && statPool > 0;
  const statEntries = statSummary?.totalEntries ?? null;

  function statusLabel(s: GameweekSummary | undefined): { text: string; cls: string } {
    if (!s) return { text: wc.statusUpcoming, cls: "text-white/30 bg-white/[0.04] border-white/10" };
    if (s.status === "open") return { text: wc.statusOpen, cls: "text-[#00f948] bg-[#00f948]/10 border-[#00f948]/25" };
    if (s.status === "closed") return { text: wc.statusClosed, cls: "text-amber-400 bg-amber-500/10 border-amber-500/25" };
    return { text: wc.statusResolved, cls: "text-white/50 bg-white/[0.06] border-white/10" };
  }

  const fade = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  const howSteps = [wc.howStep1, wc.howStep2, wc.howStep3(prize.symbol)];

  return (
    <div className="relative z-10">
      {/* ── Cinematic hero — fills the first screen so the page reads one section at a time ── */}
      <section className="relative flex min-h-[100svh] flex-col">
        <div className="relative z-20 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-28 pt-28 text-center sm:px-6">
          <motion.div {...fade} transition={{ duration: 0.55, ease: EASE_OUT }} className="flex flex-col items-center">
            {/* Live badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00f948]/30 bg-[#00f948]/[0.08] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#00f948]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00f948]" />
              {wc.badge}
            </span>

            {/* Official wordmark logo */}
            <img
              src="/images/wc-2026-logo.png"
              alt="FIFA World Cup 2026"
              width={663}
              height={1024}
              className="mt-6 h-[clamp(92px,13vh,148px)] w-auto select-none drop-shadow-[0_18px_42px_rgba(0,0,0,0.6)]"
              draggable={false}
            />

            {/* Foil masthead + gold host line */}
            <h1 className="mt-5 flex flex-col items-center" aria-label={`${wc.landingTitle} — ${hm.wcPromoHosts}`}>
              <span
                aria-hidden
                className="bg-clip-text font-wc-display text-[clamp(2rem,6.2vw,4rem)] uppercase leading-[0.9] tracking-[0.01em] text-transparent [filter:drop-shadow(0_4px_18px_rgba(0,0,0,0.55))]"
                style={{ backgroundImage: FOIL_FILL }}
              >
                {wc.landingTitle}
              </span>
              <span
                aria-hidden
                className="mt-2.5 bg-clip-text font-wc-hero text-[clamp(0.72rem,1.5vw,0.95rem)] font-bold uppercase tracking-[0.34em] text-transparent"
                style={{ backgroundImage: GOLD_FILL }}
              >
                {hm.wcPromoHosts}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">{wc.landingSubtitle}</p>

            {/* KPI strip — prize pool · registered teams · kickoff (same trio as the PL hero) */}
            <div className="mt-8 grid w-full max-w-[600px] grid-cols-1 gap-2.5 min-[480px]:grid-cols-3 sm:gap-3">
              <HeroStat
                label={hm.statPrizePoolWc}
                meta={statRound ? wc.roundName(statRound.key) : undefined}
                value={loading ? null : hasStatPool ? prize.formatUnits(statPool!) : <span className="text-white/30">—</span>}
                suffix={hasStatPool ? prize.symbol : undefined}
              />
              <HeroStat
                label={hm.statRegisteredWc}
                value={loading ? null : statEntries != null ? statEntries.toLocaleString() : <span className="text-white/30">—</span>}
              />
              <HeroStat
                label={hm.wcKickoffLabel}
                meta={hm.wcKickoffMeta}
                value={kickoff == null ? null : `${kickoff.d}:${pad2(kickoff.h)}:${pad2(kickoff.m)}`}
              />
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-col items-center gap-6">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/world-cup/squad"
                  className="group inline-flex items-center gap-3 rounded-full bg-[#00f948] py-1.5 pl-6 pr-1.5 font-wc-hero text-black shadow-[0_12px_34px_-12px_rgba(0,249,72,0.55)] ring-1 ring-inset ring-white/25 transition-[transform,filter] duration-150 hover:brightness-[1.04] active:scale-[0.98]"
                >
                  <span className="text-[15px] font-extrabold uppercase tracking-[0.04em]">{wc.playCta}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[#00f948]">
                    <svg className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/world-cup/bracket"
                  className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 font-wc-hero text-xs font-bold uppercase tracking-[0.06em] text-white/90 transition-colors hover:border-[#00f948]/30 hover:bg-[#00f948]/[0.08] hover:text-[#00f948]"
                >
                  {wc.bracket.hubCta}
                  <svg className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
              <p className="max-w-md text-center text-xs text-white/40">{wc.bracket.hubTeaser}</p>
            </div>
          </motion.div>
        </div>

        {/* Scroll affordance — tells the visitor there's "How it works" below */}
        <button
          type="button"
          onClick={() =>
            document
              .getElementById("wc-how-it-works")
              ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
          }
          aria-label={wc.howItWorksTitle}
          className="group absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-white/40 transition-colors hover:text-white/75"
        >
          <span className="font-wc-hero text-[10px] font-bold uppercase tracking-[0.22em]">{wc.howItWorksTitle}</span>
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-[#00f948]/45"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.span>
        </button>
      </section>

      {/* ── How it works ── */}
      <section
        id="wc-how-it-works"
        className="relative mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-14"
      >
        <WcSectionEyebrow>{wc.badge}</WcSectionEyebrow>
        <h2 className="mt-4 font-wc-display text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
          {wc.howItWorksTitle}
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {howSteps.map((step, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0c0f]/80 px-4 py-4 transition-colors hover:border-[#00f948]/25 sm:px-5 sm:py-5"
            >
              <span className="font-wc-display text-4xl leading-none text-[#00f948] sm:text-5xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{step}</p>
            </div>
          ))}
        </div>

        <WcHowItWorksDemo />
      </section>

      {/* ── Upcoming matches teaser → full /world-cup/fixtures board ── */}
      <WcUpcomingMatches roundKey={openRound?.key ?? "md1"} />

      {/* Tournament rounds */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <WcSectionEyebrow>{wc.stageKnockout}</WcSectionEyebrow>
            <h2 className="mt-4 font-wc-display text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
              {wc.roundsTitle}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/45">{wc.roundsSubtitle}</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">{hm.wcPromoFootnote(WC_ROUNDS.length)}</p>
        </div>

        <div className="relative -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex min-w-max items-stretch gap-2 sm:grid sm:min-w-0 sm:grid-cols-4 sm:items-stretch lg:grid-cols-8">
            {WC_ROUNDS.map((round, idx) => {
              const summary = tours[round.tourId];
              const st = statusLabel(summary);
              const isOpen = summary?.status === "open";
              const isCurrent = round.tourId === (openTourId ?? activeTour?.id);
              const card = (
                <div
                  className={cn(
                    "relative flex h-full w-[148px] flex-col rounded-xl border p-3.5 transition-all sm:w-auto",
                    isOpen || isCurrent
                      ? "border-[#00f948]/35 bg-[#00f948]/[0.04] shadow-[0_0_24px_rgba(0,249,72,0.08)]"
                      : "border-white/[0.08] bg-[#0a0c0f]/60",
                  )}
                >
                  {idx < WC_ROUNDS.length - 1 ? (
                    <span
                      className="absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-white/10 sm:block lg:hidden"
                      aria-hidden
                    />
                  ) : null}
                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-white/25">
                    {round.stage === "group" ? wc.stageGroup : wc.stageKnockout}
                  </span>
                  <h3 className="mt-1 min-h-[2.5rem] line-clamp-2 font-display text-sm font-black leading-tight text-white">
                    {wc.roundName(round.key)}
                  </h3>
                  <span className={cn("mt-2 inline-flex w-fit rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider", st.cls)}>
                    {st.text}
                  </span>
                  <p className="mt-2 min-h-[14px] text-[10px] text-white/40">
                    {summary && !loading ? (
                      <>
                        <span className="font-bold tabular-nums text-[#00f948]">{prize.formatUnits(summary.prizePool)}</span> ·{" "}
                        <span className="tabular-nums">{summary.totalEntries}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              );
              return isOpen ? (
                <Link key={round.tourId} href="/world-cup/squad" className="block h-full shrink-0 sm:shrink">
                  {card}
                </Link>
              ) : (
                <div key={round.tourId} className="h-full shrink-0 sm:shrink">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PrizeBreakdown
        prizePool={activeTour?.prizePool ?? null}
        loading={loading}
        roundLabel={activeRound ? wc.roundName(activeRound.key) : null}
      />
    </div>
  );
}
