"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import {
  client,
  getGameweek,
  getTeamResult,
  getGameweekTeams,
  getUserTeam,
  getGameweekStats,
  moduleFunction,
  type GameweekSummary,
} from "@/lib/movement";
import {
  getWorldCupTourSummaries,
  findActiveWorldCupTourFromChain,
  findLatestResolvedWorldCupTourId,
  getWorldCupRound,
} from "@/lib/worldcup";
import { previewTourPointsFromRegisteredTeam } from "@/lib/chainAlignedScoring";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { cn, formatTxError } from "@/lib/utils";
import { TeamResult } from "@/lib/types";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  fetchTourClaimHistoryFromApi,
  mergePriorClaimsIntoResults,
  ownerHasPriorClaimPrize,
} from "@/lib/tourClaimHistory";

export default function WorldCupLeaderboardPage() {
  const { account, connected, signTransaction } = useWallet();
  const msgs = useSiteMessages();
  const lb = msgs.pages.leaderboard;
  const wc = msgs.pages.worldCup;
  const prize = usePrizeAsset();

  const [availableTours, setAvailableTours] = useState<GameweekSummary[]>([]);
  const [currentTour, setCurrentTour] = useState<GameweekSummary | null>(null);
  const [selectedTour, setSelectedTour] = useState<number>(0);
  const [leaderboardData, setLeaderboardData] = useState<TeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [summaries, active, latestResolved] = await Promise.all([
          getWorldCupTourSummaries(),
          findActiveWorldCupTourFromChain(),
          findLatestResolvedWorldCupTourId(),
        ]);
        setAvailableTours(summaries);

        let initial = 0;
        if (latestResolved > 0) initial = latestResolved;
        else if (active) initial = active.id;
        else if (summaries.length > 0) initial = summaries[summaries.length - 1].id;

        if (initial > 0) setSelectedTour(initial);
        else setIsLoading(false);
      } catch (e) {
        console.error("Error loading WC tours:", e);
        setIsLoading(false);
      }
    })();
  }, []);

  const fetchTourData = useCallback(async (tourId: number) => {
    if (tourId === 0) return;
    setIsLoading(true);
    setIsPreview(false);
    try {
      const gwData = await getGameweek(tourId);
      setCurrentTour(gwData);

      if (gwData && gwData.status === "resolved") {
        const addresses = await getGameweekTeams(tourId);
        const [results, priorClaimed] = await Promise.all([
          Promise.all(addresses.map((addr) => getTeamResult(addr, tourId))),
          fetchTourClaimHistoryFromApi(tourId),
        ]);
        const valid = results.filter((r): r is TeamResult => r !== null);
        const merged = mergePriorClaimsIntoResults(valid, priorClaimed);
        merged.sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          if (b.finalPoints !== a.finalPoints) return b.finalPoints - a.finalPoints;
          return a.owner.localeCompare(b.owner);
        });
        setLeaderboardData(merged);
      } else if (gwData && gwData.status === "closed") {
        const addresses = await getGameweekTeams(tourId);
        if (addresses.length > 0) {
          const teams = await Promise.all(addresses.map((addr) => getUserTeam(addr, tourId)));
          const allIds = new Set<number>();
          teams.forEach((t) => t?.playerIds.forEach((id) => allIds.add(id)));
          const stats = await getGameweekStats(tourId, Array.from(allIds));
          const hasAnyStats = Object.keys(stats).length > 0;
          if (hasAnyStats) {
            const scored = addresses.map((owner, i) => {
              const team = teams[i];
              if (!team) return { owner, finalPoints: 0 };
              const points = previewTourPointsFromRegisteredTeam(team, stats as Record<string, Record<string, unknown>>);
              return { owner, finalPoints: points };
            });
            scored.sort((a, b) => b.finalPoints - a.finalPoints);

            const preview: TeamResult[] = [];
            let row = 0;
            while (row < scored.length) {
              let next = row + 1;
              while (next < scored.length && scored[next].finalPoints === scored[row].finalPoints) next += 1;
              const compRank = row + 1;
              for (let k = row; k < next; k++) {
                preview.push({
                  owner: scored[k].owner,
                  basePoints: scored[k].finalPoints,
                  ratingBonus: 0,
                  titleTriggered: false,
                  titleMultiplier: 1,
                  guildTriggered: false,
                  guildMultiplier: 1,
                  finalPoints: scored[k].finalPoints,
                  rank: compRank,
                  prizeAmount: 0,
                  claimed: false,
                });
              }
              row = next;
            }
            setLeaderboardData(preview);
            setIsPreview(true);
          } else {
            setLeaderboardData([]);
          }
        } else {
          setLeaderboardData([]);
        }
      } else {
        setLeaderboardData([]);
      }
    } catch (e) {
      console.error("Error fetching WC tour data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTour === 0) return;
    fetchTourData(selectedTour);
  }, [selectedTour, fetchTourData]);

  const handleClaimPrize = async (tourId: number) => {
    if (!connected || !account?.address) return;

    const alreadyPaid = await ownerHasPriorClaimPrize(tourId, account.address.toString());
    if (alreadyPaid) {
      alert(lb.claimAlreadyPaid);
      await fetchTourData(tourId);
      return;
    }

    setIsClaiming(true);
    try {
      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("claim_prize"),
          typeArguments: [],
          functionArguments: [tourId.toString()],
        },
      });
      const signResult = await signTransaction({ transactionOrPayload: transaction });
      const pending = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });
      await client.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 30, checkSuccess: true },
      });
      alert(lb.claimSuccess(prize.symbol));
      await fetchTourData(tourId);
    } catch (error: unknown) {
      alert(lb.claimFail(formatTxError(error)));
    } finally {
      setIsClaiming(false);
    }
  };

  const userResult = account?.address
    ? leaderboardData.find((r) => r.owner === account.address.toString())
    : null;

  const tourLabel = (id: number) => wc.roundName(getWorldCupRound(id)?.key ?? "");

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center">
          <div className="w-8 h-8 border-2 border-[#00f948]/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">{lb.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-12">
      <div className="mb-4">
        <Link href="/world-cup" className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 hover:text-[#00f948]">
          {wc.backToHub}
        </Link>
      </div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/60">{wc.badge}</span>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight mt-1">{wc.leaderboardTitle}</h1>
        </div>

        {availableTours.length > 0 && (
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-2xl mb-1">
            <select
              value={selectedTour}
              onChange={(e) => setSelectedTour(Number(e.target.value))}
              className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
            >
              {availableTours.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#0D0F12]">
                  {tourLabel(t.id)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isPreview && (
        <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">
            Preview — Intermediate results. Claims available after final results are published.
          </p>
        </div>
      )}

      {currentTour ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 mb-8 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0",
              currentTour.status === "open" && "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]",
              currentTour.status === "closed" && "bg-amber-400",
              currentTour.status === "resolved" && "bg-[#00f948]",
            )} />
            <span className={cn(
              "text-sm font-bold uppercase tracking-wide",
              currentTour.status === "open" && "text-emerald-400",
              currentTour.status === "closed" && "text-amber-400",
              currentTour.status === "resolved" && "text-[#00f948]",
            )}>
              {currentTour.status === "open" ? lb.statusOpen : currentTour.status === "closed" ? lb.statusClosed : lb.statusResolved}
            </span>
          </div>
          <div className="w-px h-5 bg-white/[0.08]" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.poolLabel}</span>
            <span className="text-xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00f948] bg-clip-text text-transparent tabular-nums">
              {prize.formatUnits(currentTour.prizePool)}
            </span>
            <span className="text-white/30 text-xs">{prize.symbol}</span>
          </div>
          <div className="w-px h-5 bg-white/[0.08]" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.entriesLabel}</span>
            <span className="text-xl font-display font-black text-white tabular-nums">{currentTour.totalEntries}</span>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center mb-8">
          <p className="text-white/30 text-sm">{wc.leaderboardEmptyHint}</p>
        </div>
      )}

      {userResult && (
        <div className="bg-[#00f948]/[0.04] border border-[#00f948]/20 shadow-[0_0_40px_rgba(0,249,72,0.06)] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-display font-black text-white uppercase tracking-wide">{lb.myResultTitle(selectedTour)}</h2>
            {userResult.rank > 0 && userResult.rank <= 10 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                {lb.inPrizes}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: lb.colRank,
                value: userResult.rank > 0 ? `#${userResult.rank}` : "—",
                className:
                  userResult.rank === 1 ? "text-[#FFD700]" : userResult.rank === 2 ? "text-[#E2E8F0]" : userResult.rank === 3 ? "text-[#F59E0B]" : "text-white",
              },
              { label: lb.colPoints, value: String(userResult.finalPoints), className: "text-white" },
              { label: lb.colPrize(prize.symbol), value: userResult.prizeAmount > 0 ? prize.formatUnits(userResult.prizeAmount) : "—", className: "text-emerald-400" },
            ].map(({ label, value, className }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
                <p className={cn("text-2xl font-display font-black tabular-nums", className)}>{value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
            <div className="flex items-center justify-center">
              {isPreview ? (
                <p className="text-amber-400/60 text-xs text-center font-semibold uppercase tracking-wide">Interim</p>
              ) : (
                <>
                  {userResult.prizeAmount > 0 && !userResult.claimed && (
                    <button
                      onClick={() => handleClaimPrize(selectedTour)}
                      disabled={isClaiming}
                      className="w-full py-3 rounded-xl font-display font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-[#00f948] text-black hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClaiming ? lb.claiming : lb.claim}
                    </button>
                  )}
                  {userResult.claimed && <p className="text-emerald-400 font-bold text-sm">{lb.claimed}</p>}
                  {userResult.prizeAmount === 0 && <p className="text-white/20 text-xs text-center">{lb.noPrize}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-x-auto">
        {leaderboardData.length > 0 ? (
          <LeaderboardTable
            results={leaderboardData}
            currentUser={account?.address?.toString()}
            gameweekId={selectedTour}
            isPreview={isPreview}
            showSquadView={
              currentTour?.status === "resolved" || (currentTour?.status === "closed" && isPreview)
            }
            catalogUrl="/api/wc-players"
            fplEnrichment={false}
          />
        ) : (
          <div className="py-10 text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-base font-display font-black text-white uppercase tracking-tight mb-1">{wc.leaderboardEmptyTitle}</h3>
            <p className="text-white/30 text-xs mb-4">{wc.leaderboardEmptyHint}</p>
            <Link
              href="/world-cup/squad"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00f948]/10 border border-[#00f948]/20 text-[#00f948] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#00f948]/20 hover:border-[#00f948]/30 transition-all"
            >
              {wc.playCta}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
