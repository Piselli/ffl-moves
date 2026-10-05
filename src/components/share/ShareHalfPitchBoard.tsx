"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ShareGlassChip } from "@/components/share/ShareGlassChip";
import { SharePitchChip } from "@/components/share/SharePitchChip";
import {
  MutedPlateMetricsContext,
  SharePitchChipMuted,
} from "@/components/share/SharePitchChipMuted";
import type { ShareMutedChipPlateStyle } from "@/components/share/SharePitchChipMuted";
import { computeUniformMutedPlateMetrics } from "@/components/share/sharePitchPlateMetrics";
import {
  getPitchStyle,
  type PitchStyleId,
} from "@/components/design-lab/locker-hero/pitchStyles";
import {
  DEFAULT_FORMATION,
  PITCH_SLOT_LAYOUTS,
  inferFormationFromPositions,
  type FormationId,
} from "@/lib/formation";
import type { Player } from "@/lib/types";
import { shareHalfPitchLeftPct } from "@/components/share/shareHalfPitchSlots";
import { cn } from "@/lib/utils";

/** Half pitch plate — FIFA half (52.5m) × width (68m). */
export const HALF_PITCH_ASPECT = 68 / 52.5;

/** Spread XI across half-pitch; keep GK above the bottom edge. */
function halfSlot(
  leftPct: number,
  topPct: number,
  formationId: FormationId,
) {
  const left = shareHalfPitchLeftPct(leftPct, topPct, formationId);
  const t = Math.min(1, Math.max(0, (topPct - 18) / (90 - 18)));
  const top = 7 + t * 73;
  return {
    leftPct: left,
    topPct: Math.min(80, Math.max(7, top)),
  };
}

function HalfChalk() {
  /** SVG strokes — CSS borders often export as black via html-to-image foreignObject. */
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-[2.5%] bottom-[2.5%] top-[2%] opacity-[0.92]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.35"
        vectorEffect="non-scaling-stroke"
      >
        {/* Outer half-pitch frame */}
        <path d="M 1 1 H 99 V 99 H 1 Z" />
        {/* Centre arc (top) */}
        <path d="M 30 1 A 20 20 0 0 0 70 1" />
        {/* Penalty box */}
        <path d="M 23 99 V 74 H 77 V 99" />
        {/* Six-yard box */}
        <path d="M 37 99 V 89 H 63 V 99" />
        {/* Penalty arc */}
        <path d="M 37 74 A 13 12 0 0 1 63 74" />
      </g>
      <circle cx="50" cy="1" r="1.1" fill="#FFFFFF" />
      <circle cx="50" cy="80" r="1.1" fill="#FFFFFF" />
    </svg>
  );
}

/** Half pitch — cutout chips or locker glass plaques. */
export function ShareHalfPitchBoard({
  starters,
  formationId: formationIdProp,
  className,
  style,
  chipSize = "lg",
  pitchStyleId = "night-turf",
  chipMode = "chips",
  mutedPlateStyle = "site",
  captainIndex,
}: {
  starters: Player[];
  formationId?: FormationId;
  className?: string;
  style?: CSSProperties;
  chipSize?: "sm" | "md" | "lg";
  pitchStyleId?: PitchStyleId;
  /** chips = site cutouts · chips-muted = softer share cutouts · glass = frosted plaques */
  chipMode?: "chips" | "chips-muted" | "glass";
  mutedPlateStyle?: ShareMutedChipPlateStyle;
  captainIndex?: number;
}) {
  const pitch = getPitchStyle(pitchStyleId);
  const formationId =
    formationIdProp ??
    inferFormationFromPositions(starters.map((p) => p.positionId));
  const slots =
    PITCH_SLOT_LAYOUTS[formationId] ?? PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION];
  const glassSize = chipSize === "sm" ? "sm" : chipSize === "lg" ? "lg" : "md";
  const boardRef = useRef<HTMLDivElement>(null);
  const [pitchWidthPx, setPitchWidthPx] = useState(568);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const sync = () => setPitchWidthPx(el.clientWidth || 568);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mutedPlateMetrics = useMemo(() => {
    if (chipMode !== "chips-muted") return null;
    return computeUniformMutedPlateMetrics(starters, chipSize, {
      pitchWidthPx,
      formationId,
    });
  }, [chipMode, chipSize, formationId, pitchWidthPx, starters]);

  const pitchBody = (
    <div ref={boardRef} className="relative z-[2] h-full w-full p-[1.5%]">
      <div className="relative h-full w-full">
        {slots.map(({ formationIndex, leftPct, topPct }) => {
          const player = starters[formationIndex];
          if (!player) return null;
          const pos = halfSlot(leftPct, topPct, formationId);
          const slotTop =
            chipMode === "chips-muted"
              ? Math.min(86, pos.topPct + 4)
              : pos.topPct;
          return (
            <div
              key={formationIndex}
              className={cn(
                "absolute -translate-x-1/2",
                chipMode === "glass"
                  ? "-translate-y-1/2"
                  : chipMode === "chips-muted"
                    ? "-translate-y-[38%]"
                    : "-translate-y-[42%]",
              )}
              style={{ left: `${pos.leftPct}%`, top: `${slotTop}%` }}
            >
              {chipMode === "glass" ? (
                <ShareGlassChip player={player} size={glassSize} />
              ) : chipMode === "chips-muted" ? (
                <SharePitchChipMuted
                  player={player}
                  size={chipSize}
                  plateStyle={mutedPlateStyle}
                  captain={captainIndex === formationIndex}
                />
              ) : (
                <SharePitchChip player={player} size={chipSize} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl",
        className,
      )}
      style={{
        background: pitch.base,
        boxShadow: pitch.shadow,
        ...style,
      }}
    >
      {pitch.image ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 scale-[1.04]"
          style={{
            backgroundImage: `url(${pitch.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: pitch.imageFilter,
          }}
        />
      ) : null}
      {(pitch.overlays ?? []).map((bg, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: bg }}
        />
      ))}

      <HalfChalk />

      {mutedPlateMetrics ? (
        <MutedPlateMetricsContext.Provider value={mutedPlateMetrics}>
          {pitchBody}
        </MutedPlateMetricsContext.Provider>
      ) : (
        pitchBody
      )}
    </div>
  );
}
