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

  // Match pre-Phantom sizes: sm 16 · md 18 · lg 20 (h-5).
  const badgePx = size === "sm" ? 16 : size === "md" ? 18 : 20;
  const badgeFont = size === "sm" ? 8 : size === "md" ? 9 : 10;

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
      {/*
        Captain OUTSIDE the plate (desktop look). overflow:hidden on the plate
        was clipping the disc in Phantom/html2canvas.
      */}
      <div
        className="relative -mt-1"
        style={{ width: plateW, height: plateH }}
      >
        {captain ? (
          <span
            data-share-captain=""
            aria-hidden
            className="absolute z-20"
            style={{
              // Center of disc sits on the plate's top-right corner (desktop look).
              right: -Math.round(badgePx / 2),
              top: -Math.round(badgePx / 2),
              width: badgePx,
              height: badgePx,
            }}
          >
            <CaptainDisc size={badgePx} fontSize={badgeFont} />
          </span>
        ) : null}
        <div
          data-share-plate=""
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[7px]"
          style={{
            paddingInline: platePadX,
            ...plate,
          }}
        >
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
          {/*
            Live UI: flex-centered span. Capture swaps this for an SVG label
            (html2canvas cannot center custom-font baselines reliably).
          */}
          <span
            data-share-plate-label=""
            className={`relative z-[1] block whitespace-nowrap text-center font-bold leading-none ${nameColor}`}
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
    </div>
  );
}

/** SVG disc — geometric center survives html2canvas (flex/"C" text does not). */
function CaptainDisc({ size, fontSize }: { size: number; fontSize: number }) {
  const r = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle
        cx={r}
        cy={r}
        r={r - 0.5}
        fill="#fbbf24"
        stroke="#d4af37"
        strokeWidth="1"
      />
      {/* alphabetic + dy ≈ optical center of capital C across renderers */}
      <text
        x={r}
        y={r}
        dy="0.35em"
        textAnchor="middle"
        fill="#000"
        fontSize={fontSize}
        fontWeight={900}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        C
      </text>
    </svg>
  );
}
