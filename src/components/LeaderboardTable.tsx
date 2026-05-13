"use client";

import { TeamResult } from "@/lib/types";
import { formatMOVE, cn } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";

interface LeaderboardTableProps {
  results: (TeamResult & { owner: string })[];
  currentUser?: string;
}

const rankMedal: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const rankColor: Record<number, string> = {
  1: "text-[#FFD700] drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]",
  2: "text-[#E2E8F0] drop-shadow-[0_0_4px_rgba(226,232,240,0.4)]",
  3: "text-[#F59E0B] drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]",
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

export function LeaderboardTable({ results, currentUser }: LeaderboardTableProps) {
  const { getNickname } = useNickname();
  const lt = useSiteMessages().pages.leaderboardTable;

  const headRank = lt.colRank;
  const headMgr = lt.colManager;
  const headPts = lt.colPoints;

  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {(
              [
                { label: headRank, align: "left" as const, narrow: true },
                { label: headMgr, align: "left" as const, narrow: false },
                { label: headPts, align: "right" as const, narrow: false },
              ] as const
            ).map((h) => (
              <th
                key={h.label}
                className={cn(
                  "py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/30",
                  h.align === "left" && h.narrow ? "text-left w-12" : h.align === "left" ? "text-left" : "text-right"
                )}
              >
                {h.label}
              </th>
            ))}
            {/* Prize column with distribution tooltip */}
            <th className="py-3 px-4 text-right">
              <div className="inline-flex items-center gap-1.5 justify-end group/prize relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{lt.colPrize}</span>
                <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center cursor-default">
                  <span className="text-[8px] text-white/30 leading-none font-bold">?</span>
                </div>
                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 hidden group-hover/prize:block z-50 w-44">
                  <div className="bg-[#1a1d26] border border-white/10 rounded-xl p-3 shadow-2xl">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">{lt.fundSplit}</p>
                    <div className="space-y-1">
                      {[
                        { rank: "1", medal: "🥇", share: "30%", color: "text-[#FFD700]" },
                        { rank: "2", medal: "🥈", share: "20%", color: "text-[#E2E8F0]" },
                        { rank: "3", medal: "🥉", share: "15%", color: "text-[#F59E0B]" },
                        { rank: "4–5",  medal: null, share: "8% / 7%", color: "text-white/50" },
                        { rank: "6–8",  medal: null, share: "6% / 5% / 4%", color: "text-white/40" },
                        { rank: "9–10", medal: null, share: "3% / 2%", color: "text-white/30" },
                      ].map((p) => (
                        <div key={p.rank} className="flex items-center justify-between gap-2">
                          <span className="text-white/30 text-[10px]">
                            {p.medal ? p.medal : `#${p.rank}`}
                          </span>
                          <span className={cn("text-[11px] font-bold tabular-nums", p.color)}>{p.share}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </th>
            <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right whitespace-nowrap">
              {lt.colStatus}
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, idx) => {
            const isUser = currentUser === result.owner;
            const medal = rankMedal[result.rank];
            const rColor = rankColor[result.rank];
            const isTop3 = result.rank <= 3;
            const hasPrize = result.prizeAmount > 0;
            const claimedGlow = Boolean(result.claimed && hasPrize);

            return (
              <tr
                key={result.owner}
                className={cn(
                  "group transition-colors duration-200 border-b border-white/[0.05]",
                  claimedGlow &&
                    cn(
                      "relative bg-emerald-500/[0.09]",
                      /* inner edge + readable fill; outer ring/glow stays inside row padding visually */
                      "shadow-[inset_0_0_0_1px_rgba(74,222,128,0.42),inset_0_0_40px_-18px_rgba(0,249,72,0.07),0_0_26px_-6px_rgba(0,249,72,0.38)]",
                    ),
                  !claimedGlow &&
                    isUser &&
                    "bg-[#00f948]/[0.04] hover:bg-[#00f948]/[0.072]",
                  !claimedGlow &&
                    !isUser &&
                    "hover:bg-white/[0.035]",
                  /* slightly separate “card” rhythm like a dense leaderboard */
                  "last:border-b-0",
                )}
              >
                {/* Rank */}
                <td className="py-4 px-4 align-middle first:rounded-l-xl">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className={cn("font-display font-black text-base", rColor || "text-white/50")}>
                      {result.rank > 0 ? `#${result.rank}` : "—"}
                    </span>
                  )}
                </td>

                {/* Manager */}
                <td className="py-4 px-4 align-middle">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                        isTop3
                          ? "bg-gradient-to-br from-white/20 to-white/5 border border-white/15"
                          : "bg-white/[0.05] border border-white/[0.08]",
                      )}
                    >
                      {String(idx + 1)}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-mono text-sm font-medium truncate",
                          isUser ? "text-[#00f948]" : "text-white/85",
                        )}
                      >
                        {getNickname(result.owner)}
                      </p>
                      {isUser && (
                        <span className="text-[10px] font-bold text-[#00f948]/60 uppercase tracking-widest">
                          {lt.you}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4 text-right align-middle tabular-nums">
                  <span
                    className={cn(
                      "font-display font-black text-xl",
                      /* Top medals keep metallics; other ranks pick up warm “fantasy totals” accent */
                      isTop3
                        ? rColor || (isUser ? "text-[#00f948]" : "text-white")
                        : "text-[#fcd34d] drop-shadow-[0_0_12px_rgba(251,191,36,0.2)]",
                    )}
                  >
                    {result.finalPoints}
                  </span>
                </td>

                {/* Prize */}
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
                      {formatMOVE(result.prizeAmount)} MOVE
                    </span>
                  ) : (
                    <span className="text-white/20 text-sm">—</span>
                  )}
                </td>

                <td className="py-4 px-4 align-middle text-right whitespace-nowrap last:rounded-r-xl">
                  <StatusBadge
                    hasPrize={hasPrize}
                    claimed={result.claimed}
                    claimedLabel={lt.claimed}
                    notClaimedLabel={lt.notClaimed}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
