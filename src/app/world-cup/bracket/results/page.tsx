"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WcSectionEyebrow } from "@/components/wc/WcSectionEyebrow";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import {
  WC_BRACKET_PERFECT_SCORE,
  WC_BRACKET_TOP5_TOTAL_USDC,
} from "@/lib/wcBracketPrediction";

type LeaderboardEntry = {
  rank: number;
  owner: string;
  ownerShort: string;
  total: number;
  groupPoints: number;
  thirdPlacePoints: number;
  knockoutPoints: number;
  prizeTopFiveUsdc: number;
  prizePerfectBonusUsdc: number;
  prizeTotalUsdc: number;
};

type LeaderboardPayload = {
  generatedAt: string;
  totalEntries: number;
  decidedPlaces: number;
  tournamentComplete: boolean;
  perfectScore: number;
  entries: LeaderboardEntry[];
};

function usdc(micro: number) {
  return `$${(micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function WorldCupBracketResultsPage() {
  const m = useSiteMessages();
  const bc = m.pages.worldCup.bracket;
  const lb = bc.leaderboard;

  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/data/wc-bracket-leaderboard.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const body = (await res.json()) as LeaderboardPayload;
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) setError(String((e as Error).message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const topFivePool = useMemo(() => usdc(WC_BRACKET_TOP5_TOTAL_USDC), []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <WcSectionEyebrow>{lb.eyebrow}</WcSectionEyebrow>
      <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
        {lb.title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">{lb.subtitle}</p>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link
          href="/world-cup/bracket"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-semibold text-white/80 transition hover:border-white/20 hover:text-white"
        >
          {lb.backToBracket}
        </Link>
        {data ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-200/90">
            {lb.entriesChip(data.totalEntries)}
          </span>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0c0f]">
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.payoutNoteTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{lb.payoutNoteBody(topFivePool)}</p>
          {data && !data.tournamentComplete ? (
            <p className="mt-2 text-xs text-amber-200/80">
              {lb.partialOfficial(data.decidedPlaces, WC_BRACKET_PERFECT_SCORE)}
            </p>
          ) : null}
        </div>

        {loading ? (
          <p className="px-6 py-10 text-sm text-white/40">{bc.resultsLoading}</p>
        ) : error ? (
          <p className="px-6 py-10 text-sm text-red-300/90">{lb.loadError}</p>
        ) : !data?.entries.length ? (
          <p className="px-6 py-10 text-sm text-white/40">{lb.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-white/30">
                  <th className="px-4 py-3 sm:px-6">{lb.colRank}</th>
                  <th className="px-4 py-3">{lb.colWallet}</th>
                  <th className="px-4 py-3 text-right">{lb.colScore}</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">{bc.resultsGroups}</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">{bc.resultsThirds}</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell">{bc.resultsKnockout}</th>
                  <th className="px-4 py-3 text-right sm:px-6">{lb.colPayout}</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((row) => (
                  <tr
                    key={row.owner}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-display text-base font-black tabular-nums text-white sm:px-6">
                      {bc.prizeRank(row.rank)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/70">{row.ownerShort}</td>
                    <td className="px-4 py-3 text-right font-display text-lg font-black tabular-nums text-white">
                      {row.total}
                      <span className="text-xs font-bold text-white/30">/{WC_BRACKET_PERFECT_SCORE}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-white/60 sm:table-cell">
                      {row.groupPoints}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-white/60 md:table-cell">
                      {row.thirdPlacePoints}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-white/60 md:table-cell">
                      {row.knockoutPoints}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      {row.prizeTotalUsdc > 0 ? (
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-emerald-300">{usdc(row.prizeTotalUsdc)}</p>
                          {row.prizePerfectBonusUsdc > 0 ? (
                            <p className="text-[10px] text-white/35">{bc.resultsPerfectHit}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-white/25">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.generatedAt ? (
        <p className={cn("mt-4 text-[11px] text-white/25")}>{lb.generatedAt(new Date(data.generatedAt).toLocaleString())}</p>
      ) : null}
    </div>
  );
}
