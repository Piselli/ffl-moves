"use client";

import { FplPhotoAvatar } from "@/components/FplPhotoAvatar";
import { fplPhotoCodeFromName } from "@/lib/fpl-photo-from-name";

export type PitchChipCutoutPlayer = {
  name: string;
  webName?: string | null;
  team?: string | null;
  teamId?: number | null;
  photo?: string | null;
  fplPhotoCode?: number | null;
  apiId?: number | null;
};

/**
 * Freestanding bust used on the squad-pick pitch and the results XI.
 * Atlas sprite first; remote portraits only as fallback.
 */
export function PitchChipCutout({
  player,
  name,
  size = 48,
}: {
  player: PitchChipCutoutPlayer;
  name: string;
  size?: number;
}) {
  const frameH = Math.round(size * 1.05);
  const code =
    player.fplPhotoCode != null && player.fplPhotoCode > 0
      ? player.fplPhotoCode
      : fplPhotoCodeFromName(player.webName || name, player.teamId);

  return (
    <span
      className="relative block shrink-0 overflow-hidden"
      style={{
        width: size,
        height: frameH,
        filter:
          "drop-shadow(0 2px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 0.5px rgba(255,255,255,0.2))",
      }}
    >
      <FplPhotoAvatar
        fplPhotoCode={code}
        apiId={player.apiId}
        photoUrl={player.photo}
        alt={name}
        size={size}
        teamName={player.team}
        initials={player.webName ?? player.name}
        eager
        className="absolute left-1/2 top-0 -translate-x-1/2"
      />
      <span className="sr-only">{name}</span>
    </span>
  );
}
