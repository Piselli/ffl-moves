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
import { cn } from "@/lib/utils";

/** Half pitch plate — FIFA half (52.5m) × width (68m). */
export const HALF_PITCH_ASPECT = 68 / 52.5;

/** Spread XI across half-pitch; keep GK above the bottom edge. */
function halfSlot(leftPct: number, topPct: number) {
  const left = 4 + (leftPct / 100) * 92;
  const t = Math.min(1, Math.max(0, (topPct - 18) / (90 - 18)));
  const top = 7 + t * 73;
  return {
    leftPct: Math.min(93, Math.max(7, left)),
    topPct: Math.min(80, Math.max(7, top)),
  };
}

function HalfChalk() {
  const chalk = "#FFFFFF";
  const border = { borderColor: chalk };
  const dot = { background: chalk };

  return (
    <div
      className="pointer-events-none absolute inset-x-[2.5%] bottom-[2.5%] top-[2%] rounded-b-[2px] border-2 border-t-2 opacity-[0.92]"
      style={border}
    >
      <div
        className="absolute left-1/2 top-0 aspect-[2/1] w-[40%] -translate-x-1/2 rounded-b-full border-2 border-t-0"
        style={border}
      />
      <div
        className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={dot}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[26%] w-[54%] -translate-x-1/2 border-x-2 border-t-2"
        style={border}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[11%] w-[26%] -translate-x-1/2 border-x-2 border-t-2"
        style={border}
      />
      <div
        className="absolute bottom-[20%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
        style={dot}
      />
      <div
        className="absolute bottom-[26%] left-1/2 h-[12%] w-[26%] -translate-x-1/2 rounded-t-full border-2 border-b-0"
        style={border}
      />
    </div>
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
          const pos = halfSlot(leftPct, topPct);
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
