"use client";

import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HANG_BAY_PACK_TEAMS, clubKitSrc } from "./clubKitAsset";
import { HANG_BAYS, HANG_KIT_PLATES } from "./hangBays";
import { HangIdentity, usePlateCoverRect } from "./HangIdentity";
import { HangingKit } from "./HangingKit";

type Props = {
  starters: (Player | null)[];
  bench: (Player | null)[];
  roomBackgroundId: string;
  /** When the tablet is lowered, lift kits above the WebGL layer. */
  roomFocused?: boolean;
  glowId?: import("./nameplateGlows").NameplateGlowId;
  /** Lab may apply localStorage calibrator overrides; site uses baked quads. */
  preferBakedQuads?: boolean;
};

function playerAtBay(
  starters: (Player | null)[],
  bench: (Player | null)[],
  bayIndex: number,
): Player | null {
  if (bayIndex < 11) return starters[bayIndex] ?? null;
  return bench[bayIndex - 11] ?? null;
}

const KIT_ASPECT = "500 / 820";

/**
 * Live pick → kit on empty-plate hooks.
 * Prefers full-frame hang-bay cutouts (pixel-locked). Falls back to sprites.
 * Slots are keyed by bay so randomize/picks swap in place — no fade flash.
 */
export function LockerKits({
  starters,
  bench,
  roomBackgroundId,
  roomFocused = false,
  glowId,
  preferBakedQuads = true,
}: Props) {
  const { hostRef, cover } = usePlateCoverRect();
  if (!HANG_KIT_PLATES.has(roomBackgroundId)) return null;

  return (
    <div
      ref={hostRef}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        roomFocused ? "z-[65]" : "z-[15]",
      )}
      aria-hidden
    >
      {HANG_BAYS.map((bay, bayIndex) => {
        const player = playerAtBay(starters, bench, bayIndex);
        if (!player) return null;

        const kit = clubKitSrc(
          player.teamId,
          bayIndex,
          bay.id,
          player.position,
        );
        const plateAligned = Boolean(
          kit?.plateAligned || HANG_BAY_PACK_TEAMS.has(player.teamId),
        );

        if (plateAligned) {
          return (
            <div key={bay.id} className="absolute inset-0 origin-center">
              <HangingKit
                teamId={player.teamId}
                bay={bay}
                bayIndex={bayIndex}
                position={player.position}
                fullBleed
              />
            </div>
          );
        }

        return (
          <div
            key={bay.id}
            className="absolute origin-top"
            style={{
              left: `${bay.left}%`,
              top: `${bay.top}%`,
              width: `${bay.width}%`,
              aspectRatio: KIT_ASPECT,
              transform: "translate(-50%, 0)",
            }}
          >
            <div className="relative h-full w-full origin-top">
              <HangingKit
                teamId={player.teamId}
                bay={bay}
                bayIndex={bayIndex}
                position={player.position}
              />
            </div>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-0">
        {HANG_BAYS.map((bay, bayIndex) => {
          const player = playerAtBay(starters, bench, bayIndex);
          if (!player) return null;
          return (
            <HangIdentity
              key={bay.id}
              player={player}
              bay={bay}
              plateAligned
              glowId={glowId}
              preferBakedQuads={preferBakedQuads}
              cover={cover}
            />
          );
        })}
      </div>
    </div>
  );
}
