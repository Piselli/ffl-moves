"use client";

import {
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Site-style frosted name chip — surname + club (locked share-card language). */
export function ShareGlassChip({
  player,
  captain = false,
  size = "md",
}: {
  player: Player;
  captain?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const ui = getTypeface().ui;
  const surname = sharePlayerSurname(player);
  const club = shareClubShort(player);
  const dims =
    size === "sm"
      ? { minW: 58, px: "px-1.5", py: "py-1", name: "text-[10px]", club: "text-[7px]", max: "max-w-[54px]" }
      : size === "lg"
        ? { minW: 96, px: "px-3.5", py: "py-2.5", name: "text-[14px]", club: "text-[10px]", max: "max-w-[88px]" }
        : { minW: 86, px: "px-3", py: "py-2", name: "text-[13px]", club: "text-[9px]", max: "max-w-[72px]" };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px]",
        dims.px,
        dims.py,
      )}
      style={{
        fontFamily: ui,
        minWidth: dims.minW,
        background: "rgba(12, 12, 14, 0.78)",
        boxShadow: captain
          ? "0 0 0 1.5px rgba(212,175,55,0.85), 0 8px 20px rgba(0,0,0,0.45)"
          : "0 0 0 1px rgba(255,255,255,0.14), 0 8px 18px rgba(0,0,0,0.42)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <span
        className={cn(
          "truncate font-semibold leading-none tracking-[-0.01em] text-white",
          dims.max,
          dims.name,
        )}
      >
        {surname}
      </span>
      <span
        className={cn(
          "mt-0.5 font-medium uppercase tracking-[0.12em] text-white/42",
          dims.club,
        )}
      >
        {club}
      </span>
    </div>
  );
}
