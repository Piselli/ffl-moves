"use client";

import { createContext, useContext } from "react";
import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { getSharePitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
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
    maxTextW: 84,
    maxNameSize: 18.5,
    preferMin: 15,
    plateH: 26,
    platePadX: 5,
    maxPlateW: 104,
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
  captain = false,
}: {
  player: Player;
  size?: SharePitchChipSize;
  /** site = login glass · dark = opaque plate · white = light plate */
  plateStyle?: ShareMutedChipPlateStyle;
  captain?: boolean;
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
  const font = getSharePitchChipFont();

  const plateW = uniform?.plateW ?? s.maxPlateW;
  const plateH = uniform?.plateH ?? s.plateH;
  const platePadX = uniform?.platePadX ?? s.platePadX;
  const textW = plateW - platePadX * 2;

  const { label, fontSize } = uniform
    ? {
        label: uniform.labels[player.id] ?? surname,
        fontSize:
          uniform.fontSizes[player.id] ?? uniform.fontSize,
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

  const badgePx = size === "sm" ? 15 : size === "md" ? 16 : 18;
  const badgeFont = size === "sm" ? 7 : size === "md" ? 7.5 : 8;

  return (
    <div className="flex flex-col items-center">
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
      {/* Captain on the plate — absolute-on-cutout drifts in html-to-image when busts lag. */}
      <div
        data-share-plate=""
        className="-mt-1 relative rounded-[7px]"
        style={{
          width: plateW,
          height: plateH,
          paddingInline: platePadX,
          overflow: "hidden",
          ...plate,
        }}
      >
        {captain ? (
          <span
            data-share-captain=""
            aria-hidden
            className="absolute z-20 rounded-full bg-amber-400 text-black ring-1 ring-[#d4af37]/90"
            style={{
              // Block + matching lineHeight centers "C" in html2canvas (flex fails).
              display: "block",
              width: badgePx,
              height: badgePx,
              right: -6,
              top: -8,
              fontSize: badgeFont,
              fontWeight: 900,
              lineHeight: `${badgePx}px`,
              textAlign: "center",
            }}
          >
            C
          </span>
        ) : null}
        {showSheen ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[7px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 55%)",
            }}
          />
        ) : null}
        <span
          data-share-plate-label=""
          className={`relative z-[1] block whitespace-nowrap text-center font-bold ${nameColor}`}
          style={{
            fontSize,
            fontFamily: font.family,
            fontWeight: font.weight,
            letterSpacing: font.tracking,
            // Exact line box = plate height — stable vertical center in html2canvas.
            lineHeight: `${plateH}px`,
            height: plateH,
          }}
          title={surname}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
