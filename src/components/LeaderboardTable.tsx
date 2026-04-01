"use client";

import { TeamResult } from "@/lib/types";
import { shortenAddress, formatMOVE } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useNickname } from "@/hooks/useNickname";

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

export function LeaderboardTable({ results, currentUser }: LeaderboardTableProps) {
  const { getNickname } = useNickname();

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {(["#", "Менеджер", "Очки"] as const).map((h) => (
              <th
                key={h}
                className={cn(
                  "py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/30",
                  h === "#" ? "text-left w-12" : h === "Менеджер" ? "text-left" : "text-right"
                )}
              >
                {h}
              </th>
            ))}
            {/* Prize column with distribution tooltip */}
            <th className="py-3 px-4 text-right">
              <div className="inline-flex items-center gap-1.5 justify-end group/prize relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Приз</span>
                <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center cursor-default">
                  <span className="text-[8px] text-white/30 leading-none font-bold">?</span>
                </div>
                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 hidden group-hover/prize:block z-50 w-44">
                  <div className="bg-[#1a1d26] border border-white/10 rounded-xl p-3 shadow-2xl">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Розподіл фонду</p>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {results.map((result, idx) => {
            const isUser = currentUser === result.owner;
            const medal = rankMedal[result.rank];
            const rColor = rankColor[result.rank];
            const isTop3 = result.rank <= 3;

            return (
              <tr
                key={result.owner}
                className={cn(
                  "group transition-colors duration-150",
                  isUser
                    ? "bg-[#00C46A]/[0.04] hover:bg-[#00C46A]/[0.07]"
                    : "hover:bg-white/[0.03]"
                )}
              >
                {/* Rank */}
                <td className="py-4 px-4">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className={cn("font-display font-black text-base", rColor || "text-white/50")}>
                      {result.rank > 0 ? `#${result.rank}` : "—"}
                    </span>
                  )}
                </td>

                {/* Manager */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                      isTop3
                        ? "bg-gradient-to-br from-white/20 to-white/5 border border-white/15"
                        : "bg-white/[0.05] border border-white/[0.08]"
                    )}>
                      {String(idx + 1)}
                    </div>
                    <div>
                      <p className={cn(
                        "font-mono text-sm font-medium",
                        isUser ? "text-[#00C46A]" : "text-white/80"
                      )}>
                        {getNickname(result.owner)}
                      </p>
                      {isUser && (
                        <span className="text-[10px] font-bold text-[#00C46A]/60 uppercase tracking-widest">
                          Ви
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Points */}
                <td className="py-4 px-4 text-right">
                  <span className={cn(
                    "font-display font-black text-xl tabular-nums",
                    rColor || (isUser ? "text-[#00C46A]" : "text-white")
                  )}>
                    {result.finalPoints}
                  </span>
                </td>

                {/* Prize */}
                <td className="py-4 px-4 text-right">
                  {result.prizeAmount > 0 ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-display font-black text-sm text-emerald-400 tabular-nums">
                        {formatMOVE(result.prizeAmount)} MOVE
                      </span>
                      {result.claimed && (
                        <span className="text-[9px] font-bold text-emerald-400/50 uppercase tracking-wider">
                          Отримано ✓
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-white/20 text-sm">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
