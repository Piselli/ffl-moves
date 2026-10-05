"use client";

import type { CSSProperties } from "react";
import { ShareGlassChip } from "@/components/share/ShareGlassChip";
import { SharePitchChip } from "@/components/share/SharePitchChip";
import { getPitchStyle } from "@/components/design-lab/locker-hero/pitchStyles";
import {
  DEFAULT_FORMATION,
  PITCH_SLOT_LAYOUTS,
  inferFormationFromPositions,
  type FormationId,
} from "@/lib/formation";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

function PortraitChalk() {
  /** SVG strokes — CSS borders often export as black via html-to-image foreignObject. */
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-[4.5%] opacity-[0.92]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.35"
        vectorEffect="non-scaling-stroke"
      >
        <rect x="1" y="1" width="98" height="98" />
        <line x1="1" y1="50" x2="99" y2="50" />
        <circle cx="50" cy="50" r="13" />
        <path d="M 26 1 V 12 H 74 V 1" />
        <path d="M 26 99 V 88 H 74 V 99" />
        <path d="M 39 1 V 7 H 61 V 1" />
        <path d="M 39 99 V 93 H 61 V 99" />
        <path d="M 1 1 Q 4 4 1 7" />
        <path d="M 99 1 Q 96 4 99 7" />
        <path d="M 1 99 Q 4 96 1 93" />
        <path d="M 99 99 Q 96 96 99 93" />
      </g>
      <circle cx="50" cy="50" r="1.1" fill="#FFFFFF" />
      <circle cx="50" cy="14" r="1.1" fill="#FFFFFF" />
      <circle cx="50" cy="86" r="1.1" fill="#FFFFFF" />
    </svg>
  );
}

export type SharePitchBoardMode = "chips" | "glass" | "dots";

/** Night-turf portrait pitch — same orientation as gameweek / RegisteredSquadShowcase. */
export function SharePitchBoard({
  starters,
  formationId: formationIdProp,
  className,
  style,
  compact = false,
  mode = "chips",
  noVignette = false,
  captainIndex,
  /** Keep chips inside chalk — share cards clip without this. */
  safeInset = false,
}: {
  starters: Player[];
  formationId?: FormationId;
  className?: string;
  style?: CSSProperties;
  /** Smaller chips when the pitch plate is narrow. */
  compact?: boolean;
  /** chips = PitchChipCutout · glass = site frosted nameplates · dots = markers */
  mode?: SharePitchBoardMode;
  noVignette?: boolean;
  /** Formation index (0–10) with gold captain rim — glass mode only. */
  captainIndex?: number;
  safeInset?: boolean;
}) {
  const pitch = getPitchStyle("night-turf");
  const formationId =
    formationIdProp ??
    inferFormationFromPositions(starters.map((p) => p.positionId));
  const slots =
    PITCH_SLOT_LAYOUTS[formationId] ?? PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION];

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-xl", className)}
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

      <PortraitChalk />

      <div
        className="relative z-[2] h-full w-full"
        style={
          safeInset
            ? { padding: compact ? "9% 11%" : "7% 9%", boxSizing: "border-box" }
            : undefined
        }
      >
        <div className={safeInset ? "relative h-full w-full" : "contents"}>
        {slots.map(({ formationIndex, leftPct, topPct }) => {
          const player = starters[formationIndex];
          if (!player) return null;
          return (
            <div
              key={formationIndex}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            >
              {mode === "dots" ? (
                <div
                  className="rounded-full bg-white"
                  style={{
                    width: compact ? 7 : 9,
                    height: compact ? 7 : 9,
                    boxShadow: "0 0 10px rgba(255,255,255,0.45)",
                  }}
                />
              ) : mode === "glass" ? (
                <ShareGlassChip
                  player={player}
                  captain={captainIndex === formationIndex}
                  size={compact ? "sm" : "md"}
                />
              ) : (
                <SharePitchChip player={player} compact={compact} />
              )}
            </div>
          );
        })}
        </div>
      </div>

      {!noVignette ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 14%, transparent 86%, rgba(0,0,0,0.35) 100%)",
          }}
        />
      ) : null}
    </div>
  );
}
