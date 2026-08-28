"use client";

import { createContext, useContext } from "react";
import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { getPitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
import { fitPitchName } from "@/components/design-lab/locker-hero/pitchChipName";
import type { SharePitchChipSize } from "@/components/share/SharePitchChip";
import {
  SHARE_MUTED_CHIP_PLATE,
  SHARE_MUTED_CHIP_PLATE_WHITE,
  SHARE_SITE_GLASS_CHIP,
} from "@/components/share/shareCardPanels";
import type { UniformMutedPlateMetrics } from "@/components/share/sharePitchPlateMetrics";
import type { Player } from "@/lib/types";
import { sharePlayerSurname } from "@/components/share/sharePitchKit";

const SIZE: Record<
  SharePitchChipSize,
  {
    cutout: number;
    maxTextW: number;
    maxNameSize: number;
    preferMin: number;
    plateH: number;
    platePadX: number;
    maxPlateW: number;
  }
> = {
  sm: {
    cutout: 50,
    maxTextW: 56,
    maxNameSize: 10.5,
    preferMin: 9,
    plateH: 18,
    platePadX: 5,
    maxPlateW: 64,
  },
  md: {
    cutout: 60,
    maxTextW: 64,
    maxNameSize: 12,
    preferMin: 10,
    plateH: 20,
    platePadX: 6,
    maxPlateW: 72,
  },
  lg: {
    cutout: 84,
    maxTextW: 68,
    maxNameSize: 14.5,
    preferMin: 12.5,
    plateH: 26,
    platePadX: 7,
    maxPlateW: 88,
  },
};

export const MutedPlateMetricsContext =
  createContext<UniformMutedPlateMetrics | null>(null);

export type ShareMutedChipPlateStyle = "site" | "dark" | "white";

/** Share pitch chip — bust cutout + slim surname plate. */
export function SharePitchChipMuted({
  player,
  size = "lg",
  plateStyle = "site",
}: {
  player: Player;
  size?: SharePitchChipSize;
  /** site = login glass · dark = opaque plate · white = light plate */
  plateStyle?: ShareMutedChipPlateStyle;
}) {
  const s = SIZE[size];
  const uniform = useContext(MutedPlateMetricsContext);
  const plate =
    plateStyle === "dark"
      ? SHARE_MUTED_CHIP_PLATE
      : plateStyle === "white"
        ? SHARE_MUTED_CHIP_PLATE_WHITE
        : SHARE_SITE_GLASS_CHIP;
  const showSheen = plateStyle === "site";
  const nameColor =
    plateStyle === "white" ? "text-[#0a0a0a]" : "text-white/90";
  const surname = sharePlayerSurname(player);
  const font = getPitchChipFont();

  const plateW = uniform?.plateW ?? s.maxPlateW;
  const plateH = uniform?.plateH ?? s.plateH;
  const platePadX = uniform?.platePadX ?? s.platePadX;
  const textW = plateW - platePadX * 2;

  const { label, fontSize } = uniform
    ? {
        label: uniform.labels[player.id] ?? surname,
        fontSize: uniform.fontSize,
      }
    : fitPitchName(surname, {
        widthPx: textW,
        fontFamily: font.family,
        weight: font.weight,
        letterSpacing: font.tracking,
        maxSize: s.maxNameSize,
        preferMin: s.preferMin,
        allowAbbreviate: false,
      });

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{
          filter: "brightness(0.94) saturate(0.86) contrast(0.98)",
        }}
      >
        <PitchChipCutout
          player={{
            name: player.name,
            webName: player.webName,
            team: player.team,
            teamId: player.teamId,
            photo: player.photo,
            fplPhotoCode: player.fplPhotoCode,
            apiId: player.apiId,
          }}
          name={player.name}
          size={s.cutout}
        />
      </div>
      <div
        className="-mt-1 relative flex items-center justify-center overflow-hidden rounded-[6px]"
        style={{
          width: plateW,
          height: plateH,
          paddingInline: platePadX,
          ...plate,
        }}
      >
        {showSheen ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 55%)",
            }}
          />
        ) : null}
        <span
          className={`relative z-[1] block whitespace-nowrap text-center font-semibold leading-none ${nameColor}`}
          style={{
            fontSize,
            fontFamily: font.family,
            fontWeight: font.weight,
            letterSpacing: font.tracking,
          }}
          title={surname}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
