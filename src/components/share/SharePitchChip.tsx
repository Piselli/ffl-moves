"use client";

import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { getPitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
import { fitPitchName } from "@/components/design-lab/locker-hero/pitchChipName";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";
import {
  shareClubFooterColors,
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";

export type SharePitchChipSize = "sm" | "md" | "lg";

const SIZE: Record<
  SharePitchChipSize,
  {
    cutout: number;
    plateW: number;
    textW: number;
    nameSize: number;
    nameH: number;
    clubH: number;
    clubText: string;
  }
> = {
  sm: {
    cutout: 48,
    plateW: 76,
    textW: 68,
    nameSize: 9.5,
    nameH: 17,
    clubH: 11,
    clubText: "text-[7.5px]",
  },
  md: {
    cutout: 58,
    plateW: 88,
    textW: 80,
    nameSize: 10.5,
    nameH: 19,
    clubH: 12,
    clubText: "text-[8px]",
  },
  lg: {
    cutout: 74,
    plateW: 110,
    textW: 100,
    nameSize: 12.5,
    nameH: 22,
    clubH: 14,
    clubText: "text-[9.5px]",
  },
};

/** Homepage / results pitch chip — bust cutout + nameplate. */
export function SharePitchChip({
  player,
  compact = false,
  size,
}: {
  player: Player;
  /** @deprecated prefer `size="sm"` */
  compact?: boolean;
  size?: SharePitchChipSize;
}) {
  const resolved: SharePitchChipSize = size ?? (compact ? "sm" : "md");
  const s = SIZE[resolved];
  const teamId = player.teamId ?? 0;
  const footer = teamId
    ? shareClubFooterColors(teamId)
    : { bg: "#2a2d33", fg: "#FFFFFF" };
  const club = shareClubShort(player);
  const surname = sharePlayerSurname(player);
  const ui = getTypeface().ui;

  const font = getPitchChipFont();
  const { label } = fitPitchName(surname, {
    widthPx: s.textW,
    fontFamily: font.family,
    weight: font.weight,
    letterSpacing: font.tracking,
    fixedSize: s.nameSize,
    allowAbbreviate: false,
  });

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
      <div
        className="mt-0.5 flex flex-col overflow-hidden rounded-[4px]"
        style={{
          width: s.plateW,
          background: footer.bg,
          boxShadow: "0 4px 12px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="flex items-center justify-center bg-white px-1"
          style={{ height: s.nameH, marginBottom: -1 }}
        >
          <span
            className="block text-center"
            style={{
              width: s.textW,
              maxWidth: s.textW,
              fontSize: s.nameSize,
              lineHeight: 1.15,
              fontFamily: font.family,
              fontWeight: font.weight,
              letterSpacing: font.tracking,
              whiteSpace: "nowrap",
              color: "#0a0a0a",
              WebkitFontSmoothing: "antialiased",
            }}
            title={surname}
          >
            {label}
          </span>
        </div>
        <div
          className={cn(
            "relative z-[1] flex items-center justify-center px-1 text-center font-bold uppercase tracking-[0.1em]",
            s.clubText,
          )}
          style={{
            height: s.clubH,
            background: footer.bg,
            color: footer.fg,
            fontFamily: ui,
          }}
        >
          {club}
        </div>
      </div>
    </div>
  );
}
