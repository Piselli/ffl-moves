"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useSolanaWallet";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  LOCKER_PALETTE,
  paletteToCssVars,
} from "@/components/design-lab/locker-hero/lockerPalettes";
import {
  getConfig,
  getGameweek,
  findOpenGameweek,
  findHighestGameweekId,
  findLatestResolvedGameweekId,
  getGameweekResults,
  getGameweekEntrants,
  getUserTeam,
  getGameweekStats,
  buildClaimPrize,
  type ChainConfig,
  type GameweekSummary,
} from "@/lib/chainClient";
import { previewTourPointsFromRegisteredTeam } from "@/lib/chainAlignedScoring";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { cn, formatTxError } from "@/lib/utils";
import { MIN_PUBLIC_LEADERBOARD_GW } from "@/lib/constants";
import { isWorldCupTour } from "@/lib/worldcup";
import { TeamResult } from "@/lib/types";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  ownerHasPriorClaimPrize,
  tourOwnersMatch,
} from "@/lib/tourClaimHistory";

const YOU_ROW_ID = "lb-you-row";

/**
 * Shipping gameweek leaderboard — full table first.
 * Atmosphere/materials continue homepage; no spatial metaphor replacing the board.
 */
export function GameweekLeaderboardView() {
  const { account, connected, signAndSubmit } = useWallet();
  const lb = useSiteMessages().pages.leaderboard;
  const prize = usePrizeAsset();
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
          findOpenGameweek(),
          findHighestGameweekId(),
        ]);

        const chainCurrent = Number(configData.currentGameweek) || 0;
        const eplCurrent = isWorldCupTour(chainCurrent) ? highestId : chainCurrent;
        const maxPick = Math.max(eplCurrent, highestId);
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
        const validResults = await getGameweekResults(gwId);
        validResults.sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          if (b.finalPoints !== a.finalPoints) return b.finalPoints - a.finalPoints;
          return a.owner.localeCompare(b.owner);
        });
        setLeaderboardData(validResults);
      } else if (gwData && gwData.status === "closed") {
        // Preview mode: compute scores client-side from on-chain stats
        const addresses = await getGameweekEntrants(gwId);
        if (addresses.length > 0) {
          const teams = await Promise.all(addresses.map((addr) => getUserTeam(addr, gwId)));
          const allIds = new Set<number>();
          teams.forEach((t) => t?.playerIds.forEach((id) => allIds.add(id)));
          const stats = await getGameweekStats(gwId, Array.from(allIds));

          const hasAnyStats = Object.keys(stats).length > 0;
          if (hasAnyStats) {
            const scored = addresses.map((owner, i) => {
              const team = teams[i];
              if (!team) return { owner, finalPoints: 0 };
              const points = previewTourPointsFromRegisteredTeam(
                team,
                stats as Record<string, Record<string, unknown>>,
              );
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
                  prizeAmount: 0n,
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

    const alreadyPaid = await ownerHasPriorClaimPrize(gameweekId, account.address.toString());
    if (alreadyPaid) {
      alert(lb.claimAlreadyPaid);
      await fetchGameweekData(gameweekId);
      return;
    }

    setIsClaiming(true);
    try {
      await signAndSubmit(await buildClaimPrize(account.address, gameweekId));
      alert(lb.claimSuccess(prize.symbol));
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
    ? leaderboardData.find((r) => tourOwnersMatch(r.owner, account.address.toString()))
    : null;

  const findMe = () => {
    const el = document.getElementById(YOU_ROW_ID);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (isLoading) {
    return (
      <div
        className="relative min-h-[100dvh] bg-[#1a1816] text-white"
        style={paletteToCssVars(LOCKER_PALETTE)}
      >
        <PageWash />
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-center px-4 pb-12 pt-28">
          <GlassPanel className="!rounded-3xl px-14 py-14 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#00f948]/60 border-t-transparent" />
            <p className="text-sm text-white/40">{lb.loading}</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[100dvh] bg-[#1a1816] text-white"
      style={paletteToCssVars(LOCKER_PALETTE)}
    >
      <PageWash />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-28">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {lb.seasonTag}
          </span>
          <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight text-white">
            {lb.pageTitle}
          </h1>
        </div>

        <div className="mb-1 flex flex-wrap items-center gap-2">
          {userResult ? (
            <button
              type="button"
              onClick={findMe}
              className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/30 hover:text-white"
            >
              Find me
            </button>
          ) : null}
          <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/40 px-4 py-2 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-widest text-white/40">
              {lb.gwLabel}
            </span>
            <select
              value={selectedGameweek}
              onChange={(e) => setSelectedGameweek(Number(e.target.value))}
              className="cursor-pointer bg-transparent text-sm font-bold text-white focus:outline-none"
            >
              {Array.from(
                {
                  length: Math.max(
                    1,
                    Math.max(
                      pickerMaxGw || Number(config?.currentGameweek) || 1,
                      MIN_PUBLIC_LEADERBOARD_GW,
                    ) -
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
      </div>

      {/* Preview banner */}
      {isPreview && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3">
          <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
            Preview — Intermediate results. Scores will update as more matches are played. Claims available after final results are published.
          </p>
        </div>
      )}

      {/* Gameweek Summary — compact single row */}
      {currentGameweek ? (
        <GlassPanel className="mb-8 !rounded-2xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
          {/* Status */}
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              currentGameweek.status === "open" && "animate-pulse bg-emerald-400 shadow-[0_0_6px_#34d399]",
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

          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Prize Pool */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.poolLabel}</span>
            <span className="bg-gradient-to-r from-emerald-400 to-[#00f948] bg-clip-text font-display text-xl font-black tabular-nums text-transparent">
              {prize.formatUnits(currentGameweek.prizePool)}
            </span>
            <span className="text-xs text-white/30">{prize.symbol}</span>
          </div>

          <div className="h-5 w-px bg-white/[0.08]" />

          {/* Entries */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lb.entriesLabel}</span>
            <span className="font-display text-xl font-black tabular-nums text-white">
              {currentGameweek.totalEntries}
            </span>
          </div>

          {/* Distribution tooltip — pushed to the right */}
          <div className="relative ml-auto group/dist">
            <span className="cursor-default whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/25 underline decoration-dotted underline-offset-2 transition-colors hover:text-white/50">
              {lb.prizeDistribution}
            </span>
            <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden w-44 group-hover/dist:block">
              <div className="rounded-xl border border-white/10 bg-[#1a1d26] p-3 shadow-2xl">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">{lb.top10Receive}</p>
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
                      <span className="text-[11px] text-white/30">{p.icon ?? `#${p.rank}`}</span>
                      <span className={cn("text-xs font-bold tabular-nums", p.color)}>{p.share}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel className="mb-8 !rounded-2xl p-5 text-center">
          <p className="text-sm text-white/30">{lb.noDataForGw(selectedGameweek)}</p>
        </GlassPanel>
      )}

      {/* User's Result Highlight */}
      {userResult && (
        <div className="mb-8 rounded-2xl border border-[#00f948]/20 bg-[#00f948]/[0.04] p-6 shadow-[0_0_40px_rgba(0,249,72,0.06)]">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#00f948]/25 bg-[#00f948]/15">
                <svg className="h-4 w-4 text-[#00f948]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="font-display text-sm font-black uppercase tracking-wide text-white">{lb.myResultTitle(selectedGameweek)}</h2>
            </div>
            <div className="flex items-center gap-2">
              {userResult.rank > 0 && userResult.rank <= 10 && (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {lb.inPrizes}
                </span>
              )}
              <Link
                href="/my-result"
                className="rounded-full border border-[#00f948]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00f948]/70 transition-colors hover:border-[#00f948]/40 hover:text-[#00f948]"
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
                label: lb.colPrize(prize.symbol),
                value: userResult.prizeAmount > 0 ? prize.formatUnits(userResult.prizeAmount) : "—",
                className: "text-emerald-400",
              },
            ].map(({ label, value, className }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-center">
                <p className={cn("font-display text-2xl font-black tabular-nums", className)}>{value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">{label}</p>
              </div>
            ))}
            <div className="flex items-center justify-center">
              {isPreview ? (
                <p className="text-center text-xs font-semibold uppercase tracking-wide text-amber-400/60">Interim results</p>
              ) : (
                <>
                  {userResult.prizeAmount > 0 && !userResult.claimed && (
                    <button
                      onClick={() => handleClaimPrize(selectedGameweek)}
                      disabled={isClaiming}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-[#00f948] py-3 font-display text-sm font-black uppercase tracking-wide text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isClaiming ? lb.claiming : lb.claim}
                    </button>
                  )}
                  {userResult.claimed && (
                    <div className="text-center">
                      <p className="text-sm font-bold text-emerald-400">{lb.claimed}</p>
                    </div>
                  )}
                  {userResult.prizeAmount === 0n && (
                    <p className="text-center text-xs text-white/20">{lb.noPrize}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table — primary */}
      <GlassPanel className="overflow-x-auto !rounded-2xl">
        {leaderboardData.length > 0 ? (
          <LeaderboardTable
            results={leaderboardData}
            currentUser={account?.address?.toString()}
            gameweekId={selectedGameweek}
            isPreview={isPreview}
            youRowId={YOU_ROW_ID}
            showSquadView={
              currentGameweek?.status === "resolved" ||
              (currentGameweek?.status === "closed" && isPreview)
            }
            allowOwnSquadExpand
            onClaimPrize={
              currentGameweek?.status === "resolved" && !isPreview
                ? () => handleClaimPrize(selectedGameweek)
                : undefined
            }
            isClaiming={isClaiming}
          />
        ) : (
          <div className="py-10 text-center">
            <div className="mb-3 text-3xl">🏆</div>
            <h3 className="mb-1 font-display text-base font-black uppercase tracking-tight text-white">{lb.emptyTitle}</h3>
            {currentGameweek?.status === "closed" ? (
              <p className="mx-auto mb-4 max-w-md text-xs leading-relaxed text-white/40">
                {lb.emptyClosedHint(selectedGameweek)}
              </p>
            ) : (
              <p className="mb-4 text-xs text-white/30">
                {lb.emptyNotPublished(selectedGameweek)}
              </p>
            )}
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-[#00f948]/20 bg-[#00f948]/10 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#00f948] transition-all hover:border-[#00f948]/30 hover:bg-[#00f948]/20"
            >
              {lb.registerSquadCta}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        )}
      </GlassPanel>

      <p className="mt-6 text-center text-xs text-white/20">
        {lb.footerLine(selectedGameweek)}
      </p>
      </div>
    </div>
  );
}

function PageWash() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(42,38,34,0.85) 0%, transparent 55%), linear-gradient(180deg, #1a1816 0%, #100e0d 45%, #0a0908 100%)",
        }}
      />
    </div>
  );
}
