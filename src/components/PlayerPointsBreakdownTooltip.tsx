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

export type AutoSubSwap = {
  /** Registered starter who did not play */
  outName: string;
  /** Bench player whose points count */
  inName: string;
};

type PlayerPointsBreakdownTooltipProps = {
  children: ReactNode;
  scoringPlayer: ScoringPlayer;
  stats: Record<string, unknown> | null | undefined;
  total: number;
  /** Shown when auto-sub stats count toward this slot */
  subNote?: string | null;
  /** Structured auto-sub swap for broadcast-style header */
  autoSub?: AutoSubSwap | null;
  /** Extra line under total (e.g. captain note) */
  captainNote?: string | null;
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

function SwapBoard({ outName, inName }: AutoSubSwap) {
  return (
    <div className="mb-2.5 rounded-xl border border-white/12 bg-black/35 px-2.5 py-2">
      <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
        Auto-sub
      </p>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/90 text-[10px] font-black text-white shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
            >
              ↓
            </span>
            <span className="truncate text-[11px] font-semibold text-white/45 line-through decoration-white/25">
              {outName}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-black shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
            >
              ↑
            </span>
            <span className="truncate text-[12px] font-bold text-white">
              {inName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Form8 crystal sheet — same language as Results tablet / locker glass. */
function BreakdownPanel({
  lines,
  total,
  subNote,
  autoSub,
  captainNote,
}: {
  lines: PointsBreakdownLine[];
  total: number;
  subNote?: string | null;
  autoSub?: AutoSubSwap | null;
  captainNote?: string | null;
}) {
  const m = useSiteMessages();
  const gains = m.scoringGains;
  const pb = m.pointsBreakdown;

  return (
    <div className="relative w-[13.25rem] max-w-[min(13.25rem,calc(100vw-1.5rem))]">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/20",
          "bg-[rgba(8,10,14,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_48px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)]",
          "backdrop-blur-xl",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-90"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 22%, transparent 48%), linear-gradient(320deg, rgba(0,249,72,0.06) 0%, transparent 40%)",
          }}
        />

        <div className="relative px-3.5 pb-3 pt-3">
          {autoSub ? <SwapBoard {...autoSub} /> : null}

          <div className="mb-2.5 flex items-end justify-between gap-2 border-b border-white/[0.1] pb-2.5">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                {pb.total}
              </p>
              {captainNote ? (
                <p className="mt-1 truncate text-[10px] font-semibold leading-snug text-amber-300/90">
                  {captainNote}
                </p>
              ) : null}
              {!autoSub && subNote ? (
                <p className="mt-1 truncate text-[10px] font-semibold leading-snug text-white/55">
                  {subNote}
                </p>
              ) : null}
            </div>
            <p className="shrink-0 font-display text-[1.65rem] font-black leading-none tabular-nums text-[#00f948]">
              {total}
            </p>
          </div>

          {!lines.length ? (
            <p className="text-[11px] leading-snug text-white/40">{pb.noStats}</p>
          ) : (
            <ul className="space-y-1">
              {lines.map((line, i) => (
                <li
                  key={`${line.kind}-${i}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="min-w-0 truncate text-[11px] font-medium text-white/60">
                    {formatLineLabel(
                      line.kind,
                      line.count,
                      gains,
                      m.home.scoringSavesEvery,
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-display text-[12px] font-bold tabular-nums",
                      line.points > 0
                        ? "text-[#00f948]"
                        : line.points < 0
                          ? "text-rose-400"
                          : "text-white/30",
                    )}
                  >
                    {line.points > 0 ? `+${line.points}` : line.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        aria-hidden
        className="mx-auto -mt-px h-2.5 w-2.5 rotate-45 border-b border-r border-white/20 bg-[rgba(8,10,14,0.92)]"
      />
    </div>
  );
}

export function PlayerPointsBreakdownTooltip({
  children,
  scoringPlayer,
  stats,
  total,
  subNote,
  autoSub,
  captainNote,
  disabled = false,
  className,
}: PlayerPointsBreakdownTooltipProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const lines =
    disabled || !stats
      ? []
      : computeFantasyPointsBreakdown(scoringPlayer, stats);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelW = 212;
    const margin = 10;
    let left = rect.left + rect.width / 2;
    left = Math.max(
      panelW / 2 + margin,
      Math.min(window.innerWidth - panelW / 2 - margin, left),
    );
    const top = Math.max(margin, rect.top - 10);
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
              className="pointer-events-none fixed z-[9999] animate-in fade-in-0 zoom-in-95 duration-150"
              style={{
                top: pos.top,
                left: pos.left,
                transform: "translate(-50%, -100%)",
              }}
              role="tooltip"
            >
              <BreakdownPanel
                lines={lines}
                total={total}
                subNote={subNote}
                autoSub={autoSub}
                captainNote={captainNote}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
