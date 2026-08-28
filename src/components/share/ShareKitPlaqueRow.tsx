"use client";

import {
  shareClubFooterColors,
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";
import { getPitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
import { fitPitchName } from "@/components/design-lab/locker-hero/pitchChipName";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Site pitch nameplate as a list row — white surname + kit club bar.
 * No photo (photos live on the half-pitch only).
 */
export function ShareKitPlaqueRow({
  player,
  pos,
  size = "md",
}: {
  player: Player;
  pos?: string;
  size?: "md" | "lg";
}) {
  const ui = getTypeface().ui;
  const font = getPitchChipFont();
  const surname = sharePlayerSurname(player);
  const club = shareClubShort(player);
  const footer = player.teamId
    ? shareClubFooterColors(player.teamId)
    : { bg: "#2a2d33", fg: "#FFFFFF" };
  const lg = size === "lg";
  const nameSize = lg ? 14 : 12;
  const textW = lg ? 140 : 118;
  const { label } = fitPitchName(surname, {
    widthPx: textW,
    fontFamily: font.family,
    weight: font.weight,
    letterSpacing: font.tracking,
    fixedSize: nameSize,
    allowAbbreviate: false,
  });

  return (
    <div
      className={cn(
        "flex min-w-0 items-stretch overflow-hidden rounded-[8px]",
        lg ? "h-[36px]" : "h-[30px]",
      )}
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      }}
    >
      {pos ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center border-r border-black/15 bg-white/95 font-mono font-bold uppercase tracking-[0.06em] text-black/45",
            lg ? "w-9 text-[10px]" : "w-8 text-[9px]",
          )}
        >
          {pos}
        </div>
      ) : null}
      <div
        className="flex min-w-0 flex-1 items-center bg-white px-2.5"
        style={{ fontFamily: font.family }}
      >
        <span
          className="truncate font-semibold text-[#0a0a0a]"
          style={{
            fontSize: nameSize,
            letterSpacing: font.tracking,
            fontWeight: font.weight,
          }}
          title={surname}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center px-2.5 font-bold uppercase tracking-[0.12em]",
          lg ? "min-w-[52px] text-[11px]" : "min-w-[46px] text-[10px]",
        )}
        style={{
          background: footer.bg,
          color: footer.fg,
          fontFamily: ui,
        }}
      >
        {club}
      </div>
    </div>
  );
}

/** Glass row plaque — site frosted language, larger for the list rail. */
export function ShareGlassPlaqueRow({
  player,
  pos,
}: {
  player: Player;
  pos?: string;
}) {
  const ui = getTypeface().ui;
  const surname = sharePlayerSurname(player);
  const club = shareClubShort(player);

  return (
    <div
      className="flex h-[34px] min-w-0 items-center gap-2 rounded-[10px] px-2.5"
      style={{
        fontFamily: ui,
        background: "rgba(12, 12, 14, 0.78)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.14), 0 8px 18px rgba(0,0,0,0.42)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {pos ? (
        <span className="w-7 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white/35">
          {pos}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.01em] text-white">
        {surname}
      </span>
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-white/42">
        {club}
      </span>
    </div>
  );
}
