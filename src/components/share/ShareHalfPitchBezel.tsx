"use client";

import {
  ShareHalfPitchBoard,
  HALF_PITCH_ASPECT,
} from "@/components/share/ShareHalfPitchBoard";
import {
  SHARE_PITCH_BEZEL,
  SHARE_SOFT_PITCH_FRAME,
} from "@/components/share/shareCardPanels";
import type { PitchStyleId } from "@/components/design-lab/locker-hero/pitchStyles";
import type { FormationId } from "@/lib/formation";
import type { Player } from "@/lib/types";
import type { ShareMutedChipPlateStyle } from "@/components/share/SharePitchChipMuted";

export type SharePitchFrameStyle = "none" | "glow" | "soft" | "bezel";

export function ShareHalfPitchBezel({
  starters,
  formationId,
  colH,
  maxOuterW,
  chipMode = "glass",
  pitchStyleId = "night-turf",
  align = "center",
  frameStyle = "bezel",
  mutedPlateStyle = "site",
  captainIndex,
}: {
  starters: Player[];
  formationId?: FormationId;
  colH: number;
  maxOuterW: number;
  chipMode?: "chips" | "chips-muted" | "glass";
  pitchStyleId?: PitchStyleId;
  align?: "center" | "end";
  /** none = pitch only · glow = site ring · soft = glass panel · bezel = locker tablet frame */
  frameStyle?: SharePitchFrameStyle;
  mutedPlateStyle?: ShareMutedChipPlateStyle;
  captainIndex?: number;
}) {
  const pitchH = colH;
  const pitchW = Math.min(Math.round(pitchH * HALF_PITCH_ASPECT), maxOuterW);

  if (frameStyle === "none" || frameStyle === "glow") {
    return (
      <div className={cnFlex(align)} style={{ height: colH }}>
        <div
          className="relative overflow-hidden rounded-[16px]"
          style={{
            width: pitchW,
            height: pitchH,
            ...(frameStyle === "glow"
              ? {
                  boxShadow:
                    "inset 0 0 0 1px rgba(255,255,255,0.18), 0 16px 40px rgba(0,0,0,0.65)",
                }
              : {}),
          }}
        >
          <ShareHalfPitchBoard
            starters={starters}
            formationId={formationId}
            chipMode={chipMode}
            chipSize="lg"
            pitchStyleId={pitchStyleId}
            mutedPlateStyle={mutedPlateStyle}
            captainIndex={captainIndex}
            className="h-full w-full"
            style={{ boxShadow: "none", borderRadius: 16 }}
          />
        </div>
      </div>
    );
  }

  const frame =
    frameStyle === "soft" ? SHARE_SOFT_PITCH_FRAME : SHARE_PITCH_BEZEL;
  const padding = frame.padding;
  const pitchInnerH = colH - padding * 2;
  const pitchInnerW = Math.min(
    Math.round(pitchInnerH * HALF_PITCH_ASPECT),
    maxOuterW - padding * 2,
  );
  const frameW = pitchInnerW + padding * 2;

  return (
    <div
      className={cnFlex(align)}
      style={{ height: colH }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: frameW,
          height: colH,
          borderRadius: frame.radius,
          background:
            frameStyle === "soft"
              ? SHARE_SOFT_PITCH_FRAME.background
              : SHARE_PITCH_BEZEL.background,
          boxShadow:
            frameStyle === "soft"
              ? SHARE_SOFT_PITCH_FRAME.boxShadow
              : SHARE_PITCH_BEZEL.shadow,
          padding,
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: pitchInnerW,
            height: pitchInnerH,
            borderRadius: frame.innerRadius,
            boxShadow:
              frameStyle === "soft"
                ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
                : "inset 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        >
          <ShareHalfPitchBoard
            starters={starters}
            formationId={formationId}
            chipMode={chipMode}
            chipSize="lg"
            pitchStyleId={pitchStyleId}
            className="h-full w-full"
            style={{
              boxShadow: "none",
              borderRadius: frame.innerRadius,
            }}
            mutedPlateStyle={mutedPlateStyle}
            captainIndex={captainIndex}
          />
        </div>
      </div>
    </div>
  );
}

function cnFlex(align: "center" | "end") {
  return align === "end"
    ? "flex min-w-0 flex-1 items-stretch justify-end"
    : "flex min-w-0 flex-1 items-stretch justify-center";
}
