"use client";

import {
  ShareHalfPitchBoard,
  HALF_PITCH_ASPECT,
} from "@/components/share/ShareHalfPitchBoard";
import {
  ShareHalfPitchListRail,
  type ShareListRowStyle,
} from "@/components/share/ShareHalfPitchListRail";
import { SHARE_SOFT_PANEL } from "@/components/share/shareCardPanels";
import type { PitchStyleId } from "@/components/design-lab/locker-hero/pitchStyles";
import type { FormationId } from "@/lib/formation";
import type { Player } from "@/lib/types";
import type { ShareMutedChipPlateStyle } from "@/components/share/SharePitchChipMuted";

const PANEL_PAD = 12;
const INNER_GAP = 14;
const LIST_W = 260;

export type UnifiedPitchOrder = "pitch-first" | "list-first";

/** Single soft plaque — half pitch + XI/subs list. */
export function ShareHalfPitchUnifiedPanel({
  starters,
  bench,
  tourLabel,
  formationId,
  colH,
  colW,
  order = "pitch-first",
  rowStyle = "glass",
  chipMode = "chips-muted",
  mutedPlateStyle = "site",
  pitchStyleId = "night-turf",
  captainIndex,
}: {
  starters: Player[];
  bench: Player[];
  tourLabel: string;
  formationId?: FormationId;
  colH: number;
  colW: number;
  order?: UnifiedPitchOrder;
  rowStyle?: ShareListRowStyle;
  chipMode?: "chips" | "chips-muted" | "glass";
  mutedPlateStyle?: ShareMutedChipPlateStyle;
  pitchStyleId?: PitchStyleId;
  captainIndex?: number;
}) {
  const innerH = colH - PANEL_PAD * 2;
  const innerW = colW - PANEL_PAD * 2;
  const listW = LIST_W;
  const pitchW = Math.min(
    innerW - listW - INNER_GAP,
    Math.round(innerH * HALF_PITCH_ASPECT),
  );

  const pitchNode = (
    <div className="flex min-w-0 flex-1 items-center justify-center">
      <div
        className="shrink-0 overflow-hidden rounded-[12px]"
        style={{ width: pitchW, height: innerH }}
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
          style={{ boxShadow: "none", borderRadius: 12 }}
        />
      </div>
    </div>
  );

  const listNode = (
    <ShareHalfPitchListRail
      starters={starters}
      bench={bench}
      tourLabel={tourLabel}
      formationId={formationId}
      height={innerH}
      width={listW}
      rowStyle={rowStyle}
      captainIndex={captainIndex}
      embedded
    />
  );

  return (
    <div
      className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-[16px]"
      style={{
        height: colH,
        padding: PANEL_PAD,
        ...SHARE_SOFT_PANEL,
      }}
    >
      <div
        className="flex min-h-0 min-w-0 flex-1 items-stretch"
        style={{ gap: INNER_GAP }}
      >
        {order === "pitch-first" ? (
          <>
            {pitchNode}
            {listNode}
          </>
        ) : (
          <>
            {listNode}
            {pitchNode}
          </>
        )}
      </div>
    </div>
  );
}
