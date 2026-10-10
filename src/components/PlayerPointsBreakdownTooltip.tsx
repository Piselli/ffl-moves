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

/** Form8 crystal sheet — same language as Results tablet / locker glass. */
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

  return (
    <div className="relative w-[12.5rem] max-w-[min(12.5rem,calc(100vw-1.5rem))]">
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
          <div className="mb-2.5 flex items-end justify-between gap-2 border-b border-white/[0.1] pb-2.5">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                {pb.total}
              </p>
              {subNote ? (
                <p className="mt-1 truncate text-[10px] font-semibold leading-snug text-[#00f948]/85">
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

      {/* Anchor caret toward the pts disc */}
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
    const panelW = 200;
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
              <BreakdownPanel lines={lines} total={total} subNote={subNote} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
