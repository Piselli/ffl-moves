"use client";

export {
  SQUAD_SHARE_CARD_WIDTH,
  SQUAD_SHARE_CARD_HEIGHT,
} from "@/components/share/shareCardTypes";
export type { SquadShareCardProps } from "@/components/share/shareCardTypes";

import { ShareCardHalfPitchClassic } from "@/components/share/variants/ShareCardHalfPitchClassic";
import type { SquadShareCardProps } from "@/components/share/shareCardTypes";

/** Shipping default — v13 muted cutouts · white plates · pitch center. */
export function SquadLockShareCard(props: SquadShareCardProps) {
  return (
    <ShareCardHalfPitchClassic
      {...props}
      pitchPlacement="center"
      listPanel="soft"
      listRowStyle="glass"
      chipMode="chips-muted"
      mutedPlateStyle="white"
      pitchFrameStyle="none"
    />
  );
}
