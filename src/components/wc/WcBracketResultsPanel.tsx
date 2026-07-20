"use client";

import { cn } from "@/lib/utils";
import {
  WC_BRACKET_PERFECT_SCORE,
  type BracketScoreBreakdown,
} from "@/lib/wcBracketPrediction";

export type WcBracketResultsCopy = {
  resultsEyebrow: string;
  resultsTitle: string;
  resultsScoringLive: string;
  resultsScoringComplete: string;
  resultsPrizesPendingTitle: string;
  resultsPrizesPendingBody: string;
  resultsYourScore: string;
  resultsNoEntry: string;
  resultsConnectHint: string;
  resultsWaitingOfficial: string;
  resultsLoading: string;
  resultsGroups: string;
  resultsThirds: string;
  resultsKnockout: string;
  resultsOfMax: (score: number, max: number) => string;
  resultsDecided: (decided: number, max: number) => string;
  resultsPerfectHit: string;
  resultsViewPrediction: string;
};

type Props = {
  loading: boolean;
  connected: boolean;
  officialReady: boolean;
  tournamentComplete: boolean;
  decidedPlaces: number;
  hasEntry: boolean;
  score: BracketScoreBreakdown | null;
  copy: WcBracketResultsCopy;
  className?: string;
  onViewPrediction?: () => void;
};

function StatCell({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0D0F12]/80 px-3 py-3 text-center">
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      <p className="mt-1 font-display text-xl font-black tabular-nums text-white">
        {value}
        <span className="text-sm font-bold text-white/35">/{max}</span>
      </p>
    </div>
  );
}

/** Post-registration results: live score vs official bracket, prizes pending (no claim). */
export function WcBracketResultsPanel({
  loading,
  connected,
  officialReady,
  tournamentComplete,
  decidedPlaces,
  hasEntry,
  score,
  copy,
  className,
  onViewPrediction,
}: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0c0f]",
        className,
      )}
    >
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          {copy.resultsEyebrow}
        </p>
        <h2 className="mt-2 font-wc-display text-2xl uppercase leading-none tracking-tight text-white sm:text-3xl">
          {copy.resultsTitle}
        </h2>
        <p className="mt-2 text-sm text-white/50">
          {loading
            ? copy.resultsLoading
            : !officialReady
              ? copy.resultsWaitingOfficial
              : tournamentComplete
                ? copy.resultsScoringComplete
                : copy.resultsScoringLive}
        </p>
        {officialReady && !loading ? (
          <p className="mt-1.5 text-xs text-white/35">
            {copy.resultsDecided(decidedPlaces, WC_BRACKET_PERFECT_SCORE)}
          </p>
        ) : null}
      </div>

      <div className="border-b border-[#FFD700]/20 bg-gradient-to-r from-[#FFD700]/[0.08] to-transparent px-5 py-4 sm:px-6">
        <p className="font-wc-hero text-xs font-bold uppercase tracking-wider text-[#FFD700]">
          {copy.resultsPrizesPendingTitle}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/55">{copy.resultsPrizesPendingBody}</p>
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
          </div>
        ) : !connected ? (
          <p className="text-sm text-white/50">{copy.resultsConnectHint}</p>
        ) : !hasEntry ? (
          <p className="text-sm text-white/50">{copy.resultsNoEntry}</p>
        ) : !officialReady || !score ? (
          <p className="text-sm text-white/50">{copy.resultsWaitingOfficial}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {copy.resultsYourScore}
                </p>
                <p className="mt-1 font-display text-4xl font-black tabular-nums text-white sm:text-5xl">
                  {score.total}
                  <span className="ml-1.5 text-lg font-bold text-white/35 sm:text-xl">
                    /{score.maxPossible}
                  </span>
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {copy.resultsOfMax(score.total, score.maxPossible)}
                </p>
              </div>
              {score.total === WC_BRACKET_PERFECT_SCORE ? (
                <span className="rounded-full border border-[#FFD700]/35 bg-[#FFD700]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFD700]">
                  {copy.resultsPerfectHit}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <StatCell label={copy.resultsGroups} value={score.groupPoints} max={48} />
              <StatCell label={copy.resultsThirds} value={score.thirdPlacePoints} max={12} />
              <StatCell label={copy.resultsKnockout} value={score.knockoutPoints} max={32} />
            </div>

            {onViewPrediction ? (
              <button
                type="button"
                onClick={onViewPrediction}
                className="mt-5 text-xs font-bold uppercase tracking-wider text-[#00f948]/80 transition-colors hover:text-[#00f948]"
              >
                {copy.resultsViewPrediction}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
