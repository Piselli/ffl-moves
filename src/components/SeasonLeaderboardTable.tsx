"use client";

import { useState } from "react";
import { cn, shortenAddress } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { formatSeasonEventLabel } from "@/lib/season-points-rules";
import type { SeasonLeaderboardEntry } from "@/lib/seasonPoints";

const rankMedal: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const rankColor: Record<number, string> = {
  1: "text-[#FFD700] drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]",
  2: "text-[#E2E8F0] drop-shadow-[0_0_4px_rgba(226,232,240,0.4)]",
  3: "text-[#F59E0B] drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]",
};

type Entry = Omit<SeasonLeaderboardEntry, "breakdown"> & {
  breakdown?: SeasonLeaderboardEntry["breakdown"];
};

interface SeasonLeaderboardTableProps {
  entries: Entry[];
  currentUser?: string;
  showBreakdown?: boolean;
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
    total: string;
    noParticipation: string;
  };
}) {
  if (!slice.registered) {
    return (
      <div className="text-xs text-white/30 py-1">
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
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs font-semibold text-white/50">{labels.gw(slice.gameweekId)}</span>
      <span className="text-xs text-white/40">{parts.join(" · ")}</span>
      <span className="text-xs font-bold text-[#00f948]/80 tabular-nums">+{slice.total}</span>
    </div>
  );
}

export function SeasonLeaderboardTable({
  entries,
  currentUser,
  showBreakdown = false,
}: SeasonLeaderboardTableProps) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const { getNickname } = useNickname();
  const [expanded, setExpanded] = useState<string | null>(null);

  const breakdownLabels = {
    gw: (id: number) => formatSeasonEventLabel(id),
    registration: m.breakdownRegistration,
    rank: m.breakdownRank,
    streak: m.breakdownStreak,
    claim: m.breakdownClaim,
    first: m.breakdownFirst,
    total: m.colPoints,
    noParticipation: m.breakdownSkipped,
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-12 text-center">
        <p className="text-white/50 text-sm">{m.emptyTitle}</p>
        <p className="text-white/30 text-xs mt-2 max-w-md mx-auto">{m.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl overflow-hidden">
      <div className="hidden sm:grid grid-cols-[3rem_1fr_5rem_4rem_4rem_4rem] gap-3 px-5 py-3 border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-white/30">
        <span>{m.colRank}</span>
        <span>{m.colPlayer}</span>
        <span className="text-right">{m.colPoints}</span>
        <span className="text-right">{m.colRegistrations}</span>
        <span className="text-right">{m.colTop10}</span>
        <span className="text-right">{m.colBestRank}</span>
      </div>

      <ul>
        {entries.map((entry) => {
          const isMe = currentUser?.toLowerCase() === entry.owner.toLowerCase();
          const isOpen = expanded === entry.owner;
          const canExpand = showBreakdown && entry.breakdown && entry.breakdown.length > 0;

          return (
            <li key={entry.owner}>
              <button
                type="button"
                disabled={!canExpand}
                onClick={() => canExpand && setExpanded(isOpen ? null : entry.owner)}
                className={cn(
                  "w-full text-left px-5 py-3.5 border-b border-white/[0.04] transition-colors",
                  isMe && "bg-[#00f948]/[0.06]",
                  canExpand && "hover:bg-white/[0.03] cursor-pointer",
                  !canExpand && "cursor-default",
                )}
              >
                <div className="grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_5rem_4rem_4rem_4rem] gap-3 items-center">
                  <span
                    className={cn(
                      "text-sm font-black tabular-nums",
                      rankColor[entry.rank] ?? "text-white/60",
                    )}
                  >
                    {rankMedal[entry.rank] ?? entry.rank}
                  </span>

                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold truncate", isMe ? "text-[#00f948]" : "text-white")}>
                      {getNickname(entry.owner)}
                      {isMe && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[#00f948]/60">
                          {m.youBadge}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-white/25 font-mono truncate sm:hidden">
                      {shortenAddress(entry.owner)}
                    </p>
                  </div>

                  <span className="text-right text-base font-black text-[#00f948] tabular-nums sm:col-auto">
                    {entry.totalPoints}
                    <span className="text-[10px] font-bold text-[#00f948]/50 ml-0.5">SP</span>
                  </span>

                  <span className="hidden sm:block text-right text-sm text-white/50 tabular-nums">
                    {entry.registrations}
                  </span>
                  <span className="hidden sm:block text-right text-sm text-white/50 tabular-nums">
                    {entry.top10Finishes}
                  </span>
                  <span className="hidden sm:block text-right text-sm text-white/50 tabular-nums">
                    {entry.bestRank > 0 ? entry.bestRank : "—"}
                  </span>
                </div>

                <div className="sm:hidden flex gap-4 mt-1 text-[10px] text-white/35">
                  <span>{m.colRegistrations}: {entry.registrations}</span>
                  <span>{m.colTop10}: {entry.top10Finishes}</span>
                  <span>{m.colBestRank}: {entry.bestRank > 0 ? entry.bestRank : "—"}</span>
                </div>
              </button>

              {isOpen && entry.breakdown && (
                <div className="px-5 pb-4 pt-1 bg-black/20 border-b border-white/[0.04]">
                  {entry.breakdown.map((slice) => (
                    <BreakdownRow key={slice.gameweekId} slice={slice} labels={breakdownLabels} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
