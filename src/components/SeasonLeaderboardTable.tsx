"use client";

import { Fragment, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { formatSeasonEventLabel } from "@/lib/season-points-rules";
import type { SeasonLeaderboardEntry } from "@/lib/seasonPoints";

type Entry = Omit<SeasonLeaderboardEntry, "breakdown"> & {
  breakdown?: SeasonLeaderboardEntry["breakdown"];
};

interface SeasonLeaderboardTableProps {
  entries: Entry[];
  currentUser?: string | null;
  showBreakdown?: boolean;
  focusOwner?: string | null;
  pulseYou?: boolean;
  /** Tighter rows for single-screen rail layout */
  dense?: boolean;
  /** Hyperliquid-style terminal board — larger type, hover rows */
  variant?: "default" | "board";
  /** Pin pagination to panel bottom when paired with fill-height sidebar */
  fillHeight?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

function pageForRank(rank: number, pageSize: number) {
  return Math.floor((rank - 1) / pageSize);
}

const BOARD_ROW = "h-10 shrink-0";
/** Board grid — equal GWS / Top / Best columns. */
const BOARD_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_2.75rem_2.75rem_4rem] items-center gap-x-2 px-3";
const BOARD_STAT = "text-[15px]";
const BOARD_PLAYER = "text-[15px]";
const BOARD_XP = "text-xl";
const BOARD_HEAD =
  "text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 whitespace-nowrap";
const BOARD_FOOTER =
  "flex shrink-0 items-center justify-between gap-3 px-3 py-2.5";

function padBoardRows<T>(rows: T[], pageSize: number): (T | null)[] {
  const out: (T | null)[] = [...rows];
  while (out.length < pageSize) out.push(null);
  return out;
}

function BreakdownRow({
  slice,
  labels,
}: {
  slice: NonNullable<Entry["breakdown"]>[number];
  labels: {
    gw: (n: number) => string;
    registration: string;
    rank: string;
    streak: string;
    claim: string;
    first: string;
    noParticipation: string;
  };
}) {
  if (!slice.registered) {
    return (
      <div className="py-0.5 text-[11px] text-white/25">
        {labels.gw(slice.gameweekId)} — {labels.noParticipation}
      </div>
    );
  }
  const parts: string[] = [];
  if (slice.registration) parts.push(`${labels.registration} +${slice.registration}`);
  if (slice.firstRegistration) parts.push(`${labels.first} +${slice.firstRegistration}`);
  if (slice.rankPoints) parts.push(`${labels.rank} +${slice.rankPoints}`);
  if (slice.streak) parts.push(`${labels.streak} +${slice.streak}`);
  if (slice.claim) parts.push(`${labels.claim} +${slice.claim}`);

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-0.5 text-[11px]">
      <span className="text-white/40">{labels.gw(slice.gameweekId)}</span>
      <span className="min-w-0 flex-1 truncate text-white/25">{parts.join(" · ")}</span>
      <span className="tabular-nums text-white/55">+{slice.total}</span>
    </div>
  );
}

