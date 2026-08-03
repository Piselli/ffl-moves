"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useSolanaWallet";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ClaimDialog } from "@/components/leaderboard/ClaimDialog";
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
  getTeamResult,
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
  fetchTourClaimHistoryFromApi,
  mergePriorClaimsIntoResults,
  ownerHasPriorClaimPrize,
  tourOwnersMatch,
} from "@/lib/tourClaimHistory";
import { getPrizeTiers } from "@/lib/prize-distribution";

const YOU_ROW_ID = "lb-you-row";

/**
 * Shipping gameweek leaderboard — home materials, table-first, stall expand.
 */
export function GameweekLeaderboardView() {
  const { account, connected, signAndSubmit } = useWallet();
  const lb = useSiteMessages().pages.leaderboard;
  const prize = usePrizeAsset();
  const [config, setConfig] = useState<ChainConfig | null>(null);
  const [pickerMaxGw, setPickerMaxGw] = useState(0);
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(
    null,
  );
  const [selectedGameweek, setSelectedGameweek] = useState<number>(0);
  const [leaderboardData, setLeaderboardData] = useState<TeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimPulse, setClaimPulse] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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
        const eplCurrent = isWorldCupTour(chainCurrent)
          ? highestId
          : chainCurrent;
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

  const fetchGameweekData = useCallback(async (gwId: number) => {
    if (gwId === 0) return;
    setIsLoading(true);
    setIsPreview(false);
    try {
      const gwData = await getGameweek(gwId);
      setCurrentGameweek(gwData);

      if (gwData && gwData.status === "resolved") {
        const addresses = await getGameweekEntrants(gwId);
        const [results, priorClaimed] = await Promise.all([
          Promise.all(addresses.map((addr) => getTeamResult(addr, gwId))),
          fetchTourClaimHistoryFromApi(gwId),
        ]);
        const validResults = mergePriorClaimsIntoResults(
          results.filter((r: TeamResult | null): r is TeamResult => r !== null),
          priorClaimed,
        );
        validResults.sort((a: TeamResult, b: TeamResult) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          if (b.finalPoints !== a.finalPoints)
            return b.finalPoints - a.finalPoints;
          return a.owner.localeCompare(b.owner);
        });
        setLeaderboardData(validResults);
      } else if (gwData && gwData.status === "closed") {
        const addresses = await getGameweekEntrants(gwId);
        if (addresses.length > 0) {
          const teams = await Promise.all(
            addresses.map((addr) => getUserTeam(addr, gwId)),
          );
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

  const runClaim = async (gameweekId: number) => {
    if (!connected || !account?.address) return;

    const alreadyPaid = await ownerHasPriorClaimPrize(
      gameweekId,
      account.address.toString(),
    );
    if (alreadyPaid) {
      setClaimError(lb.claimAlreadyPaid);
      setClaimOpen(false);
      await fetchGameweekData(gameweekId);
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    try {
      await signAndSubmit(await buildClaimPrize(account.address, gameweekId));
      setClaimOpen(false);
      setClaimPulse(true);
      window.setTimeout(() => setClaimPulse(false), 900);
      await fetchGameweekData(gameweekId);
    } catch (error: unknown) {
      setClaimError(lb.claimFail(formatTxError(error)));
    } finally {
      setIsClaiming(false);
    }
  };

  const userResult = account?.address
    ? leaderboardData.find((r) =>
        tourOwnersMatch(r.owner, account.address.toString()),
      )
    : null;

  const findMe = () => {
    document
      .getElementById(YOU_ROW_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const canClaim =
    Boolean(userResult) &&
    userResult!.prizeAmount > 0 &&
    !userResult!.claimed &&
    !isPreview &&
    currentGameweek?.status === "resolved";

  const prizeTiers =
    selectedGameweek > 0 ? getPrizeTiers(selectedGameweek) : [];

  const shellStyle = paletteToCssVars(LOCKER_PALETTE);

  if (isLoading) {
    return (
      <div
        className="relative min-h-[100dvh] bg-[#1a1816] text-white"
        style={shellStyle}
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
      style={shellStyle}
    >
      <PageWash />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-28">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
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
            <div className="flex items-center gap-2 rounded-full border border-white/12 bg-black/45 px-4 py-2 backdrop-blur-md">
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

        {isPreview && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3">
            <svg
              className="h-4 w-4 shrink-0 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Preview — Intermediate results. Scores will update as more matches
              are played. Claims available after final results are published.
            </p>
          </div>
        )}

        {/* Instrument strip */}
        {currentGameweek ? (
          <GlassPanel className="mb-5 !rounded-2xl px-5 py-4">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    currentGameweek.status === "open" &&
                      "animate-pulse bg-emerald-400 shadow-[0_0_6px_#34d399]",
                    currentGameweek.status === "closed" && "bg-amber-400",
                    currentGameweek.status === "resolved" && "bg-[#00f948]",
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-bold uppercase tracking-wide",
                    currentGameweek.status === "open" && "text-emerald-400",
                    currentGameweek.status === "closed" && "text-amber-400",
                    currentGameweek.status === "resolved" && "text-[#00f948]",
                  )}
                >
                  {currentGameweek.status === "open"
                    ? lb.statusOpen
                    : currentGameweek.status === "closed"
                      ? lb.statusClosed
                      : lb.statusResolved}
                </span>
              </div>

              <div className="h-5 w-px bg-white/[0.08]" />

              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {lb.poolLabel}
                </span>
                <span className="font-display text-xl font-black tabular-nums text-white">
                  {prize.formatUnits(currentGameweek.prizePool)}
                </span>
                <span className="text-xs text-white/30">{prize.symbol}</span>
              </div>

              <div className="h-5 w-px bg-white/[0.08]" />

              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  {lb.entriesLabel}
                </span>
                <span className="font-display text-xl font-black tabular-nums text-white">
                  {currentGameweek.totalEntries}
                </span>
              </div>

              <div className="relative ml-auto group/dist">
                <span className="cursor-default whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-white/25 underline decoration-dotted underline-offset-2 transition-colors hover:text-white/50">
                  {lb.prizeDistribution}
                </span>
                <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden w-44 group-hover/dist:block">
                  <div className="rounded-xl border border-white/10 bg-[#12100e] p-3 shadow-2xl">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
                      {lb.top10Receive}
                    </p>
                    <div className="space-y-1">
                      {prizeTiers.map(({ rank, pct }) => (
                        <div
                          key={rank}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[11px] text-white/30">
                            #{rank}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-white/55">
                            {pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel className="mb-5 !rounded-2xl p-5 text-center">
            <p className="text-sm text-white/30">
              {lb.noDataForGw(selectedGameweek)}
            </p>
          </GlassPanel>
        )}

        {/* Compact you strip */}
        {userResult ? (
          <GlassPanel
            className={cn(
              "mb-5 !rounded-2xl px-4 py-3",
              canClaim && "ring-[#00f948]/35",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                  {lb.myResultTitle(selectedGameweek)}
                </p>
                <span className="font-display text-lg font-black tabular-nums text-[#00f948]">
                  {userResult.rank > 0 ? `#${userResult.rank}` : "—"}
                </span>
                <span className="font-display text-lg font-black tabular-nums text-white">
                  {userResult.finalPoints}
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    pts
                  </span>
                </span>
                {userResult.prizeAmount > 0 ? (
                  <span className="font-display text-sm font-black tabular-nums text-white/70">
                    {prize.formatUnits(userResult.prizeAmount)} {prize.symbol}
                  </span>
                ) : null}
                {userResult.rank > 0 && userResult.rank <= 10 ? (
                  <span className="rounded-full border border-[#00f948]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00f948]/80">
                    {lb.inPrizes}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/my-result"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 transition hover:border-white/30 hover:text-white"
                >
                  {lb.detailsLink}
                </Link>
                {canClaim ? (
                  <button
                    type="button"
                    onClick={() => setClaimOpen(true)}
                    disabled={isClaiming}
                    className="rounded-full bg-[#00f948] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isClaiming ? lb.claiming : lb.claim}
                  </button>
                ) : null}
                {userResult.claimed && userResult.prizeAmount > 0 ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {lb.claimed}
                  </span>
                ) : null}
              </div>
            </div>
          </GlassPanel>
        ) : null}

        {claimError ? (
          <p className="mb-4 text-sm text-red-400/90">{claimError}</p>
        ) : null}

        {/* Board */}
        <GlassPanel className="overflow-x-auto !rounded-2xl">
          {leaderboardData.length > 0 ? (
            <LeaderboardTable
              results={leaderboardData}
              currentUser={account?.address?.toString()}
              gameweekId={selectedGameweek}
              isPreview={isPreview}
              youRowId={YOU_ROW_ID}
              claimPulse={claimPulse}
              stallExpand
              allowOwnSquadExpand
              showSquadView={
                currentGameweek?.status === "resolved" ||
                (currentGameweek?.status === "closed" && isPreview)
              }
              onClaimPrize={
                canClaim
                  ? () => setClaimOpen(true)
                  : undefined
              }
              isClaiming={isClaiming}
            />
          ) : (
            <div className="py-10 text-center">
              <h3 className="mb-1 font-display text-base font-black uppercase tracking-tight text-white">
                {lb.emptyTitle}
              </h3>
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
                href="/gameweek"
                className="inline-flex items-center gap-2 rounded-full border border-[#00f948]/25 bg-[#00f948]/10 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#00f948] transition hover:bg-[#00f948]/20"
              >
                {lb.registerSquadCta}
              </a>
            </div>
          )}
        </GlassPanel>

        <p className="mt-6 text-center text-xs text-white/20">
          {lb.footerLine(selectedGameweek)}
        </p>
      </div>

      <ClaimDialog
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        onConfirm={() => void runClaim(selectedGameweek)}
        claiming={isClaiming}
        title={lb.claim}
        description={lb.myResultTitle(selectedGameweek)}
        confirmLabel={isClaiming ? lb.claiming : lb.claim}
        amountLabel={
          userResult && userResult.prizeAmount > 0
            ? `${prize.formatUnits(userResult.prizeAmount)} ${prize.symbol}`
            : undefined
        }
      />
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
