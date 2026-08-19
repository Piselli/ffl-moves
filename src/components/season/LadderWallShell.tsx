"use client";

/**
 * Visual brief — Season Ladder Wall
 *
 * Metaphor: athletics rank board + Linear density. Not a table, not a lounge room.
 * Composition: full-bleed black wall; each manager is a physical rung whose
 * width tracks SP; your rung is the only live green signal.
 * Motion: hover expands a season-arc spark (event slices); find-me scrolls + one pulse.
 * Anti: emoji medals, dashboard card grid, cool-blue frost, terminal chrome.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ResultsPlaceNav } from "@/components/design-lab/locker-leaderboard/ResultsPlaceChrome";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  CURRENT_SEASON,
  SP_CLAIM_BONUS,
  SP_FIRST_REGISTRATION,
  SP_REGISTRATION,
  SP_STREAK_TIERS,
  SP_TOP_RANK,
  formatSeasonEventLabel,
} from "@/lib/season-points-rules";
import type {
  SeasonLeaderboardEntry,
  SeasonLeaderboardPayload,
} from "@/lib/seasonPoints";
import { tourOwnersMatch } from "@/lib/tourClaimHistory";
import { cn } from "@/lib/utils";

function SeasonArcSpark({
  breakdown,
}: {
  breakdown: SeasonLeaderboardEntry["breakdown"];
}) {
  const slices = breakdown.filter((s) => s.registered).slice(-12);
  if (!slices.length) {
    return (
      <p className="px-1 text-[10px] uppercase tracking-[0.14em] text-white/30">
        No registered events yet
      </p>
    );
  }
  const max = Math.max(...slices.map((s) => s.total), 1);
  return (
    <div className="flex items-end gap-0.5 px-1 pt-1">
      {slices.map((s) => (
        <div
          key={s.gameweekId}
          className="group/bar relative flex flex-1 flex-col items-center justify-end"
          title={`${formatSeasonEventLabel(s.gameweekId)} · +${s.total}`}
        >
          <div
            className="w-full min-w-[3px] max-w-[10px] rounded-[1px] bg-[#00f948]/55 transition-[height] duration-150 ease-out group-hover/bar:bg-[#00f948]"
            style={{ height: `${Math.max(12, Math.round((s.total / max) * 36))}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function LadderRung({
  entry,
  maxPoints,
  isYou,
  open,
  onToggle,
  pulse,
  getNickname,
  youBadge,
}: {
  entry: SeasonLeaderboardEntry;
  maxPoints: number;
  isYou: boolean;
  open: boolean;
  onToggle: () => void;
  pulse: boolean;
  getNickname: (addr: string) => string;
  youBadge: string;
}) {
  const widthPct =
    maxPoints <= 0
      ? 48
      : Math.round(42 + (entry.totalPoints / maxPoints) * 58);

  const display = getNickname(entry.owner);

  return (
    <li
      id={isYou ? "ladder-you" : undefined}
      className={cn(
        "relative list-none transition-[box-shadow] duration-200 ease-out",
        pulse && "shadow-[0_0_0_1px_rgba(0,249,72,0.55),0_0_28px_rgba(0,249,72,0.18)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "group relative flex w-full items-stretch gap-0 text-left",
          "active:scale-[0.995]",
        )}
        style={{ width: `${widthPct}%`, minWidth: "min(100%, 16rem)" }}
        aria-expanded={open}
      >
        <span
          className={cn(
            "flex w-12 shrink-0 items-center justify-center border-y border-l font-display text-sm font-black tabular-nums tracking-tight sm:w-14 sm:text-base",
            isYou
              ? "border-[#00f948]/45 bg-[#00f948]/15 text-[#00f948]"
              : entry.rank <= 3
                ? "border-white/20 bg-white/[0.07] text-white"
                : "border-white/[0.1] bg-white/[0.03] text-white/55",
          )}
        >
          {entry.rank}
        </span>
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-3 border-y border-r px-3 py-2.5 sm:px-4",
            isYou
              ? "border-[#00f948]/40 bg-[#00f948]/[0.08] shadow-[inset_0_0_0_1px_rgba(0,249,72,0.12)]"
              : "border-white/[0.1] bg-[#0c0b0a]/90 group-hover:border-white/20 group-hover:bg-[#121110]",
          )}
        >
          <span className="min-w-0 truncate">
            <span
              className={cn(
                "block truncate font-display text-[13px] font-bold uppercase tracking-[0.06em] sm:text-sm",
                isYou ? "text-[#00f948]" : "text-white/90",
              )}
            >
              {display}
            </span>
            {isYou ? (
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.16em] text-[#00f948]/70">
                {youBadge}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-right">
            <span
              className={cn(
                "font-display text-lg font-black tabular-nums leading-none sm:text-xl",
                isYou ? "text-[#00f948]" : "text-white",
              )}
            >
              {entry.totalPoints}
            </span>
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
              SP
            </span>
          </span>
        </span>
      </button>

      {open ? (
        <div
          className={cn(
            "mt-1.5 overflow-hidden border border-white/[0.08] bg-black/50 px-3 py-2.5",
            "origin-top transition-[opacity,transform] duration-150 ease-out",
          )}
          style={{ width: `${Math.min(100, widthPct + 8)}%`, minWidth: "min(100%, 18rem)" }}
        >
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
            <span>
              GWs <strong className="text-white/70">{entry.registrations}</strong>
            </span>
            <span>
              Top10 <strong className="text-white/70">{entry.top10Finishes}</strong>
            </span>
            <span>
              Best{" "}
              <strong className="text-white/70">
                {entry.bestRank > 0 ? `#${entry.bestRank}` : "—"}
              </strong>
            </span>
            <span>
              Streak <strong className="text-white/70">{entry.maxStreak}</strong>
            </span>
          </div>
          <SeasonArcSpark breakdown={entry.breakdown} />
        </div>
      ) : null}
    </li>
  );
}

function RulesBody({
  m,
}: {
  m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"];
}) {
  return (
    <>
      <ul className="mt-4 space-y-2 text-[11px] text-white/50">
        <li className="flex justify-between gap-2">
          <span>{m.ruleRegistration}</span>
          <span className="tabular-nums text-[#00f948]/80">+{SP_REGISTRATION}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>{m.ruleFirstReg}</span>
          <span className="tabular-nums text-[#00f948]/80">+{SP_FIRST_REGISTRATION}</span>
        </li>
        <li className="pt-1 text-[10px] uppercase tracking-[0.14em] text-white/25">
          {m.ruleTop10Header}
        </li>
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex justify-between gap-2 pl-1">
            <span>{m.ruleRank(n)}</span>
            <span className="tabular-nums text-white/60">+{SP_TOP_RANK[n]}</span>
          </li>
        ))}
        <li className="pl-1 text-white/40">{m.ruleRank4to10}</li>
        <li className="pt-1 text-[10px] uppercase tracking-[0.14em] text-white/25">
          {m.ruleStreakHeader}
        </li>
        {[...SP_STREAK_TIERS].reverse().map((t) => (
          <li key={t.minStreak} className="flex justify-between gap-2 pl-1">
            <span>{m.ruleStreak(t.minStreak)}</span>
            <span className="tabular-nums text-white/60">+{t.bonus}</span>
          </li>
        ))}
        <li className="flex justify-between gap-2">
          <span>{m.ruleClaim}</span>
          <span className="tabular-nums text-[#00f948]/80">+{SP_CLAIM_BONUS}</span>
        </li>
      </ul>
      <p className="mt-4 text-[10px] leading-relaxed text-white/30">{m.rulesFootnote}</p>
      <Link
        href="/faq#scoring-and-rewards--season-points"
        className="mt-3 inline-block text-[10px] font-bold uppercase tracking-[0.14em] text-[#00f948]/70 hover:text-[#00f948]"
      >
        {m.faqLink}
      </Link>
    </>
  );
}

function RulesRail({ m }: { m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"] }) {
  return (
    <aside className="pointer-events-auto w-full max-w-[14.5rem] shrink-0 border-l border-white/[0.08] bg-black/40 px-4 py-5 backdrop-blur-[2px] lg:sticky lg:top-20 lg:self-start">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        {m.rulesTitle}
      </p>
      <RulesBody m={m} />
    </aside>
  );
}

export function LadderWallShell() {
  const { account } = useWallet();
  const m = useSiteMessages().pages.seasonLeaderboard;
  const { getNickname } = useNickname();
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<SeasonLeaderboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openOwner, setOpenOwner] = useState<string | null>(null);
  const [pulseYou, setPulseYou] = useState(false);
  const didAutoOpen = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/season-points?includeBreakdown=1");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SeasonLeaderboardPayload;
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wallet = account?.address?.toString() ?? null;
  const myEntry = useMemo(() => {
    if (!wallet || !data) return null;
    return data.entries.find((e) => tourOwnersMatch(e.owner, wallet)) ?? null;
  }, [data, wallet]);

  const maxPoints = useMemo(() => {
    if (!data?.entries.length) return 0;
    return Math.max(...data.entries.map((e) => e.totalPoints), 1);
  }, [data]);

  useEffect(() => {
    if (myEntry && !didAutoOpen.current) {
      didAutoOpen.current = true;
      setOpenOwner(myEntry.owner);
    }
  }, [myEntry]);

  const findMe = () => {
    if (!myEntry) return;
    setOpenOwner(myEntry.owner);
    const el = document.getElementById("ladder-you");
    el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    if (!reduceMotion) {
      setPulseYou(true);
      window.setTimeout(() => setPulseYou(false), 750);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#050505] text-white">
      {/* Atmosphere — sparse wall, not photo room */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,249,72,0.06),transparent_45%),linear-gradient(180deg,#0a0908_0%,#050505_40%,#030303_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[max(0px,calc(50%-28rem))] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
      />

      <ResultsPlaceNav />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-20 sm:px-6 lg:flex-row lg:items-start lg:gap-0 lg:pt-24">
        <div className="min-w-0 flex-1 lg:pr-8">
          <header className="mb-8 max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#00f948]/70">
              {m.seasonTag(data?.seasonLabel ?? CURRENT_SEASON.label)}
            </p>
            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Ladder wall
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Season standings as rank rungs — width tracks SP. Tap a rung for the
              season arc.
            </p>
            {data?.status === "ended" ? (
              <span className="mt-3 inline-block border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/55">
                {m.endedBadge}
              </span>
            ) : null}
            {data && data.active && data.eventIds.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">
                {data.resolvedWcTourCount > 0 ? (
                  <span>
                    {m.progressWc(data.resolvedWcTourCount, data.wcTourIds.length)}
                  </span>
                ) : null}
                {data.eplStartGw > 0 &&
                data.resolvedEplThroughGw >= data.eplStartGw ? (
                  <span>
                    {data.eplEndGw > 0
                      ? m.seasonWindowClosed(
                          data.eplStartGw,
                          data.resolvedEplThroughGw,
                        )
                      : m.progressEpl(data.eplStartGw, data.resolvedEplThroughGw)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </header>

          {myEntry ? (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00f948]/60">
                  {m.myScore}
                </p>
                <p className="font-display text-3xl font-black tabular-nums text-[#00f948]">
                  #{myEntry.rank}
                  <span className="ml-3 text-white/90">{myEntry.totalPoints}</span>
                  <span className="ml-1 text-sm font-bold text-[#00f948]/50">SP</span>
                </p>
              </div>
              <button
                type="button"
                onClick={findMe}
                className="border border-[#00f948]/40 bg-[#00f948]/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00f948] transition hover:bg-[#00f948]/20 active:scale-[0.98]"
              >
                Find me
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-3 py-16 text-white/40">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#00f948]/50 border-t-transparent" />
              <span className="text-sm">{m.loading}</span>
            </div>
          ) : null}

          {!isLoading && error ? (
            <p className="py-10 text-sm text-amber-200/80">{m.loadError(error)}</p>
          ) : null}

          {!isLoading && !error && data?.status === "inactive" ? (
            <div className="border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
              <p className="font-display text-sm font-bold uppercase tracking-wide text-white/70">
                {m.inactiveTitle}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/35">
                {m.inactiveHint}
              </p>
            </div>
          ) : null}

          {!isLoading && !error && data && data.status !== "inactive" ? (
            data.entries.length === 0 ? (
              <div className="border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center">
                <p className="text-sm text-white/50">{m.emptyTitle}</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-white/30">
                  {m.emptyHint}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2" aria-label={m.pageTitle}>
                {data.entries.map((entry) => (
                  <LadderRung
                    key={entry.owner}
                    entry={entry}
                    maxPoints={maxPoints}
                    isYou={!!wallet && tourOwnersMatch(entry.owner, wallet)}
                    open={openOwner === entry.owner}
                    onToggle={() =>
                      setOpenOwner((prev) =>
                        prev === entry.owner ? null : entry.owner,
                      )
                    }
                    pulse={pulseYou && !!wallet && tourOwnersMatch(entry.owner, wallet)}
                    getNickname={getNickname}
                    youBadge={m.youBadge}
                  />
                ))}
              </ul>
            )
          ) : null}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <p className="text-[11px] text-white/25">{m.footerNote}</p>
            <Link
              href="/season-leaderboard/classic"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 hover:text-white/70"
            >
              Classic table
            </Link>
          </div>
        </div>

        <div className="hidden lg:block">
          <RulesRail m={m} />
        </div>
      </div>

      {/* Mobile rules — compact footer strip */}
      <details className="relative z-10 border-t border-white/[0.08] bg-black/60 px-4 py-3 lg:hidden">
        <summary className="cursor-pointer font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
          {m.rulesTitle}
        </summary>
        <div className="mt-1 max-w-md pb-4">
          <RulesBody m={m} />
        </div>
      </details>
    </div>
  );
}
