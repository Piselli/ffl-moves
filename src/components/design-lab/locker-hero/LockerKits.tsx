"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

type HungPlayer = {
  bayIndex: number;
  player: Player;
};

function collectHung(
  starters: (Player | null)[],
  bench: (Player | null)[],
): HungPlayer[] {
  const out: HungPlayer[] = [];
  starters.forEach((player, i) => {
    if (!player) return;
    out.push({ bayIndex: i, player });
  });
  bench.forEach((player, i) => {
    if (!player) return;
    out.push({ bayIndex: 11 + i, player });
  });
  return out;
}

const KIT_ASPECT = "500 / 820";

/**
 * Live pick → kit on empty-plate hooks.
 * Prefers full-frame hang-bay cutouts (pixel-locked). Falls back to sprites.
 */
export function LockerKits({
  starters,
  bench,
  roomBackgroundId,
  roomFocused = false,
  glowId,
  preferBakedQuads = true,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { hostRef, cover } = usePlateCoverRect();
  if (!HANG_KIT_PLATES.has(roomBackgroundId)) return null;

  const hung = collectHung(starters, bench);

  return (
    <div
      ref={hostRef}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        roomFocused ? "z-[65]" : "z-[15]",
      )}
      aria-hidden
    >
      <AnimatePresence mode="popLayout">
        {hung.map(({ bayIndex, player }) => {
          const bay = HANG_BAYS[bayIndex];
          if (!bay) return null;

          const kit = clubKitSrc(
            player.teamId,
            bayIndex,
            bay.id,
            player.position,
          );
          const plateAligned = Boolean(
            kit?.plateAligned || HANG_BAY_PACK_TEAMS.has(player.teamId),
          );
          const sway = bay.yaw >= 0 ? -1.6 : 1.6;

          if (plateAligned) {
            return (
              <motion.div
                key={`${player.id}-${bay.id}`}
                className="absolute inset-0 origin-center"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, transition: { duration: 0.22 } }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.45,
                        delay: 0.04 + bayIndex * 0.012,
                        ease: [0.22, 1, 0.32, 1],
                      }
                }
              >
                <HangingKit
                  teamId={player.teamId}
                  bay={bay}
                  bayIndex={bayIndex}
                  position={player.position}
                  fullBleed
                />
              </motion.div>
            );
          }

          return (
            <div
              key={player.id}
              className="absolute origin-top"
              style={{
                left: `${bay.left}%`,
                top: `${bay.top}%`,
                width: `${bay.width}%`,
                aspectRatio: KIT_ASPECT,
                transform: "translate(-50%, 0)",
              }}
            >
              <motion.div
                className="relative h-full w-full origin-top"
                initial={
                  reduceMotion
                    ? false
                    : {
                        opacity: 0,
                        y: "-18%",
                        rotate: sway * 1.1,
                        scale: 0.97,
                      }
                }
                animate={
                  reduceMotion
                    ? { opacity: 1, y: "0%", rotate: 0, scale: 1 }
                    : {
                        opacity: 1,
                        y: ["-18%", "1.2%", "0%"],
                        rotate: [sway * 1.1, -sway * 0.45, 0],
                        scale: 1,
                      }
                }
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        y: "-10%",
                        rotate: sway * 0.4,
                        transition: {
                          duration: 0.26,
                          ease: [0.4, 0, 0.2, 1],
                        },
                      }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.72,
                        delay: 0.05 + bayIndex * 0.016,
                        times: [0, 0.62, 1],
                        ease: [0.22, 1, 0.32, 1],
                      }
                }
              >
                <HangingKit
                  teamId={player.teamId}
                  bay={bay}
                  bayIndex={bayIndex}
                  position={player.position}
                />
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>

      {/* Door nameplates — corner-pinned on the same object-cover stage as the plate */}
      <div className="pointer-events-none absolute inset-0">
        {hung.map(({ bayIndex, player }) => {
          const bay = HANG_BAYS[bayIndex];
          if (!bay) return null;
          return (
            <HangIdentity
              key={`plaque-${player.id}-${bay.id}`}
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
