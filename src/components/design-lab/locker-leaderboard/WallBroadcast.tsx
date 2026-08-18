"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  LabLeaderboardSnapshot,
  SeasonHighlightRow,
} from "./mockData";
import {
  getLoungeVariant,
  type LoungeVariantId,
} from "./loungeVariants";

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
  loungeVariantId = "current",
}: {
  mode: WallMode;
  prevBoard: LabLeaderboardSnapshot;
  seasonHighlights: readonly SeasonHighlightRow[];
  className?: string;
  loungeVariantId?: LoungeVariantId;
}) {
  const lounge = getLoungeVariant(loungeVariantId);

  return (
    <div
      className={cn(
        "pointer-events-none select-none rounded-xl border p-2 sm:p-2.5",
        className,
      )}
      style={
        {
          ...lounge.vars,
          borderColor: "var(--lv-hairline)",
          background: "var(--lv-panel)",
          color: "var(--lv-ink)",
        } as CSSProperties
      }
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="overflow-hidden rounded-lg border shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
        style={{
          borderColor: "var(--lv-hairline)",
          background: "var(--lv-screen)",
        }}
      >
        <div
          className="flex items-center justify-between gap-2 border-b px-3 py-1.5"
          style={{
            borderColor: "var(--lv-hairline)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <span
            className={cn(
              "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em]",
              lounge.liveClass,
            )}
          >
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "var(--lv-accent)" }}
            />
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
                  mode === id ? "text-[color:var(--lv-accent-on)]" : undefined,
                )}
                style={
                  mode === id
                    ? { background: "var(--lv-accent)" }
                    : { color: "var(--lv-muted)" }
                }
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
              lounge={lounge}
            />
            <div className="px-2 pb-2 sm:px-3">
              {prevBoard.rows
                .filter((r) => r.rank <= 5 || r.isYou)
                .slice(0, 6)
                .map((r) => (
                  <WallRow
                    key={r.owner}
                    rank={r.rank}
                    nickname={r.nickname}
                    a={r.finalPoints}
                    b={r.prizeAmount > 0 ? String(r.prizeAmount) : "—"}
                    isYou={Boolean(r.isYou)}
                    lounge={lounge}
                  />
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
              lounge={lounge}
            />
            <div className="px-2 pb-2 sm:px-3">
              {seasonHighlights.slice(0, 6).map((r) => (
                <WallRow
                  key={r.owner}
                  rank={r.rank}
                  nickname={r.nickname}
                  a={r.points}
                  b={`${r.top10}×T10`}
                  isYou={Boolean(r.isYou)}
                  lounge={lounge}
                  bMuted
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t bg-black/40 px-3 py-1"
          style={{ borderColor: "var(--lv-hairline)" }}
        >
          <span
            className="text-[8px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--lv-muted)" }}
          >
            Auto-cycle · {CYCLE_MS / 1000}s · watch only
          </span>
          <span
            className="font-display text-[9px] font-black uppercase tracking-[0.12em]"
            style={{ color: "var(--lv-soft)" }}
          >
            {mode === "prev" ? "Last round" : "Season board"}
          </span>
        </div>
      </div>
    </div>
  );
}

function WallHeader({
  title,
  sub,
  lounge,
}: {
  title: string;
  sub: string;
  lounge: ReturnType<typeof getLoungeVariant>;
}) {
  return (
    <div className="flex items-end justify-between gap-2 px-3 py-2">
      <div>
        <p className="font-display text-sm font-black uppercase tracking-tight sm:text-base">
          {title}
        </p>
        <p
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.14em]",
            lounge.liveClass,
          )}
        >
          {sub}
        </p>
      </div>
      <p
        className="text-[9px] uppercase tracking-[0.12em]"
        style={{ color: "var(--lv-muted)" }}
      >
        Pos · Mgr · Pts
      </p>
    </div>
  );
}

function WallRow({
  rank,
  nickname,
  a,
  b,
  isYou,
  lounge,
  bMuted,
}: {
  rank: number;
  nickname: string;
  a: number | string;
  b: string;
  isYou: boolean;
  lounge: ReturnType<typeof getLoungeVariant>;
  bMuted?: boolean;
}) {
  const hot = lounge.accentRank && (rank <= 3 || isYou);
  return (
    <div
      className="grid grid-cols-[2rem_1fr_2.5rem_3.5rem] items-center gap-1 border-b px-1 py-1 text-[11px]"
      style={{
        borderColor: "var(--lv-row)",
        background: isYou ? "var(--lv-you)" : undefined,
      }}
    >
      <span
        className={cn(
          "font-display font-black tabular-nums",
          hot ? lounge.liveClass : undefined,
        )}
        style={hot ? undefined : { color: "var(--lv-muted)" }}
      >
        {rank}
      </span>
      <span
        className={cn(
          "truncate font-display text-[10px] font-black uppercase tracking-wide",
          isYou && lounge.youClass,
        )}
      >
        {nickname}
      </span>
      <span className="text-right font-display text-[10px] font-black tabular-nums">
        {a}
      </span>
      <span
        className={cn(
          "text-right font-display text-[10px] font-black tabular-nums",
          !bMuted && lounge.liveClass,
          bMuted && "text-[9px] uppercase tracking-wide",
        )}
        style={bMuted ? { color: "var(--lv-muted)" } : undefined}
      >
        {b}
      </span>
    </div>
  );
}
