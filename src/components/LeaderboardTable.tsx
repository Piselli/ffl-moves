"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RegisteredSquadShowcase } from "@/components/RegisteredSquadShowcase";
import { XiStallExpand } from "@/components/leaderboard/XiStallExpand";
import { getUserTeam, getTeamResult, getGameweekStats } from "@/lib/chainClient";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { mergeFplCatalogForChainIds } from "@/lib/fplResolveMissing";
import { calculateFantasyPointsWithRating, enrichStatsMapWithFplPlayers } from "@/lib/scoring";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { FORMATION } from "@/lib/constants";
import { Player, TeamResult } from "@/lib/types";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { cn } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { DEFAULT_PRIZE_TIERS, getPrizeRankCount, getPrizeTiers } from "@/lib/prize-distribution";
import { tourOwnersMatch } from "@/lib/tourClaimHistory";

interface LeaderboardTableProps {
  results: (TeamResult & { owner: string })[];
  currentUser?: string;
  gameweekId?: number;
  isPreview?: boolean;
  /** When true, top-10 rows can expand to show full squad */
  showSquadView?: boolean;
  /** Player catalog endpoint for squad expansion (default `/api/players` = FPL/EPL). */
  catalogUrl?: string;
  /**
   * Use FPL-specific resolution for squad expansion (resolve missing ids via FPL and
   * enrich on-chain stats with FPL live). Off for non-EPL competitions (e.g. World Cup).
   */
  fplEnrichment?: boolean;
  /** When true, the connected wallet can expand its row even outside the top 10. */
  allowOwnSquadExpand?: boolean;
  /** When set, the connected user's unclaimed row shows a Claim button (resolved tours). */
  onClaimPrize?: () => void;
  isClaiming?: boolean;
  /** DOM id for the connected user's row — Find me. */
  youRowId?: string;
  /** One-shot pulse after successful claim. */
  claimPulse?: boolean;
  /** Homepage nameplate hang expand instead of pitch showcase. */
  stallExpand?: boolean;
}

type LoadedSquad = {
  starters: Player[];
  bench: Player[];
  chainResult: TeamResult | null;
  stats: Record<string, Record<string, unknown>>;
};

const rankColor: Record<number, string> = {
  1: "text-white",
  2: "text-white/90",
  3: "text-white/80",
};

function StatusBadge({
  hasPrize,
  claimed,
  claimedLabel,
  notClaimedLabel,
}: {
  hasPrize: boolean;
  claimed: boolean;
  claimedLabel: string;
  notClaimedLabel: string;
}) {
  if (!hasPrize) {
    return <span className="text-white/20 text-xs tabular-nums">—</span>;
  }

  if (claimed) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.55)]">
          <svg className="h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">{claimedLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.14]">
        <span className="text-[10px] font-black leading-none text-white/35 pb-px">−</span>
      </span>
      <span className="text-xs font-bold uppercase tracking-wide text-white/35">{notClaimedLabel}</span>
    </div>
  );
}

function SquadChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn("w-4 h-4 text-[#00f948]/70 transition-transform duration-200", open && "rotate-180")}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function LeaderboardTable({
  results,
  currentUser,
  gameweekId = 0,
  isPreview = false,
  showSquadView = false,
  catalogUrl = "/api/players",
  fplEnrichment = true,
  allowOwnSquadExpand = false,
  onClaimPrize,
  isClaiming = false,
  youRowId,
  claimPulse = false,
  stallExpand = false,
}: LeaderboardTableProps) {
  const siteMessages = useSiteMessages();
  const lt = siteMessages.pages.leaderboardTable;
  const lb = siteMessages.pages.leaderboard;
  const g = siteMessages.pages.gameweek;
  const mr = siteMessages.pages.myResult;
  const posAbbrev = siteMessages.positionAbbrev;
  const benchAbbrev = siteMessages.recap.benchAbbrev;
  const { getNickname } = useNickname();
  const prize = usePrizeAsset();

  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const [loadingOwner, setLoadingOwner] = useState<string | null>(null);
  const [loadErrorOwner, setLoadErrorOwner] = useState<string | null>(null);
  const squadCacheRef = useRef<Map<string, LoadedSquad>>(new Map());
  const [, bumpCache] = useState(0);

  useEffect(() => {
    setExpandedOwner(null);
    setLoadingOwner(null);
    setLoadErrorOwner(null);
    squadCacheRef.current.clear();
  }, [gameweekId, isPreview]);

  const colCount = showSquadView ? 6 : 5;
  const prizeRankCap = gameweekId > 0 ? getPrizeRankCount(gameweekId) : DEFAULT_PRIZE_TIERS.length;
  const prizeTiers = gameweekId > 0 ? getPrizeTiers(gameweekId) : DEFAULT_PRIZE_TIERS;

  const canExpandRow = (rank: number, owner: string) =>
    showSquadView &&
    gameweekId > 0 &&
    ((rank > 0 && rank <= prizeRankCap) ||
      (allowOwnSquadExpand && !!currentUser && tourOwnersMatch(owner, currentUser)));

  const loadSquad = useCallback(
    async (owner: string) => {
      if (squadCacheRef.current.has(owner)) return;

      setLoadingOwner(owner);
      setLoadErrorOwner(null);
      try {
        const [playersRes, chainTeam, chainResult] = await Promise.all([
          fetch(catalogUrl).then((r) => (r.ok ? r.json() : Promise.reject(new Error("players")))),
          getUserTeam(owner, gameweekId),
          isPreview ? Promise.resolve(null) : getTeamResult(owner, gameweekId),
        ]);

        if (!chainTeam?.playerIds?.length) throw new Error("no team");

        const catalog = new Map((playersRes as Player[]).map((p) => [p.id, p]));
        if (fplEnrichment) await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);

        const squad = squadPlayersFromChain(
          { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
          catalog,
        );
        if (squad.length !== FORMATION.TOTAL) throw new Error("incomplete squad");

        let stats: Record<string, Record<string, unknown>> = (await getGameweekStats(
          gameweekId,
          chainTeam.playerIds,
        )) as Record<string, Record<string, unknown>>;

        if (fplEnrichment) {
          try {
            const fpl = await fetch(`/api/fpl-live?gw=${gameweekId}`).then((r) =>
              r.ok ? r.json() : null,
            );
            if (fpl?.players) {
              stats = enrichStatsMapWithFplPlayers(
                stats as Record<string, unknown>,
                fpl.players,
              ) as Record<string, Record<string, unknown>>;
            }
          } catch {
            /* chain-only */
          }
        }

        squadCacheRef.current.set(owner, {
          starters: squad.slice(0, 11),
          bench: squad.slice(11),
          chainResult,
          stats,
        });
        bumpCache((n) => n + 1);
      } catch {
        setLoadErrorOwner(owner);
      } finally {
        setLoadingOwner(null);
      }
    },
    [gameweekId, isPreview, catalogUrl, fplEnrichment],
  );

  const toggleRow = useCallback(
    (owner: string, rank: number) => {
      if (!canExpandRow(rank, owner)) return;
      if (expandedOwner === owner) {
        setExpandedOwner(null);
        return;
      }
      setExpandedOwner(owner);
      void loadSquad(owner);
    },
    [expandedOwner, loadSquad, showSquadView, gameweekId, allowOwnSquadExpand, currentUser],
  );

  const chainAlignedCopy = {
    multiplierFooter: g.registeredMultiplierFooter,
    viaSub: g.registeredViaSub,
  };

  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {(
              [
                { label: lt.colRank, align: "left" as const, narrow: true },
                { label: lt.colManager, align: "left" as const, narrow: false },
                { label: lt.colPoints, align: "right" as const, narrow: false },
              ] as const
            ).map((h) => (
              <th
                key={h.label}
                className={cn(
                  "py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/30",
                  h.align === "left" && h.narrow ? "text-left w-12" : h.align === "left" ? "text-left" : "text-right",
                )}
              >
                {h.label}
              </th>
            ))}
            <th className="py-3 px-4 text-right">
              <div className="inline-flex items-center gap-1.5 justify-end group/prize relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lt.colPrize}</span>
                <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center cursor-default">
                  <span className="text-[8px] text-white/30 leading-none font-bold">?</span>
                </div>
                <div className="absolute right-0 top-full mt-2 hidden group-hover/prize:block z-50 w-44">
                  <div className="bg-[#1a1d26] border border-white/10 rounded-xl p-3 shadow-2xl">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">{lt.fundSplit}</p>
                    <div className="space-y-1">
                      {prizeTiers.map(({ rank, pct }) => {
                        return (
                          <div key={rank} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-white/30">#{rank}</span>
                            <span className="text-[11px] font-bold tabular-nums text-white/55">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right whitespace-nowrap">
              {lt.colStatus}
            </th>
            {showSquadView ? (
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right whitespace-nowrap w-28">
                {lt.colSquad}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {results.map((result) => {
            const isUser = !!currentUser && tourOwnersMatch(currentUser, result.owner);
            const rColor = rankColor[result.rank];
            const isTop3 = result.rank <= 3;
            const hasPrize = result.prizeAmount > 0;
            const claimedGlow = Boolean(result.claimed && hasPrize);
            const expandable = canExpandRow(result.rank, result.owner);
            const isOpen = expandedOwner === result.owner;
            const cached = squadCacheRef.current.get(result.owner);
            const isLoading = loadingOwner === result.owner;
            const pulseYou = claimPulse && isUser;

            return (
              <Fragment key={result.owner}>
                <motion.tr
                  id={isUser && youRowId ? youRowId : undefined}
                  onClick={expandable ? () => toggleRow(result.owner, result.rank) : undefined}
                  animate={
                    pulseYou
                      ? {
                          filter: [
                            "brightness(1)",
                            "brightness(1.35)",
                            "brightness(1)",
                          ],
                        }
                      : { filter: "brightness(1)" }
                  }
                  transition={pulseYou ? { duration: 0.75, ease: "easeOut" } : undefined}
                  className={cn(
                    "group border-b border-white/[0.06] transition-[background-color,box-shadow] duration-200",
                    expandable && "cursor-pointer",
                    isOpen && expandable && "bg-white/[0.04]",
                    isUser &&
                      !isOpen &&
                      "bg-[#00f948]/[0.05] shadow-[inset_3px_0_0_0_#00f948]",
                    claimedGlow &&
                      !isOpen &&
                      !isUser &&
                      "bg-emerald-500/[0.06] shadow-[inset_0_0_0_1px_rgba(74,222,128,0.28)]",
                    !isOpen && !isUser && expandable && "hover:bg-white/[0.035]",
                    !isOpen && !isUser && !expandable && "hover:bg-white/[0.025]",
                    // Raycast-like pressed key on hover
                    expandable &&
                      !isOpen &&
                      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.35)]",
                  )}
                >
                  <td className="py-3.5 px-4 align-middle first:rounded-l-xl">
                    <span
                      className={cn(
                        "font-display text-base font-black tabular-nums",
                        isUser
                          ? "text-[#00f948]"
                          : rColor || "text-white/45",
                        isTop3 && !isUser && "text-lg",
                      )}
                    >
                      {result.rank > 0 ? result.rank : "—"}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 align-middle">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate font-display text-sm font-bold uppercase tracking-wide",
                          isUser ? "text-[#00f948]" : "text-white/85",
                        )}
                      >
                        {getNickname(result.owner)}
                      </p>
                      {isUser ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/60">
                          {lt.you}
                        </span>
                      ) : expandable ? (
                        <span className="text-[10px] text-white/30">{lt.viewSquadHint}</span>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right align-middle tabular-nums">
                    <span
                      className={cn(
                        "font-display text-xl font-black",
                        isUser ? "text-[#00f948]" : "text-white",
                      )}
                    >
                      {result.finalPoints}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right align-middle whitespace-nowrap">
                    {hasPrize ? (
                      <span
                        className={cn(
                          "font-display font-black text-sm tabular-nums",
                          result.claimed
                            ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.35)]"
                            : "text-white/72",
                        )}
                      >
                        {prize.formatLabel(result.prizeAmount)}
                      </span>
                    ) : (
                      <span className="text-white/20 text-sm">—</span>
                    )}
                  </td>

                  <td className={cn("py-4 px-4 align-middle text-right whitespace-nowrap", !showSquadView && "last:rounded-r-xl")}>
                    {isUser && hasPrize && !result.claimed && !isPreview && onClaimPrize ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClaimPrize();
                        }}
                        disabled={isClaiming}
                        className="inline-flex min-w-[5.5rem] items-center justify-center rounded-full bg-[#00f948] px-3 py-2 font-display text-[10px] font-black uppercase tracking-wide text-black transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isClaiming ? lb.claiming : lb.claim}
                      </button>
                    ) : (
                      <StatusBadge
                        hasPrize={hasPrize}
                        claimed={result.claimed}
                        claimedLabel={lt.claimed}
                        notClaimedLabel={lt.notClaimed}
                      />
                    )}
                  </td>

                  {showSquadView ? (
                    <td className="py-4 px-4 align-middle text-right whitespace-nowrap last:rounded-r-xl">
                      {expandable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(result.owner, result.rank);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
                            isOpen ? "text-[#00f948]" : "text-white/40 group-hover:text-[#00f948]/70",
                          )}
                          aria-expanded={isOpen}
                        >
                          <span>{isOpen ? lt.hideSquad : lt.viewSquad}</span>
                          <SquadChevron open={isOpen} />
                        </button>
                      ) : (
                        <span className="text-white/15 text-xs">—</span>
                      )}
                    </td>
                  ) : null}
                </motion.tr>

                {isOpen && expandable ? (
                  <tr className="border-b border-white/[0.06]">
                    <td colSpan={colCount} className="bg-black/30 p-0">
                      <div className="border-t border-white/10">
                        {stallExpand ? (
                          <XiStallExpand
                            nickname={getNickname(result.owner)}
                            rank={result.rank}
                            totalPts={result.finalPoints}
                            starters={cached?.starters ?? []}
                            bench={cached?.bench ?? []}
                            getPoints={(player) => {
                              if (!cached) return 0;
                              const stats =
                                cached.stats[player.id] ??
                                cached.stats[String(player.id)];
                              return calculateFantasyPointsWithRating(
                                player,
                                stats as Record<string, unknown>,
                              );
                            }}
                            showScores={Boolean(
                              cached && Object.keys(cached.stats).length > 0,
                            )}
                            loading={isLoading}
                            loadingLabel={lt.squadLoading}
                            error={
                              !isLoading &&
                              (loadErrorOwner === result.owner || !cached)
                            }
                            errorLabel={lt.squadLoadError}
                            benchLabel={g.benchSection}
                            xiTotalLabel={g.registeredXiTotalLabel}
                          />
                        ) : isLoading ? (
                          <div className="flex items-center justify-center gap-3 py-10">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00f948]/50 border-t-transparent" />
                            <p className="text-sm text-white/35">{lt.squadLoading}</p>
                          </div>
                        ) : loadErrorOwner === result.owner || !cached ? (
                          <p className="py-8 text-center text-sm text-white/30">
                            {lt.squadLoadError}
                          </p>
                        ) : (
                          (() => {
                            const officialResolved =
                              cached.chainResult != null
                                ? {
                                    teamResult: cached.chainResult,
                                    breakdown: computeChainAlignedXiBreakdown(
                                      cached.starters,
                                      cached.bench,
                                      cached.stats,
                                    ),
                                  }
                                : null;
                            const interimBreakdown =
                              cached.chainResult == null &&
                              Object.keys(cached.stats).length > 0
                                ? computeChainAlignedXiBreakdown(
                                    cached.starters,
                                    cached.bench,
                                    cached.stats,
                                  )
                                : null;
                            const hasStats = Object.keys(cached.stats).length > 0;
                            const getPoints = (player: Player) => {
                              const stats =
                                cached.stats[player.id] ??
                                cached.stats[String(player.id)];
                              return calculateFantasyPointsWithRating(
                                player,
                                stats as Record<string, unknown>,
                              );
                            };

                            return (
                              <div className="px-2 py-4 sm:px-4">
                                <RegisteredSquadShowcase
                                  starters={cached.starters}
                                  bench={cached.bench}
                                  gameweekStats={cached.stats}
                                  showScores={hasStats}
                                  statsPendingHint={
                                    !hasStats ? mr.statsPending : null
                                  }
                                  getPoints={getPoints}
                                  posAbbrev={posAbbrev}
                                  benchAbbrev={benchAbbrev}
                                  startersHeading={g.startersSection}
                                  benchSectionLabel={g.benchSection}
                                  scoresSidebarTitle={g.registeredScoresTitle}
                                  playerColLabel={g.registeredPlayerCol}
                                  pointsColLabel={lt.colPoints}
                                  xiTotalLabel={g.registeredXiTotalLabel}
                                  officialTotalHint={g.registeredOfficialTotalHint}
                                  publishedTourTotal={result.finalPoints}
                                  officialResolved={officialResolved}
                                  interimBreakdown={interimBreakdown}
                                  chainAlignedCopy={chainAlignedCopy}
                                />
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
