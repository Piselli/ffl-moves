"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { formatSeasonEventLabel } from "@/lib/season-points-rules";
import type { SeasonLeaderboardEntry, SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import { CURRENT_SEASON } from "@/lib/season-points-rules";

export type SeasonEntry = SeasonLeaderboardEntry;

export type SeasonStandingsContext = {
  data: SeasonLeaderboardPayload;
  wallet: string | null;
  myEntry: SeasonEntry | null;
  focusOwner: string | null;
  pulseYou: boolean;
  onFindMe: () => void;
  isDemo?: boolean;
  displayName?: (owner: string) => string;
};

export function buildSeasonMetaBits(
  data: SeasonLeaderboardPayload,
  m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"],
): string[] {
  const bits: string[] = [];
  if (data.status === "ended") bits.push(m.endedBadge);
  if (data.active && data.resolvedEplThroughGw > 0) {
    if (data.eplEndGw > 0 && data.resolvedEplThroughGw >= data.eplStartGw) {
      bits.push(m.seasonWindowClosed(data.eplStartGw || 1, data.resolvedEplThroughGw));
    } else if (data.eplStartGw > 0) {
      bits.push(m.progressEpl(data.eplStartGw, data.resolvedEplThroughGw));
    } else {
      bits.push(m.progressEpl(1, data.resolvedEplThroughGw));
    }
  } else if (data.status === "live" && data.eventIds.length === 0) {
    bits.push(m.awaitingFirstEvent);
  }
  return bits;
}

export function deltaToLeader(entries: SeasonEntry[], entry: SeasonEntry): number | null {
  const leader = entries.find((e) => e.rank === 1);
  if (!leader || entry.rank === 1) return null;
  return leader.totalPoints - entry.totalPoints;
}

export function spToTop10(entries: SeasonEntry[], myEntry: SeasonEntry | null): number | null {
  if (!myEntry || myEntry.rank <= 10) return null;
  const tenth = entries.find((e) => e.rank === 10);
  if (!tenth) return null;
  return tenth.totalPoints - myEntry.totalPoints + 1;
}

export function seasonLabel(data: SeasonLeaderboardPayload | null, m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"]) {
  return m.seasonTag(data?.seasonLabel ?? CURRENT_SEASON.label);
}

export function getNeighborhoodEntries(
  entries: SeasonEntry[],
  myRank: number | null,
  radius = 7,
): SeasonEntry[] {
  if (!entries.length) return [];
  if (!myRank) return entries.slice(0, Math.min(entries.length, radius * 2 + 1));
  const idx = entries.findIndex((e) => e.rank === myRank);
  if (idx < 0) return entries.slice(0, Math.min(entries.length, radius * 2 + 1));
  const start = Math.max(0, idx - radius);
  const end = Math.min(entries.length, idx + radius + 1);
  return entries.slice(start, end);
}

export function deltaToRankAbove(entries: SeasonEntry[], entry: SeasonEntry): number | null {
  if (entry.rank <= 1) return null;
  const above = entries.find((e) => e.rank === entry.rank - 1);
  if (!above) return null;
  return above.totalPoints - entry.totalPoints;
}

const RANK_CHIP: Record<number, string> = {
  1: "bg-[#F5C24A] text-black",
  2: "bg-[#C6C6C6] text-black",
  3: "bg-[#CD7F32] text-white",
};

export function RankChip({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black tabular-nums",
        RANK_CHIP[rank] ?? "bg-white/[0.08] text-white/45",
        className,
      )}
    >
      {rank}
    </span>
  );
}

export function FaqIconLink({ className }: { className?: string }) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  return (
    <a
      href="/faq#scoring-and-rewards--season-points"
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-white/35 transition hover:bg-white/[0.06] hover:text-white/70",
        className,
      )}
      title={m.faqLink}
      aria-label={m.faqLink}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M9.5 9.5a2.5 2.5 0 115 0c0 1.5-2 1.5-2 3" />
        <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    </a>
  );
}

function BreakdownRow({
  slice,
  labels,
}: {
  slice: SeasonEntry["breakdown"][number];
  labels: ReturnType<typeof useBreakdownLabels>;
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

function useBreakdownLabels() {
  const m = useSiteMessages().pages.seasonLeaderboard;
  return {
    gw: (id: number) => formatSeasonEventLabel(id),
    registration: m.breakdownRegistration,
    rank: m.breakdownRank,
    streak: m.breakdownStreak,
    claim: m.breakdownClaim,
    first: m.breakdownFirst,
    noParticipation: m.breakdownSkipped,
  };
}

export function SeasonBreakdownList({ entry }: { entry: SeasonEntry }) {
  const labels = useBreakdownLabels();
  if (!entry.breakdown?.length) return null;
  return (
    <div className="space-y-0.5">
      {entry.breakdown.map((slice) => (
        <BreakdownRow key={slice.gameweekId} slice={slice} labels={labels} />
      ))}
    </div>
  );
}

export function ExpandableBreakdown({
  entry,
  open,
}: {
  entry: SeasonEntry;
  open: boolean;
}) {
  const labels = useBreakdownLabels();
  if (!open || !entry.breakdown?.length) return null;
  return (
    <div className="space-y-0.5 border-t border-white/[0.04] bg-black/40 px-3 py-2 sm:px-4">
      {entry.breakdown.map((slice) => (
        <BreakdownRow key={slice.gameweekId} slice={slice} labels={labels} />
      ))}
    </div>
  );
}

export function useExpandableRow(focusOwner: string | null) {
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (focusOwner) setExpanded(focusOwner);
  }, [focusOwner]);
  return { expanded, setExpanded, toggle: (owner: string) => setExpanded((p) => (p === owner ? null : owner)) };
}

export function PlayerName({
  owner,
  isMe,
  displayName,
}: {
  owner: string;
  isMe: boolean;
  displayName?: (owner: string) => string;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const { getNickname } = useNickname();
  const label = displayName ? displayName(owner) : getNickname(owner);
  return (
    <span className={cn("truncate", isMe ? "font-semibold text-[#00f948]" : "text-white/90")}>
      {label}
      {isMe ? (
        <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[#00f948]/50">
          {m.youBadge}
        </span>
      ) : null}
    </span>
  );
}

export function DemoBanner() {
  const m = useSiteMessages().pages.seasonLeaderboard;
  return (
    <p className="mb-4 border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] text-white/40">
      {m.demoBanner}
    </p>
  );
}

export type SeasonMilestone = {
  id: string;
  label: string;
  earned: boolean;
};

export function deriveMilestones(entry: SeasonEntry | null, m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"]): SeasonMilestone[] {
  const hasFirst = !!entry?.breakdown?.some((s) => s.firstRegistration > 0);
  return [
    { id: "first", label: m.milestoneFirstReg, earned: !!hasFirst },
    { id: "streak4", label: m.milestoneStreak4, earned: (entry?.maxStreak ?? 0) >= 4 },
    { id: "top10", label: m.milestoneTop10, earned: (entry?.top10Finishes ?? 0) > 0 },
    { id: "gw10", label: m.milestoneGw10, earned: (entry?.registrations ?? 0) >= 10 },
    { id: "podium", label: m.milestonePodium, earned: entry?.bestRank === 1 },
  ];
}
