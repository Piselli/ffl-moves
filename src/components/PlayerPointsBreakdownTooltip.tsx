"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  computeFantasyPointsBreakdown,
  type PointsBreakdownLine,
  type PointsBreakdownLineKind,
  type ScoringPlayer,
} from "@/lib/scoring";
import { GK_SAVE_BATCH } from "@/lib/scoring-rules";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type PlayerPointsBreakdownTooltipProps = {
  children: ReactNode;
  scoringPlayer: ScoringPlayer;
  stats: Record<string, unknown> | null | undefined;
  total: number;
  /** Shown when auto-sub stats count toward this slot */
  subNote?: string | null;
  disabled?: boolean;
  className?: string;
};

function formatLineLabel(
  kind: PointsBreakdownLineKind,
  count: number | undefined,
  gains: Record<string, string>,
  savesEvery: string,
): string {
  const base = gains[kind] ?? kind;
  if (kind === "savesBatch" && count && count > 1) {
    return `${savesEvery.replace("{n}", String(GK_SAVE_BATCH))} ×${count}`;
  }
  if (count != null && count > 1 && kind !== "savesBatch") {
    return `${base} ×${count}`;
  }
  return base;
}

function BreakdownPanel({
  lines,
  total,
  subNote,
}: {
  lines: PointsBreakdownLine[];
  total: number;
  subNote?: string | null;
}) {
  const m = useSiteMessages();
  const gains = m.scoringGains;
  const pb = m.pointsBreakdown;

  if (!lines.length) {
    return (
      <div className="bg-[#1a1d26] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl min-w-[9.5rem] max-w-[13.5rem]">
        <p className="text-[11px] text-white/40">{pb.noStats}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d26] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl min-w-[9.5rem] max-w-[13.5rem]">
      {subNote ? (
        <p className="mb-1.5 text-[9px] font-semibold leading-snug text-[#00f948]/75">{subNote}</p>
      ) : null}
      <ul className="space-y-0.5">
        {lines.map((line, i) => (
          <li key={`${line.kind}-${i}`} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[10px] text-white/55">
              {formatLineLabel(line.kind, line.count, gains, m.home.scoringSavesEvery)}
            </span>
            <span
              className={cn(
                "shrink-0 font-display text-[11px] font-bold tabular-nums",
                line.points > 0 ? "text-[#00f948]" : line.points < 0 ? "text-rose-400" : "text-white/35",
              )}
            >
              {line.points > 0 ? `+${line.points}` : line.points}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">{pb.total}</span>
        <span className="font-display text-[12px] font-black tabular-nums text-white">{total}</span>
      </div>
    </div>
  );
}

export function PlayerPointsBreakdownTooltip({
  children,
  scoringPlayer,
  stats,
  total,
  subNote,
  disabled = false,
  className,
}: PlayerPointsBreakdownTooltipProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const lines = disabled || !stats ? [] : computeFantasyPointsBreakdown(scoringPlayer, stats);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelW = 160;
    const margin = 8;
    let left = rect.left + rect.width / 2;
    left = Math.max(panelW / 2 + margin, Math.min(window.innerWidth - panelW / 2 - margin, left));
    const top = Math.max(margin, rect.top - margin);
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={anchorRef}
      className={cn("relative", className)}
      onMouseEnter={() => {
        setOpen(true);
        updatePosition();
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        setOpen(true);
        updatePosition();
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[9999]"
              style={{
                top: pos.top,
                left: pos.left,
                transform: "translate(-50%, -100%)",
              }}
              role="tooltip"
            >
              <BreakdownPanel lines={lines} total={total} subNote={subNote} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
