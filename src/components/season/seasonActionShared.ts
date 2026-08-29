import {
  SP_CLAIM_BONUS,
  SP_REGISTRATION,
  SP_TOP_RANK,
  streakBonusForLength,
} from "@/lib/season-points-rules";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import type { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  deltaToRankAbove,
  spToTop10,
  type SeasonEntry,
} from "./seasonStandingsShared";

export function computeNextEventId(data: SeasonLeaderboardPayload): number | null {
  if (data.status !== "live") return null;
  const start = data.eplStartGw > 0 ? data.eplStartGw : 1;
  const next = Math.max(start, data.resolvedEplThroughGw + 1);
  if (data.eplEndGw > 0 && next > data.eplEndGw) return null;
  return next;
}

export function computeNextGwUpside(myEntry: SeasonEntry | null) {
  const nextStreak = (myEntry?.currentStreak ?? 0) + 1;
  const streakBonus = streakBonusForLength(nextStreak);
  const reg = SP_REGISTRATION;
  const min = reg + streakBonus;
  const max = min + SP_TOP_RANK[1] + SP_CLAIM_BONUS;
  return {
    reg,
    streakBonus,
    nextStreak,
    min,
    max,
    top10Max: SP_TOP_RANK[1],
    claim: SP_CLAIM_BONUS,
  };
}

export function buildChaseLines(
  entries: SeasonEntry[],
  myEntry: SeasonEntry | null,
  m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"],
): string[] {
  if (!myEntry) return [];
  const lines: string[] = [];

  const gapTop10 = spToTop10(entries, myEntry);
  if (gapTop10 != null && gapTop10 > 0) {
    lines.push(m.actionChaseEarnZone(gapTop10));
  }

  const gapAbove = deltaToRankAbove(entries, myEntry);
  if (gapAbove != null && gapAbove > 0) {
    lines.push(m.actionChaseRankAbove(gapAbove, myEntry.rank - 1));
  }

  if (myEntry.currentStreak >= 2) {
    const bonus = streakBonusForLength(myEntry.currentStreak + 1);
    if (bonus > 0) {
      lines.push(m.actionChaseStreakAlive(myEntry.currentStreak, bonus));
    }
  } else if (myEntry.currentStreak === 1) {
    lines.push(m.actionChaseStreakStart);
  }

  return lines.slice(0, 3);
}

export type ChaseItem =
  | { kind: "top10"; sp: number }
  | { kind: "rankAbove"; sp: number; targetRank: number }
  | { kind: "streakAlive"; streak: number; bonus: number }
  | { kind: "streakStart" };

/** Structured chase targets for rail sidebar hierarchy. */
export function buildChaseItems(
  entries: SeasonEntry[],
  myEntry: SeasonEntry | null,
): ChaseItem[] {
  if (!myEntry) return [];
  const items: ChaseItem[] = [];

  const gapTop10 = spToTop10(entries, myEntry);
  if (gapTop10 != null && gapTop10 > 0) {
    items.push({ kind: "top10", sp: gapTop10 });
  }

  const gapAbove = deltaToRankAbove(entries, myEntry);
  if (gapAbove != null && gapAbove > 0) {
    items.push({ kind: "rankAbove", sp: gapAbove, targetRank: myEntry.rank - 1 });
  }

  if (myEntry.currentStreak >= 2) {
    const bonus = streakBonusForLength(myEntry.currentStreak + 1);
    if (bonus > 0) {
      items.push({ kind: "streakAlive", streak: myEntry.currentStreak, bonus });
    }
  } else if (myEntry.currentStreak === 1) {
    items.push({ kind: "streakStart" });
  }

  return items.slice(0, 3);
}

export const REGISTER_CTA_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#E5E5E6] px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[#08090a] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_0_0.5px_#23252a,0_2px_8px_rgba(0,0,0,0.35)] transition-[background-color,transform] duration-150 hover:bg-white active:scale-[0.97]";
