"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  LabLeaderboardSnapshot,
  SeasonHighlightRow,
} from "./mockData";

export type WallMode = "prev" | "season";

const CYCLE_MS = 5200;

export function useWallCycle(paused = false) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<WallMode>("prev");

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setMode((m) => (m === "prev" ? "season" : "prev"));
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion]);

  return { mode };
}

/**
 * Diegetic wall TV — passive auto-cycle only.
 * Mode A: previous GW top · Mode B: season points highlights.
 * No claim, no selection — informative atmosphere.
 */
export function WallBroadcast({
  mode,
  prevBoard,
  seasonHighlights,
  className,
}: {
  mode: WallMode;
  prevBoard: LabLeaderboardSnapshot;
  seasonHighlights: readonly SeasonHighlightRow[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none rounded-xl border border-white/10 bg-[#141210] p-2 sm:p-2.5",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="overflow-hidden rounded-lg border border-white/15 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#00f948]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00f948]" />
            Lounge TV
          </span>
          <div className="flex gap-1">
            {(
              [
                ["prev", "Last GW"],
                ["season", "Season"],
              ] as const
            ).map(([id, label]) => (
              <span
                key={id}
                className={cn(
                  "rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em]",
                  mode === id
                    ? "bg-[#00f948] text-black"
                    : "text-white/30",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[9.5rem] sm:min-h-[11rem]">
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              mode === "prev" ? "opacity-100" : "opacity-0",
            )}
          >
            <WallHeader
              title={`Gameweek ${prevBoard.gameweek}`}
              sub="Previous round · final"
            />
            <div className="px-2 pb-2 sm:px-3">
              {prevBoard.rows
                .filter((r) => r.rank <= 5 || r.isYou)
                .slice(0, 6)
                .map((r) => (
                  <div
                    key={r.owner}
                    className={cn(
                      "grid grid-cols-[2rem_1fr_2.5rem_3.5rem] items-center gap-1 border-b border-white/[0.05] px-1 py-1 text-[11px]",
                      r.isYou && "bg-[#00f948]/10",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display font-black tabular-nums",
                        r.rank <= 3 || r.isYou ? "text-[#00f948]" : "text-white/35",
                      )}
                    >
                      {r.rank}
                    </span>
                    <span
                      className={cn(
                        "truncate font-display text-[10px] font-black uppercase tracking-wide",
                        r.isYou && "text-[#00f948]",
                      )}
                    >
                      {r.nickname}
                    </span>
                    <span className="text-right font-display text-[10px] font-black tabular-nums">
                      {r.finalPoints}
                    </span>
                    <span className="text-right font-display text-[10px] font-black tabular-nums text-[#00f948]/90">
                      {r.prizeAmount > 0 ? r.prizeAmount : "—"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              mode === "season" ? "opacity-100" : "opacity-0",
            )}
          >
            <WallHeader
              title="Season highlights"
              sub="Points · top-10 finishes"
            />
            <div className="px-2 pb-2 sm:px-3">
              {seasonHighlights.slice(0, 6).map((r) => (
                <div
                  key={r.owner}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_3rem_2.75rem] items-center gap-1 border-b border-white/[0.05] px-1 py-1 text-[11px]",
                    r.isYou && "bg-[#00f948]/10",
                  )}
                >
                  <span
                    className={cn(
                      "font-display font-black tabular-nums",
                      r.rank <= 3 || r.isYou ? "text-[#00f948]" : "text-white/35",
                    )}
                  >
                    {r.rank}
                  </span>
                  <span
                    className={cn(
                      "truncate font-display text-[10px] font-black uppercase tracking-wide",
                      r.isYou && "text-[#00f948]",
                    )}
                  >
                    {r.nickname}
                  </span>
                  <span className="text-right font-display text-[10px] font-black tabular-nums text-[#00f948]">
                    {r.points}
                  </span>
                  <span className="text-right text-[9px] uppercase tracking-wide text-white/35">
                    {r.top10}×T10
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-3 py-1">
          <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/30">
            Auto-cycle · {CYCLE_MS / 1000}s · watch only
          </span>
          <span className="font-display text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
            {mode === "prev" ? "Last round" : "Season board"}
          </span>
        </div>
      </div>
    </div>
  );
}

function WallHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-end justify-between gap-2 px-3 py-2">
      <div>
        <p className="font-display text-sm font-black uppercase tracking-tight sm:text-base">
          {title}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#00f948]/80">
          {sub}
        </p>
      </div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-white/25">
        Pos · Mgr · Pts
      </p>
    </div>
  );
}