export function SeasonLeaderboardTable({
  entries,
  currentUser,
  showBreakdown = false,
  focusOwner = null,
  pulseYou = false,
  dense = false,
  variant = "default",
  fillHeight = false,
  page = 0,
  pageSize,
  onPageChange,
}: SeasonLeaderboardTableProps) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const { getNickname } = useNickname();
  const [expanded, setExpanded] = useState<string | null>(null);

  const paginated = pageSize != null && pageSize > 0;
  const totalPages = paginated ? pageCount(entries.length, pageSize) : 1;
  const safePage = paginated ? Math.min(Math.max(0, page), totalPages - 1) : 0;
  const visibleEntries = paginated
    ? entries.slice(safePage * pageSize!, safePage * pageSize! + pageSize!)
    : entries;
  const rangeFrom = paginated ? safePage * pageSize! + 1 : 1;
  const rangeTo = paginated
    ? Math.min(entries.length, (safePage + 1) * pageSize!)
    : entries.length;

  const board = variant === "board";
  const compact = dense && !board;

  useEffect(() => {
    if (focusOwner) setExpanded(focusOwner);
  }, [focusOwner]);

  const breakdownLabels = {
    gw: (id: number) => formatSeasonEventLabel(id),
    registration: m.breakdownRegistration,
    rank: m.breakdownRank,
    streak: m.breakdownStreak,
    claim: m.breakdownClaim,
    first: m.breakdownFirst,
    noParticipation: m.breakdownSkipped,
  };

  if (entries.length === 0) {
    return <p className="py-10 text-sm text-white/35">{m.emptyHint}</p>;
  }

  if (board) {
    const slots = paginated ? padBoardRows(visibleEntries, pageSize!) : visibleEntries.map((e) => e);
    let lastRowIndex = slots.length - 1;
    while (lastRowIndex > 0 && !slots[lastRowIndex]) lastRowIndex -= 1;

    return (
      <div className="flex min-h-0 flex-col">
        <div className={cn(BOARD_GRID, "shrink-0 border-b border-white/[0.08] py-2.5", BOARD_HEAD)}>
          <span>{m.colRank}</span>
          <span>{m.colPlayer}</span>
          <span className="text-right">{m.colRegistrations}</span>
          <span className="text-right">{m.colTop10}</span>
          <span className="text-right">{m.colBestRank}</span>
          <span className="text-right">{m.colPoints}</span>
        </div>

        <div className="flex min-h-0 flex-col">
          {slots.map((entry, i) => {
            const isLastRow = i === lastRowIndex;
            const rowBorder = !isLastRow && "border-b border-white/[0.06]";

            if (!entry) return null;

            const isMe =
              !!currentUser && currentUser.toLowerCase() === entry.owner.toLowerCase();
            const isOpen = expanded === entry.owner;
            const canExpand =
              showBreakdown && !!entry.breakdown && entry.breakdown.length > 0;

            return (
              <Fragment key={entry.owner}>
                <div
                  id={isMe ? "season-you" : undefined}
                  role={canExpand ? "button" : undefined}
                  tabIndex={canExpand ? 0 : undefined}
                  onClick={() => canExpand && setExpanded(isOpen ? null : entry.owner)}
                  onKeyDown={(e) => {
                    if (!canExpand) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpanded(isOpen ? null : entry.owner);
                    }
                  }}
                  className={cn(
                    BOARD_GRID,
                    BOARD_ROW,
                    rowBorder,
                    "transition-colors",
                    isMe && "bg-white/[0.04]",
                    pulseYou && isMe && "outline outline-1 -outline-offset-1 outline-[#00f948]/40",
                    canExpand && "cursor-pointer hover:bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      BOARD_STAT,
                      "font-medium tabular-nums text-white/50",
                      entry.rank <= 3 && "font-display text-xl font-black text-white/90",
                    )}
                  >
                    {entry.rank}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 truncate font-medium text-white/90",
                      BOARD_PLAYER,
                      isMe && "font-semibold text-white",
                    )}
                  >
                    {getNickname(entry.owner)}
                    {isMe ? (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        {m.youBadge}
                      </span>
                    ) : null}
                  </span>
                  <span className={cn("text-right tabular-nums text-white/50", BOARD_STAT)}>
                    {entry.registrations}
                  </span>
                  <span className={cn("text-right tabular-nums text-white/50", BOARD_STAT)}>
                    {entry.top10Finishes}
                  </span>
                  <span className={cn("text-right tabular-nums text-white/50", BOARD_STAT)}>
                    {entry.bestRank > 0 ? entry.bestRank : "—"}
                  </span>
                  <span
                    className={cn(
                      "text-right font-display font-black tabular-nums text-white",
                      BOARD_XP,
                    )}
                  >
                    {entry.totalPoints}
                  </span>
                </div>
                {isOpen && entry.breakdown ? (
                  <div className="border-b border-white/[0.06] bg-white/[0.015] px-3 py-2 pl-14">
                    <div className="space-y-0.5">
                      {entry.breakdown.map((slice) => (
                        <BreakdownRow
                          key={slice.gameweekId}
                          slice={slice}
                          labels={breakdownLabels}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>

        {paginated && onPageChange ? (
          <div className={BOARD_FOOTER}>
            <p className="text-xs tabular-nums text-white/40">
              {m.pageRange(rangeFrom, rangeTo, entries.length)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 0}
                onClick={() => onPageChange(safePage - 1)}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/55 transition enabled:hover:border-white/25 enabled:hover:bg-white/[0.04] enabled:hover:text-white/85 disabled:opacity-30"
              >
                {m.pagePrev}
              </button>
              <span className="min-w-[5rem] text-center text-xs tabular-nums text-white/45">
                {m.pageOf(safePage + 1, totalPages)}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => onPageChange(safePage + 1)}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/55 transition enabled:hover:border-white/25 enabled:hover:bg-white/[0.04] enabled:hover:text-white/85 disabled:opacity-30"
              >
                {m.pageNext}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", compact && fillHeight && "h-full flex-1")}>
      <div
        className={cn(
          "mb-0 hidden gap-4 px-2 sm:grid",
          board
            ? cn(
                "sticky top-0 z-[1] shrink-0 border-b border-white/[0.08] bg-[#0a0a0a]/95 md:grid grid-cols-[2.75rem_minmax(0,1fr)_4.5rem_3.25rem_3.25rem_3rem]",
                "py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40",
              )
            : cn(
                "mb-1 gap-3 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/25",
                compact
                  ? "shrink-0 grid-cols-[2rem_minmax(0,1fr)_3.5rem_2.5rem_2.5rem_2.25rem]"
                  : "grid-cols-[2.5rem_minmax(0,1fr)_4rem_3rem_3rem_2.75rem]",
              ),
        )}
      >
        <span>{m.colRank}</span>
        <span>{m.colPlayer}</span>
        <span className="text-right">{m.colPoints}</span>
        <span className={board ? "hidden text-right md:block" : "text-right"}>{m.colRegistrations}</span>
        <span className={board ? "hidden text-right md:block" : "text-right"}>{m.colTop10}</span>
        <span className={board ? "hidden text-right md:block" : "text-right"}>{m.colBestRank}</span>
      </div>

      <ul
        className={cn(
          board ? "divide-y divide-white/[0.06]" : "divide-y divide-white/[0.06] border-y border-white/[0.08]",
          compact && "min-h-0 flex-1 overflow-y-auto",
        )}
      >
        {visibleEntries.map((entry) => {
          const isMe =
            !!currentUser &&
            currentUser.toLowerCase() === entry.owner.toLowerCase();
          const isOpen = expanded === entry.owner;
          const canExpand =
            showBreakdown && !!entry.breakdown && entry.breakdown.length > 0;

          return (
            <li key={entry.owner} id={isMe ? "season-you" : undefined}>
              <button
                type="button"
                disabled={!canExpand}
                onClick={() =>
                  canExpand && setExpanded(isOpen ? null : entry.owner)
                }
                className={cn(
                  "w-full text-left transition-colors",
                  board && "flex h-11 items-center px-2",
                  !board && "px-1",
                  compact ? "py-2" : !board && "py-2.5",
                  isMe && (board ? "bg-white/[0.04]" : "bg-[#00f948]/[0.04]"),
                  pulseYou && isMe && "outline outline-1 outline-[#00f948]/40",
                  board && "hover:bg-white/[0.03]",
                  canExpand && "cursor-pointer",
                  !canExpand && "cursor-default",
                )}
              >
                <div
                  className={cn(
                    "grid items-center gap-4",
                    board
                      ? "grid-cols-[2.75rem_minmax(0,1fr)_4.5rem] md:grid-cols-[2.75rem_minmax(0,1fr)_4.5rem_3.25rem_3.25rem_3rem]"
                      : cn(
                          "items-baseline gap-3",
                          compact
                            ? "grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_3.5rem_2.5rem_2.5rem_2.25rem]"
                            : "grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_4rem_3rem_3rem_2.75rem]",
                        ),
                  )}
                >
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      board ? "text-sm text-white/50" : compact ? "text-[12px]" : "text-[13px]",
                      !board && entry.rank <= 3 ? "text-white/80" : !board && "text-white/35",
                      board && entry.rank <= 3 && "font-display text-base font-black text-white/90",
                    )}
                  >
                    {entry.rank}
                  </span>

                  <span
                    className={cn(
                      "truncate",
                      board ? "text-sm font-medium text-white/90" : compact ? "text-[12px]" : "text-[13px]",
                      isMe && (board ? "font-semibold text-white" : "font-semibold text-[#00f948]"),
                    )}
                  >
                    {getNickname(entry.owner)}
                    {isMe ? (
                      <span
                        className={cn(
                          "ml-2 text-[10px] font-bold uppercase tracking-wider",
                          board ? "text-white/40" : "text-[#00f948]/50",
                        )}
                      >
                        {m.youBadge}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className={cn(
                      "text-right tabular-nums",
                      board
                        ? "font-display text-base font-black text-white"
                        : cn("font-semibold", compact ? "text-[12px]" : "text-[13px]"),
                      !board && isMe && "text-[#00f948]",
                      !board && !isMe && "text-white/90",
                    )}
                  >
                    {entry.totalPoints}
                  </span>

                  <span
                    className={cn(
                      "text-right tabular-nums text-white/45",
                      board ? "hidden text-sm md:block" : cn("hidden sm:block", compact ? "text-[12px]" : "text-[13px]"),
                    )}
                  >
                    {entry.registrations}
                  </span>
                  <span
                    className={cn(
                      "text-right tabular-nums text-white/45",
                      board ? "hidden text-sm md:block" : cn("hidden sm:block", compact ? "text-[12px]" : "text-[13px]"),
                    )}
                  >
                    {entry.top10Finishes}
                  </span>
                  <span
                    className={cn(
                      "text-right tabular-nums text-white/45",
                      board ? "hidden text-sm md:block" : cn("hidden sm:block", compact ? "text-[12px]" : "text-[13px]"),
                    )}
                  >
                    {entry.bestRank > 0 ? entry.bestRank : "—"}
                  </span>
                </div>
              </button>

              {isOpen && entry.breakdown ? (
                <div className="space-y-0.5 border-t border-white/[0.04] bg-white/[0.015] px-1 py-2 pl-11">
                  {entry.breakdown.map((slice) => (
                    <BreakdownRow
                      key={slice.gameweekId}
                      slice={slice}
                      labels={breakdownLabels}
                    />
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {paginated && onPageChange ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] px-2 py-2.5",
          )}
        >
          <p className={cn("tabular-nums text-white/40", board ? "text-xs" : "text-[10px]")}>
            {m.pageRange(rangeFrom, rangeTo, entries.length)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => onPageChange(safePage - 1)}
              className={cn(
                "rounded-lg border border-white/12 font-bold uppercase tracking-wider text-white/55 transition enabled:hover:border-white/25 enabled:hover:bg-white/[0.04] enabled:hover:text-white/85 disabled:opacity-30",
                board ? "px-3 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]",
              )}
            >
              {m.pagePrev}
            </button>
            <span
              className={cn(
                "min-w-[5rem] text-center tabular-nums text-white/45",
                board ? "text-xs" : "text-[10px]",
              )}
            >
              {m.pageOf(safePage + 1, totalPages)}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => onPageChange(safePage + 1)}
              className={cn(
                "rounded-lg border border-white/12 font-bold uppercase tracking-wider text-white/55 transition enabled:hover:border-white/25 enabled:hover:bg-white/[0.04] enabled:hover:text-white/85 disabled:opacity-30",
                board ? "px-3 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]",
              )}
            >
              {m.pageNext}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { pageForRank };
