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
  const chalk = "#FFFFFF";
  const border = { borderColor: chalk };
  const line = { background: chalk };
  const dot = { background: chalk };

  return (
    <div
      className="pointer-events-none absolute inset-[4.5%] rounded-[2px] border-2 opacity-[0.92]"
      style={border}
    >
      <div
        className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2"
        style={line}
      />
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={border}
      />
      <div
        className="absolute left-1/2 top-0 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-b-2"
        style={border}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-t-2"
        style={border}
      />
      <div
        className="absolute left-1/2 top-0 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-b-2"
        style={border}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-t-2"
        style={border}
      />
      <div
        className="absolute left-1/2 top-[14%] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={dot}
      />
      <div
        className="absolute bottom-[14%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full"
        style={dot}
      />
      <div
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={dot}
      />
      <div
        className="absolute left-0 top-0 h-2.5 w-2.5 rounded-br-full border-b-2 border-r-2"
        style={border}
      />
      <div
        className="absolute right-0 top-0 h-2.5 w-2.5 rounded-bl-full border-b-2 border-l-2"
        style={border}
      />
      <div
        className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-tr-full border-r-2 border-t-2"
        style={border}
      />
      <div
        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-tl-full border-l-2 border-t-2"
        style={border}
      />
    </div>
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
