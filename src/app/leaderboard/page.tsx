"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import {
  client,
  getConfig,
  getGameweek,
  findOpenGameweekFromChain,
  findHighestGameweekIdOnChain,
  findLatestResolvedGameweekId,
  getTeamResult,
  getGameweekTeams,
  getUserTeam,
  getGameweekStats,
  moduleFunction,
  type ChainConfig,
  type GameweekSummary,
} from "@/lib/movement";
import { calculateFantasyPointsWithRating } from "@/lib/scoring";
import { formatMOVE, cn, formatTxError } from "@/lib/utils";
import { MIN_PUBLIC_LEADERBOARD_GW } from "@/lib/constants";
import { TeamResult } from "@/lib/types";
import { useSiteMessages } from "@/i18n/LocaleProvider";

export default function LeaderboardPage() {
  const { account, connected, signTransaction } = useWallet();
  const lb = useSiteMessages().pages.leaderboard;
  const [config, setConfig] = useState<ChainConfig | null>(null);
  /** Upper bound for tour dropdown; can exceed `config.currentGameweek` if pointer lags. */
  const [pickerMaxGw, setPickerMaxGw] = useState(0);
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(0);
  const [leaderboardData, setLeaderboardData] = useState<TeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Load config & resolve initial gameweek (runs once)
  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await getConfig();
        setConfig(configData);
        if (!configData) {
          setIsLoading(false);
          return;
        }

        const [openGw, highestId] = await Promise.all([
          findOpenGameweekFromChain(configData),
          findHighestGameweekIdOnChain(configData),
        ]);

        const maxPick = Math.max(Number(configData.currentGameweek) || 0, highestId);
        setPickerMaxGw(maxPick);

        const latestResolved = await findLatestResolvedGameweekId(highestId);

        let initial = 0;
        if (latestResolved > 0) {
          initial = latestResolved;
        } else if (openGw) {
          initial = openGw.id;
        } else if (maxPick > 0) {
          initial = maxPick;
        }

        if (initial > 0) {
          setSelectedGameweek(Math.max(initial, MIN_PUBLIC_LEADERBOARD_GW));
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading config:", error);
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Fetch gameweek data when selection changes (also reused after a successful claim).
  const fetchGameweekData = useCallback(async (gwId: number) => {
    if (gwId === 0) return;
    setIsLoading(true);
    setIsPreview(false);
    try {
      const gwData = await getGameweek(gwId);
      setCurrentGameweek(gwData);

      if (gwData && gwData.status === "resolved") {
        const addresses = await getGameweekTeams(gwId);
        const results = await Promise.all(
          addresses.map((addr) => getTeamResult(addr, gwId)),
        );
        const validResults = results.filter((r): r is TeamResult => r !== null);
        validResults.sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          if (b.finalPoints !== a.finalPoints) return b.finalPoints - a.finalPoints;
          return a.owner.localeCompare(b.owner);
        });
        setLeaderboardData(validResults);
      } else if (gwData && gwData.status === "closed") {
        // Preview mode: compute scores client-side from on-chain stats
        const addresses = await getGameweekTeams(gwId);
        if (addresses.length > 0) {
          const teams = await Promise.all(addresses.map((addr) => getUserTeam(addr, gwId)));
          const allIds = new Set<number>();
          teams.forEach((t) => t?.playerIds.slice(0, 11).forEach((id) => allIds.add(id)));
          const stats = await getGameweekStats(gwId, Array.from(allIds));

          const hasAnyStats = Object.keys(stats).length > 0;
          if (hasAnyStats) {
            const scored = addresses.map((owner, i) => {
              const team = teams[i];
              if (!team) return { owner, finalPoints: 0 };
              const points = team.playerIds.slice(0, 11).reduce((sum, playerId, j) => {
                const positionId = team.playerPositions?.[j] ?? 4;
                const s = stats[playerId];
                return sum + (s ? calculateFantasyPointsWithRating({ positionId }, s as Record<string, unknown>) : 0);
              }, 0);
              return { owner, finalPoints: points };
            });

            scored.sort((a, b) => b.finalPoints - a.finalPoints);

            const preview: TeamResult[] = [];
            let row = 0;
            while (row < scored.length) {
              let next = row + 1;
              while (
                next < scored.length &&
                scored[next].finalPoints === scored[row].finalPoints
              ) {
                next += 1;
              }
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
    } catch (error) {
      console.error("Error fetching gameweek data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGameweek === 0) return;
    fetchGameweekData(selectedGameweek);
  }, [selectedGameweek, fetchGameweekData]);

  const handleClaimPrize = async (gameweekId: number) => {
    if (!connected || !account?.address) return;
    setIsClaiming(true);
    try {
      // Same path as gameweek registration: build on Movement fullnode, sign raw tx.
      // `signAndSubmitTransaction` always runs wallet-adapter `getAptosConfig` and breaks on Movement ("custom").
      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("claim_prize"),
          typeArguments: [],
          functionArguments: [gameweekId.toString()],
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
      alert(lb.claimSuccess);
      // setSelectedGameweek(gameweekId) here is a no-op (same value) — React skips state updates,
      // so the leaderboard would never reflect `claimed: true` until the user changes the dropdown.
      // Re-run the fetch directly instead.
      await fetchGameweekData(gameweekId);
    } catch (error: unknown) {
      alert(lb.claimFail(formatTxError(error)));
    } finally {
      setIsClaiming(false);
    }
  };

  const userResult = account?.address
    ? leaderboardData.find((r) => r.owner === account.address.toString())
    : null;

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
      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/60">{lb.seasonTag}</span>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight mt-1">{lb.pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-2xl mb-1">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">{lb.gwLabel}</span>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
          >
            {Array.from(
              {
                length: Math.max(
                  1,
                  Math.max(pickerMaxGw || Number(config?.currentGameweek) || 1, MIN_PUBLIC_LEADERBOARD_GW) -
                    MIN_PUBLIC_LEADERBOARD_GW +
                    1,
                ),
              },
              (_, i) => MIN_PUBLIC_LEADERBOARD_GW + i,
            ).map((gw) => (
              <option key={gw} value={gw} className="bg-[#0D0F12]">
                {gw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview banner */}
      {isPreview && (
        <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">
            Preview — Intermediate results. Scores will update as more matches are played. Claims available after final results are published.
          </p>
        </div>
      )}

      {/* Gameweek Summary — compact single row */}
      {currentGameweek ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 mb-8 flex items-center gap-6 flex-wrap">

          {/* Status */}
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0",
              currentGameweek.status === "open" && "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]",
              currentGameweek.status === "closed" && "bg-amber-400",
              currentGameweek.status === "resolved" && "bg-[#00f948]"
            )} />
            <span className={cn(
              "text-sm font-bold uppercase tracking-wide",
              currentGameweek.status === "open" && "text-emerald-400",
              currentGameweek.status === "closed" && "text-amber-400",
              currentGameweek.status === "resolved" && "text-[#00f948]"
            )}>
              {currentGameweek.status === "open" ? lb.statusOpen : currentGameweek.status === "closed" ? lb.statusClosed : lb.statusResolved}
            </span>
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Prize Pool */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.poolLabel}</span>
            <span className="text-xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00f948] bg-clip-text text-transparent tabular-nums">
              {formatMOVE(currentGameweek.prizePool)}
            </span>
            <span className="text-white/30 text-xs">MOVE</span>
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Entries */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.entriesLabel}</span>
            <span className="text-xl font-display font-black text-white tabular-nums">
              {currentGameweek.totalEntries}
            </span>
          </div>

          {/* Distribution tooltip — pushed to the right */}
          <div className="ml-auto relative group/dist">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 hover:text-white/50 cursor-default transition-colors underline decoration-dotted underline-offset-2 whitespace-nowrap">
              {lb.prizeDistribution}
            </span>
            <div className="absolute top-full right-0 mt-2 hidden group-hover/dist:block z-50 w-44 pointer-events-none">
              <div className="bg-[#1a1d26] border border-white/10 rounded-xl p-3 shadow-2xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">{lb.top10Receive}</p>
                <div className="space-y-1">
                  {[
                    { rank: "1",  icon: "🥇", share: "30%", color: "text-[#FFD700]" },
                    { rank: "2",  icon: "🥈", share: "20%", color: "text-white/60" },
                    { rank: "3",  icon: "🥉", share: "15%", color: "text-[#F59E0B]" },
                    { rank: "4",  icon: null,  share: "8%",  color: "text-white/40" },
                    { rank: "5",  icon: null,  share: "7%",  color: "text-white/40" },
                    { rank: "6",  icon: null,  share: "6%",  color: "text-white/35" },
                    { rank: "7",  icon: null,  share: "5%",  color: "text-white/35" },
                    { rank: "8",  icon: null,  share: "4%",  color: "text-white/30" },
                    { rank: "9",  icon: null,  share: "3%",  color: "text-white/30" },
                    { rank: "10", icon: null,  share: "2%",  color: "text-white/25" },
                  ].map((p) => (
                    <div key={p.rank} className="flex items-center justify-between">
                      <span className="text-white/30 text-[11px]">{p.icon ?? `#${p.rank}`}</span>
                      <span className={cn("text-xs font-bold tabular-nums", p.color)}>{p.share}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center mb-8">
          <p className="text-white/30 text-sm">{lb.noDataForGw(selectedGameweek)}</p>
        </div>
      )}

      {/* User's Result Highlight */}
      {userResult && (
        <div className="bg-[#00f948]/[0.04] border border-[#00f948]/20 shadow-[0_0_40px_rgba(0,249,72,0.06)] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00f948]/15 border border-[#00f948]/25 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#00f948]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-display font-black text-white uppercase tracking-wide">{lb.myResultTitle(selectedGameweek)}</h2>
            </div>
            <div className="flex items-center gap-2">
              {userResult.rank > 0 && userResult.rank <= 10 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  {lb.inPrizes}
                </span>
              )}
              <Link
                href="/my-result"
                className="text-[10px] font-bold uppercase tracking-wider text-[#00f948]/70 hover:text-[#00f948] border border-[#00f948]/20 hover:border-[#00f948]/40 px-3 py-1 rounded-full transition-colors"
              >
                {lb.detailsLink}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: lb.colRank,
                value: userResult.rank > 0 ? `#${userResult.rank}` : "—",
                className:
                  userResult.rank === 1
                    ? "text-[#FFD700]"
                    : userResult.rank === 2
                      ? "text-[#E2E8F0]"
                      : userResult.rank === 3
                        ? "text-[#F59E0B]"
                        : "text-white",
              },
              {
                label: lb.colPoints,
                value: String(userResult.finalPoints),
                className: "text-white",
              },
              {
                label: lb.colPrizeMove,
                value: userResult.prizeAmount > 0 ? formatMOVE(userResult.prizeAmount) : "—",
                className: "text-emerald-400",
              },
            ].map(({ label, value, className }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
                <p className={cn("text-2xl font-display font-black tabular-nums", className)}>{value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
            <div className="flex items-center justify-center">
              {isPreview ? (
                <p className="text-amber-400/60 text-xs text-center font-semibold uppercase tracking-wide">Interim results</p>
              ) : (
                <>
                  {userResult.prizeAmount > 0 && !userResult.claimed && (
                    <button
                      onClick={() => handleClaimPrize(selectedGameweek)}
                      disabled={isClaiming}
                      className="w-full py-3 rounded-xl font-display font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-[#00f948] text-black hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClaiming ? lb.claiming : lb.claim}
                    </button>
                  )}
                  {userResult.claimed && (
                    <div className="text-center">
                      <p className="text-emerald-400 font-bold text-sm">{lb.claimed}</p>
                    </div>
                  )}
                  {userResult.prizeAmount === 0 && (
                    <p className="text-white/20 text-xs text-center">{lb.noPrize}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Leaderboard Table */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
        {leaderboardData.length > 0 ? (
          <LeaderboardTable
            results={leaderboardData}
            currentUser={account?.address?.toString()}
          />
        ) : (
          <div className="py-10 text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-base font-display font-black text-white uppercase tracking-tight mb-1">{lb.emptyTitle}</h3>
            {currentGameweek?.status === "closed" ? (
              <p className="text-white/40 text-xs max-w-md mx-auto mb-4 leading-relaxed">
                {lb.emptyClosedHint(selectedGameweek)}
              </p>
            ) : (
              <p className="text-white/30 text-xs mb-4">
                {lb.emptyNotPublished(selectedGameweek)}
              </p>
            )}
            <a
              href="/gameweek"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00f948]/10 border border-[#00f948]/20 text-[#00f948] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#00f948]/20 hover:border-[#00f948]/30 transition-all"
            >
              {lb.registerSquadCta}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        )}
      </div>

      <p className="text-center text-white/20 text-xs mt-6">
        {lb.footerLine(selectedGameweek)}
      </p>
    </div>
  );
}
