"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { SeasonLeaderboardTable } from "@/components/SeasonLeaderboardTable";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  SP_TOP_RANK,
  SP_REGISTRATION,
  SP_FIRST_REGISTRATION,
  SP_CLAIM_BONUS,
  SP_STREAK_TIERS,
  CURRENT_SEASON,
} from "@/lib/season-points-rules";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";

export default function SeasonLeaderboardPage() {
  const { account } = useWallet();
  const m = useSiteMessages().pages.seasonLeaderboard;
  const [data, setData] = useState<SeasonLeaderboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const myEntry = account?.address
    ? data?.entries.find((e) => e.owner.toLowerCase() === account.address.toString().toLowerCase())
    : null;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center">
          <div className="w-8 h-8 border-2 border-[#00f948]/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">{m.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-12">
      <div className="mb-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/60">
          {m.seasonTag(CURRENT_SEASON.label)}
        </span>
        <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight mt-1">
          {m.pageTitle}
        </h1>
        <p className="text-white/45 text-sm mt-3 max-w-2xl leading-relaxed">{m.subtitleLead}</p>
        <p className="text-white/45 text-sm mt-2 max-w-2xl leading-relaxed">
          {m.subtitleBenefits}
          <Link
            href="/faq#scoring-and-rewards--season-points"
            className="text-[#00f948]/80 hover:text-[#00f948] font-semibold underline underline-offset-2 decoration-[#00f948]/30 hover:decoration-[#00f948]/60 transition-colors"
          >
            {m.faqInlineLink}
          </Link>
          .
        </p>
        {data?.status === "inactive" && (
          <p className="text-amber-400/80 text-xs mt-3 font-medium">{m.inactiveHint}</p>
        )}
        {data?.status === "ended" && (
          <span className="inline-block mt-3 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-white/60">
            {m.endedBadge}
          </span>
        )}
        {data && data.active && data.eventIds.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/30 text-xs mt-2">
            {data.resolvedWcTourCount > 0 && (
              <span>{m.progressWc(data.resolvedWcTourCount, data.wcTourIds.length)}</span>
            )}
            {data.eplStartGw > 0 && data.resolvedEplThroughGw >= data.eplStartGw && (
              <span>
                {data.eplEndGw > 0
                  ? m.seasonWindowClosed(data.eplStartGw, data.resolvedEplThroughGw)
                  : m.progressEpl(data.eplStartGw, data.resolvedEplThroughGw)}
              </span>
            )}
          </div>
        )}
        {data?.status === "live" && data.eventIds.length === 0 && (
          <p className="text-white/35 text-xs mt-2">{m.awaitingFirstEvent}</p>
        )}
        {data?.status === "live" &&
          data.resolvedWcTourCount === data.wcTourIds.length &&
          data.wcTourIds.length > 0 &&
          data.eplStartGw > 0 &&
          data.resolvedEplThroughGw < data.eplStartGw && (
            <p className="text-white/35 text-xs mt-2">{m.awaitingEpl(data.eplStartGw)}</p>
          )}
      </div>

      {data?.status === "inactive" ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-12 text-center mb-8">
          <p className="text-white/60 font-semibold">{m.inactiveTitle}</p>
          <p className="text-white/35 text-sm mt-2 max-w-md mx-auto">{m.inactiveHint}</p>
        </div>
      ) : (
        <>
          {myEntry && (
            <div className="mb-6 bg-gradient-to-r from-[#00f948]/10 via-[#00f948]/5 to-transparent border border-[#00f948]/20 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/60">{m.myScore}</p>
                <p className="text-3xl font-black text-[#00f948] tabular-nums">
                  {myEntry.totalPoints}
                  <span className="text-sm font-bold text-[#00f948]/50 ml-1">SP</span>
                </p>
              </div>
              <div className="flex gap-6 text-xs text-white/45">
                <span>{m.colRegistrations}: <strong className="text-white/70">{myEntry.registrations}</strong></span>
                <span>{m.colTop10}: <strong className="text-white/70">{myEntry.top10Finishes}</strong></span>
                <span>{m.streakLabel}: <strong className="text-white/70">{myEntry.maxStreak}</strong></span>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-[1fr_18rem] gap-6 mb-8">
            <SeasonLeaderboardTable
              entries={data?.entries ?? []}
              currentUser={account?.address?.toString()}
              showBreakdown
            />

            <aside className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-5 h-fit">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{m.rulesTitle}</h2>
              <ul className="space-y-2.5 text-xs text-white/55">
                <li className="flex justify-between gap-2">
                  <span>{m.ruleRegistration}</span>
                  <span className="font-bold text-[#00f948]/80 tabular-nums">+{SP_REGISTRATION}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>{m.ruleFirstReg}</span>
                  <span className="font-bold text-[#00f948]/80 tabular-nums">+{SP_FIRST_REGISTRATION}</span>
                </li>
                <li className="pt-2 border-t border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {m.ruleTop10Header}
                </li>
                {[1, 2, 3].map((r) => (
                  <li key={r} className="flex justify-between gap-2">
                    <span>{m.ruleRank(r)}</span>
                    <span className="font-bold text-white/70 tabular-nums">+{SP_TOP_RANK[r]}</span>
                  </li>
                ))}
                <li className="text-white/40 text-[11px] leading-snug">{m.ruleRank4to10}</li>
                <li className="pt-2 border-t border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/30">
                  {m.ruleStreakHeader}
                </li>
                {SP_STREAK_TIERS.slice()
                  .reverse()
                  .map((tier) => (
                    <li key={tier.minStreak} className="flex justify-between gap-2">
                      <span>{m.ruleStreak(tier.minStreak)}</span>
                      <span className="font-bold text-white/70 tabular-nums">+{tier.bonus}</span>
                    </li>
                  ))}
                <li className="text-white/40 text-[11px] leading-snug pl-1">{m.ruleStreakCap}</li>
                <li className="flex justify-between gap-2 pt-2 border-t border-white/[0.06]">
                  <span>{m.ruleClaim}</span>
                  <span className="font-bold text-[#00f948]/80 tabular-nums">+{SP_CLAIM_BONUS}</span>
                </li>
              </ul>
              <p className="text-[10px] text-white/25 mt-4 leading-relaxed">{m.rulesFootnote}</p>
              <Link
                href="/faq#scoring-and-rewards--season-points"
                className="inline-block mt-4 text-xs font-semibold text-[#00f948]/70 hover:text-[#00f948] transition-colors"
              >
                {m.faqLink} →
              </Link>
            </aside>
          </div>

          {error && (
            <p className="text-red-400/80 text-sm text-center mb-4">{m.loadError(error)}</p>
          )}
        </>
      )}

      <p className="text-center text-white/25 text-xs">{m.footerNote}</p>
    </div>
  );
}
