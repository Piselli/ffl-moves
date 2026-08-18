"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  LabLeaderboardSnapshot,
  SeasonHighlightRow,
} from "./mockData";
import type { WallMode } from "./WallBroadcast";

/**
 * Passive wall surface for the locker table scene — tactics whiteboard,
 * not a TV/monitor chrome skin.
 */
export function BoardBroadcast({
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
  const rows =
    mode === "prev"
      ? prevBoard.rows.slice(0, 6).map((r) => ({
          rank: r.rank,
          name: r.nickname,
          meta: `${r.finalPoints} pts`,
        }))
      : seasonHighlights.slice(0, 6).map((r) => ({
          rank: r.rank,
          name: r.nickname,
          meta: `${r.points} pts`,
        }));

  return (
    <div
      className={cn(
        "pointer-events-none flex h-full select-none flex-col px-[4%] py-[3.5%]",
        className,
      )}
      style={
        {
          color: "#1c1b1a",
          fontFamily: "var(--font-onest), system-ui, sans-serif",
        } as CSSProperties
      }
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-black/15 pb-2">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-black/45 sm:text-[11px]">
          {mode === "prev" ? "Last gameweek" : "Season board"}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/30">
          Tactics wall
        </p>
      </div>

      <ul className="mt-2 flex min-h-0 flex-1 flex-col justify-evenly gap-0.5 sm:mt-3">
        {rows.map((row) => (
          <li
            key={`${mode}-${row.rank}-${row.name}`}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-2 border-b border-dashed border-black/10 pb-1 last:border-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-3"
          >
            <span className="font-display text-[13px] font-bold tabular-nums text-black/35 sm:text-[15px]">
              {row.rank}
            </span>
            <span className="truncate font-display text-[13px] font-bold uppercase tracking-[0.04em] text-black/80 sm:text-[15px]">
              {row.name}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-black/45 sm:text-[12px]">
              {row.meta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
