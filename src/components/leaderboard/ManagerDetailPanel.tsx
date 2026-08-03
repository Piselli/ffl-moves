"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RegisteredSquadShowcase } from "@/components/RegisteredSquadShowcase";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import type { Player, TeamResult } from "@/lib/types";
import type { ChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { cn } from "@/lib/utils";

type LoadedSquad = {
  starters: Player[];
  bench: Player[];
  chainResult: TeamResult | null;
  stats: Record<string, Record<string, unknown>>;
  breakdown: ChainAlignedXiBreakdown | null;
};

type Props = {
  open: boolean;
  nickname: string;
  rank: number;
  points: number;
  prizeLabel: string | null;
  isYou?: boolean;
  loading?: boolean;
  error?: boolean;
  squad: LoadedSquad | null;
  getPoints: (player: Player) => number;
  loadingLabel: string;
  errorLabel: string;
  emptyLabel: string;
  youLabel: string;
  startersHeading: string;
  benchLabel: string;
  scoresTitle: string;
  playerCol: string;
  pointsCol: string;
  xiTotalLabel: string;
  officialHint: string;
  posAbbrev: Record<string, string>;
  benchAbbrev: string;
  statsPending: string | null;
  chainAlignedCopy: {
    multiplierFooter: (factorLabel: string) => string;
    viaSub: (name: string, subPts?: number) => string;
  };
  onClose?: () => void;
  closeLabel?: string;
};

/**
 * Selected-manager detail — same Obsidian Glass product language as the homepage tablet.
 * Not a room / hang metaphor: a product surface that fills when you pick a row.
 */
export function ManagerDetailPanel({
  open,
  nickname,
  rank,
  points,
  prizeLabel,
  isYou,
  loading,
  error,
  squad,
  getPoints,
  loadingLabel,
  errorLabel,
  emptyLabel,
  youLabel,
  startersHeading,
  benchLabel,
  scoresTitle,
  playerCol,
  pointsCol,
  xiTotalLabel,
  officialHint,
  posAbbrev,
  benchAbbrev,
  statsPending,
  chainAlignedCopy,
  onClose,
  closeLabel = "Close",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {!open ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex h-full min-h-[22rem] items-center justify-center px-6 text-center"
        >
          <p className="max-w-[16rem] text-sm text-white/35">{emptyLabel}</p>
        </motion.div>
      ) : (
        <motion.div
          key={`${nickname}-${rank}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full min-h-0 flex-col"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
                  #{rank > 0 ? rank : "—"}
                </p>
                {isYou ? (
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#00f948]">
                    {youLabel}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1 truncate font-display text-2xl font-black uppercase tracking-tight text-white">
                {nickname}
              </h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <p className="font-display text-3xl font-black tabular-nums text-white">
                  {points}
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    pts
                  </span>
                </p>
                {prizeLabel ? (
                  <p className="text-sm font-semibold tabular-nums text-white/55">
                    {prizeLabel}
                  </p>
                ) : null}
              </div>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50 transition hover:border-white/30 hover:text-white active:scale-[0.98] lg:hidden"
              >
                {closeLabel}
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3" data-lt-scroll>
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                <p className="text-sm text-white/40">{loadingLabel}</p>
              </div>
            ) : error || !squad ? (
              <p className="py-16 text-center text-sm text-white/35">{errorLabel}</p>
            ) : (
              <RegisteredSquadShowcase
                starters={squad.starters}
                bench={squad.bench}
                gameweekStats={squad.stats}
                showScores={Object.keys(squad.stats).length > 0}
                statsPendingHint={
                  Object.keys(squad.stats).length === 0 ? statsPending : null
                }
                getPoints={getPoints}
                posAbbrev={posAbbrev}
                benchAbbrev={benchAbbrev}
                startersHeading={startersHeading}
                benchSectionLabel={benchLabel}
                scoresSidebarTitle={scoresTitle}
                playerColLabel={playerCol}
                pointsColLabel={pointsCol}
                xiTotalLabel={xiTotalLabel}
                officialTotalHint={officialHint}
                publishedTourTotal={points}
                officialResolved={
                  squad.chainResult && squad.breakdown
                    ? {
                        teamResult: squad.chainResult,
                        breakdown: squad.breakdown,
                      }
                    : null
                }
                interimBreakdown={
                  !squad.chainResult && squad.breakdown ? squad.breakdown : null
                }
                chainAlignedCopy={chainAlignedCopy}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DetailShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={cn("min-h-0 !rounded-2xl", className)}>
      {children}
    </GlassPanel>
  );
}
