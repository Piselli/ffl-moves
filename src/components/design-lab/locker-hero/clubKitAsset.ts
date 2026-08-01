/**
 * Kit asset URLs for locker-hero.
 *
 * Preferred: per-bay cutouts from locked-background club plates
 * (`kit/hang-bay/t{N}/{bayId}.webp`) — see kit/HANG_ASSET_BRIEF.md.
 * Fallback: legacy studio hang sprites (`kit/hang/t{N}-home.png`).
 */

import { HANG_BAY_PACK_TEAM_IDS } from "./hangBayPack.generated";

export type KitRole = "home" | "gk";

export type ClubKitRef = {
  src: string;
  /**
   * true = full-frame plate-aligned cutout (geometry+light baked).
   * false = legacy sprite that needs CSS yaw / fake shadow.
   */
  plateAligned: boolean;
};

const HANG_BAY_BASE = "/design-lab/locker-hero/kit/hang-bay";
const HANG_FALLBACK_BASE = "/design-lab/locker-hero/kit/hang";

/** FPL teamIds 1–20 */
const HANG_HOME_IDS = new Set(
  Array.from({ length: 20 }, (_, i) => i + 1),
);

/** Teams with extracted hang-bay pack on disk (from extract-hang-bays.py). */
export const HANG_BAY_PACK_TEAMS = new Set<number>(HANG_BAY_PACK_TEAM_IDS);

export function clubKitRole(
  position: "GK" | "DEF" | "MID" | "FWD" | string | undefined,
): KitRole {
  return position === "GK" ? "gk" : "home";
}

/**
 * Live pick URL for a club kit on a specific hook.
 * bayIndex 0–13 maps to HANG_BAYS ids (h1…h11, hb1…hb3).
 */
export function clubKitSrc(
  teamId: number,
  bayIndex: number,
  bayId: string,
  position?: "GK" | "DEF" | "MID" | "FWD" | string,
): ClubKitRef | null {
  if (!Number.isFinite(teamId) || !HANG_HOME_IDS.has(teamId)) return null;
  void position;
  void bayIndex;

  if (HANG_BAY_PACK_TEAMS.has(teamId)) {
    return {
      // v=8 = hb3/h1 extend to frame (no clipped outer sleeves)
      src: `${HANG_BAY_BASE}/t${teamId}/${bayId}.webp?v=8`,
      plateAligned: true,
    };
  }

  return {
    src: `${HANG_FALLBACK_BASE}/t${teamId}-home.png`,
    plateAligned: false,
  };
}
