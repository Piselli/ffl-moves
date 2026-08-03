"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useSolanaWallet";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ClaimDialog } from "@/components/leaderboard/ClaimDialog";
import {
  DetailShell,
  ManagerDetailPanel,
} from "@/components/leaderboard/ManagerDetailPanel";
import { useManagerSquad } from "@/components/leaderboard/useManagerSquad";
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
import { useNickname } from "@/hooks/useNickname";
import {
  fetchTourClaimHistoryFromApi,
  mergePriorClaimsIntoResults,
  ownerHasPriorClaimPrize,
  tourOwnersMatch,
} from "@/lib/tourClaimHistory";
import { getPrizeTiers } from "@/lib/prize-distribution";

const YOU_ROW_ID = "lb-you-row";

/**
 * Gameweek leaderboard as product desk — Obsidian Glass materials from home,
 * not the locker room scene. Table primary; select a manager → XI detail.
 */
export function GameweekLeaderboardView() {
  const { account, connected, signAndSubmit } = useWallet();
  const lb = useSiteMessages().pages.leaderboard;
  const lt = useSiteMessages().pages.leaderboardTable;
  const g = useSiteMessages().pages.gameweek;
  const mr = useSiteMessages().pages.myResult;
  const posAbbrev = useSiteMessages().positionAbbrev;
  const benchAbbrev = useSiteMessages().recap.benchAbbrev;
  const prize = usePrizeAsset();
  const { getNickname } = useNickname();

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
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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
    setSelectedOwner(null);
    setMobileDetailOpen(false);
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

  const userResult = account?.address
    ? leaderboardData.find((r) =>
        tourOwnersMatch(r.owner, account.address.toString()),
      )
    : null;

  // Default selection: you, else #1 — detail pane always has a job on desktop
  useEffect(() => {
    if (selectedOwner || leaderboardData.length === 0) return;
    if (userResult) {
      setSelectedOwner(userResult.owner);
      return;
    }
    setSelectedOwner(leaderboardData[0].owner);
  }, [leaderboardData, selectedOwner, userResult]);

  const selectedResult = useMemo(() => {
    if (!selectedOwner) return null;
    return (
      leaderboardData.find((r) => tourOwnersMatch(r.owner, selectedOwner)) ??
      null
    );
  }, [leaderboardData, selectedOwner]);

  const canShowSquad =
    currentGameweek?.status === "resolved" ||
    (currentGameweek?.status === "closed" && isPreview);

  const { squad, loading: squadLoading, error: squadError, getPoints } =
    useManagerSquad(
      selectedOwner,
      selectedGameweek,
      isPreview,
      Boolean(canShowSquad && selectedOwner),
    );

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

  const findMe = () => {
    if (userResult) {
      setSelectedOwner(userResult.owner);
      setMobileDetailOpen(true);
    }
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

  const handleSelectOwner = (owner: string) => {
    setSelectedOwner(owner);
    setMobileDetailOpen(true);
  };

  const gapToFirst =
    userResult && leaderboardData[0]
      ? Math.max(0, leaderboardData[0].finalPoints - userResult.finalPoints)
      : null;

  const chainAlignedCopy = {
    multiplierFooter: g.registeredMultiplierFooter,
    viaSub: g.registeredViaSub,
  };

  const detailPanel = (
    <ManagerDetailPanel
      open={Boolean(selectedResult && canShowSquad)}
      nickname={
        selectedResult ? getNickname(selectedResult.owner) : ""
      }
      rank={selectedResult?.rank ?? 0}
      points={selectedResult?.finalPoints ?? 0}
      prizeLabel={
        selectedResult && selectedResult.prizeAmount > 0
          ? prize.formatLabel(selectedResult.prizeAmount)
          : null
      }
      isYou={Boolean(
        selectedResult &&
          account?.address &&
          tourOwnersMatch(selectedResult.owner, account.address.toString()),
      )}
      loading={squadLoading}
      error={squadError}
      squad={
        squad
          ? {
              starters: squad.starters,
              bench: squad.bench,
              chainResult: squad.chainResult,
              stats: squad.stats,
              breakdown: squad.breakdown,
            }
          : null
      }
      getPoints={getPoints}
      loadingLabel={lt.squadLoading}
      errorLabel={lt.squadLoadError}
      emptyLabel={
        canShowSquad
          ? lt.viewSquadHint
          : lb.emptyNotPublished(selectedGameweek)
      }
      youLabel={lt.you}
      startersHeading={g.startersSection}
      benchLabel={g.benchSection}
      scoresTitle={g.registeredScoresTitle}
      playerCol={g.registeredPlayerCol}
      pointsCol={lt.colPoints}
      xiTotalLabel={g.registeredXiTotalLabel}
      officialHint={g.registeredOfficialTotalHint}
      posAbbrev={posAbbrev}
      benchAbbrev={benchAbbrev}
      statsPending={mr.statsPending}
      chainAlignedCopy={chainAlignedCopy}
      onClose={() => setMobileDetailOpen(false)}
      closeLabel={lt.hideSquad}
    />
  );

  if (isLoading) {
    return (
      <div
        className="relative min-h-[100dvh] bg-[#1a1816] text-white"
        style={shellStyle}
      >
        <PageWash />
        <div className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-center px-4 pb-12 pt-24">
          <GlassPanel className="!rounded-2xl px-14 py-14 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/35 border-t-transparent" />
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
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 pb-14 pt-24 sm:px-6">
        {/* Masthead */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              MoveMatch
            </p>
            <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight text-white">
              {lb.pageTitle}
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-white/40">
              {lb.seasonTag} · {lt.viewSquadHint}
            </p>
          </div>

          <div className="mb-1 flex flex-wrap items-center gap-2">
            {userResult ? (
              <button
                type="button"
                onClick={findMe}
                className="rounded-md border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/30 hover:text-white active:scale-[0.98]"
              >
                Find me
              </button>
            ) : null}
            <div className="flex items-center gap-2 rounded-md border border-white/12 bg-black/45 px-4 py-2 backdrop-blur-md">
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
                  <option key={gw} value={gw} className="bg-[#12100e]">
                    {gw}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isPreview && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Preview — Intermediate results. Scores will update as more matches
              are played. Claims available after final results are published.
            </p>
          </div>
        )}

        {/* Instrument strip */}
        {currentGameweek ? (
          <GlassPanel className="mb-5 !rounded-xl !p-0 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-white/[0.08] sm:grid-cols-4">
              <StripCell
                label={lb.gwLabel}
                value={`GW${selectedGameweek}`}
              />
              <StripCell
                label={lb.entriesLabel}
                value={String(currentGameweek.totalEntries)}
              />
              <StripCell
                label={lb.poolLabel}
                value={prize.formatUnits(currentGameweek.prizePool)}
                suffix={prize.symbol}
              />
              <div className="px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Status
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      currentGameweek.status === "open" && "bg-white/50",
                      currentGameweek.status === "closed" && "bg-amber-400",
                      currentGameweek.status === "resolved" && "bg-[#00f948]",
                    )}
                  />
                  <span className="font-display text-lg font-black uppercase tracking-tight text-white">
                    {currentGameweek.status === "open"
                      ? lb.statusOpen
                      : currentGameweek.status === "closed"
                        ? lb.statusClosed
                        : lb.statusResolved}
                  </span>
                </div>
                {prizeTiers.length > 0 ? (
                  <div className="relative mt-1 group/dist inline-block">
                    <span className="cursor-default text-[10px] font-bold uppercase tracking-widest text-white/25 underline decoration-dotted underline-offset-2 transition-colors hover:text-white/50">
                      {lb.prizeDistribution}
                    </span>
                    <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-44 group-hover/dist:block">
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
                ) : null}
              </div>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel className="mb-5 !rounded-xl p-5 text-center">
            <p className="text-sm text-white/30">
              {lb.noDataForGw(selectedGameweek)}
            </p>
          </GlassPanel>
        )}

        {/* You strip */}
        {userResult ? (
          <div
            className={cn(
              "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
              canClaim
                ? "border-[#00f948]/30 bg-[#00f948]/[0.06]"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                {lb.myResultTitle(selectedGameweek)}
              </p>
              <span
                className={cn(
                  "font-display text-lg font-black tabular-nums",
                  canClaim ? "text-[#00f948]" : "text-white",
                )}
              >
                {userResult.rank > 0 ? `#${userResult.rank}` : "—"}
              </span>
              <span className="font-display text-lg font-black tabular-nums text-white">
                {userResult.finalPoints}
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  pts
                </span>
              </span>
              {gapToFirst != null && gapToFirst > 0 ? (
                <span className="text-xs text-white/35">
                  −{gapToFirst} to #1
                </span>
              ) : gapToFirst === 0 && userResult.rank === 1 ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00f948]/80">
                  Leading
                </span>
              ) : null}
              {userResult.prizeAmount > 0 ? (
                <span className="font-display text-sm font-black tabular-nums text-white/70">
                  {prize.formatUnits(userResult.prizeAmount)} {prize.symbol}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/my-result"
                className="rounded-md border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 transition hover:border-white/30 hover:text-white"
              >
                {lb.detailsLink}
              </Link>
              {canClaim ? (
                <button
                  type="button"
                  onClick={() => setClaimOpen(true)}
                  disabled={isClaiming}
                  className="rounded-md bg-[#00f948] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  {isClaiming ? lb.claiming : lb.claim}
                </button>
              ) : null}
              {userResult.claimed && userResult.prizeAmount > 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {lb.claimed}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {claimError ? (
          <p className="mb-4 text-sm text-red-400/90">{claimError}</p>
        ) : null}

        {/* Two-pane desk */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
          <GlassPanel className="overflow-x-auto !rounded-2xl">
            {leaderboardData.length > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
                  <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                    Standings
                  </h2>
                  {canShowSquad ? (
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                      {lt.viewSquadHint}
                    </p>
                  ) : null}
                </div>
                <LeaderboardTable
                  results={leaderboardData}
                  currentUser={account?.address?.toString()}
                  gameweekId={selectedGameweek}
                  isPreview={isPreview}
                  youRowId={YOU_ROW_ID}
                  claimPulse={claimPulse}
                  deskMode
                  selectedOwner={selectedOwner}
                  onSelectOwner={handleSelectOwner}
                  allowOwnSquadExpand
                  showSquadView={canShowSquad}
                  onClaimPrize={
                    canClaim ? () => setClaimOpen(true) : undefined
                  }
                  isClaiming={isClaiming}
                />
              </>
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
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.06] px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/[0.1]"
                >
                  {lb.registerSquadCta}
                </a>
              </div>
            )}
          </GlassPanel>

          {/* Desktop detail */}
          <aside className="hidden lg:block lg:sticky lg:top-6">
            <DetailShell className="min-h-[28rem] max-h-[calc(100dvh-5rem)]">
              {detailPanel}
            </DetailShell>
          </aside>
        </div>

        {/* Mobile detail sheet */}
        {mobileDetailOpen && selectedResult && canShowSquad ? (
          <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileDetailOpen(false)}
            />
            <DetailShell className="relative z-10 max-h-[85dvh] !rounded-b-none !rounded-t-2xl">
              {detailPanel}
            </DetailShell>
          </div>
        ) : null}

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

function StripCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="px-4 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-black tabular-nums tracking-tight text-white">
        {value}
        {suffix ? (
          <span className="ml-1 text-xs font-semibold text-white/30">
            {suffix}
          </span>
        ) : null}
      </p>
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
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(42,38,34,0.75) 0%, transparent 55%), linear-gradient(180deg, #1a1816 0%, #100e0d 45%, #0a0908 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
