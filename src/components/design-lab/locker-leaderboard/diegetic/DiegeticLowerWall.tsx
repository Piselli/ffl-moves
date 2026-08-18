"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  DiegeticRoomWash,
  PLAQUE_SLOTS,
  RankPlaque,
} from "./DiegeticBits";
import { cn } from "@/lib/utils";

const MS = 520;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 1 · Lower → wall lit
 * Raise/lower the sheet. When lowered, rank plaques light up on the wall
 * (homepage kits payoff). Selected plaque stays brightest.
 */
export function DiegeticLowerWall() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const reduce = useReducedMotion();
  const [raised, setRaised] = useState(true);
  const [pointerIn, setPointerIn] = useState(false);
  const wallLit = !raised;

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (pointerIn) return;
      if (Math.abs(e.deltaY) < 6) return;
      setRaised(e.deltaY < 0);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerIn]);

  const plaques = s.data.rows.slice(0, PLAQUE_SLOTS.length);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white">
      <DiegeticRoomWash />
      <ResultsPlaceNav />

      {/* Wall plaques — diegetic payoff when sheet is down */}
      <div
        className={cn(
          "absolute inset-0 z-[20] transition-opacity duration-500",
          wallLit ? "opacity-100" : "opacity-30",
        )}
      >
        {plaques.map((row, i) => (
          <RankPlaque
            key={row.owner}
            row={row}
            slot={PLAQUE_SLOTS[i]}
            lit={wallLit}
            selected={s.openOwner === row.owner}
            onSelect={() => {
              s.select(row.owner);
              setRaised(true);
            }}
          />
        ))}
      </div>

      {!raised ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 z-30 px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00f948]/80">
            Wall live
          </p>
          <p className="mt-1 font-display text-2xl font-black uppercase tracking-tight">
            Tap a plaque · or raise the sheet
          </p>
        </div>
      ) : null}

      {!raised ? (
        <button
          type="button"
          onClick={() => setRaised(true)}
          className="fixed bottom-40 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur-md"
        >
          ↑ Raise sheet
        </button>
      ) : (
        <p className="pointer-events-none fixed bottom-40 left-1/2 z-30 hidden -translate-x-1/2 text-[10px] text-white/30 sm:block">
          Scroll down · light the wall
        </p>
      )}

      <motion.div
        className="fixed inset-x-0 bottom-28 z-40 px-3 sm:px-6"
        animate={{ y: raised ? 0 : "82%" }}
        transition={reduce ? { duration: 0 } : { duration: MS / 1000, ease: EASE }}
        onPointerEnter={() => setPointerIn(true)}
        onPointerLeave={() => setPointerIn(false)}
      >
        <div className="mx-auto max-w-xl">
          <GlassPanel className="!rounded-2xl border border-white/15 bg-black/80 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                Results sheet · GW {s.data.gameweek}
              </p>
              <button
                type="button"
                onClick={() => setRaised(false)}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#00f948]/80"
              >
                See wall
              </button>
            </div>
            <div className="max-h-[36vh] overflow-y-auto">
              {s.data.rows.map((row) => (
                <button
                  key={row.owner}
                  type="button"
                  onClick={() => s.select(row.owner)}
                  className={cn(
                    "grid w-full grid-cols-[2.5rem_1fr_3rem] gap-2 border-b border-white/[0.06] px-1 py-2.5 text-left",
                    s.openOwner === row.owner && "bg-[#00f948]/12",
                  )}
                >
                  <span className="font-display text-xs font-black tabular-nums text-white/45">
                    {row.rank}
                  </span>
                  <span className="truncate font-display text-[11px] font-bold uppercase">
                    {row.nickname}
                  </span>
                  <span className="text-right font-display text-xs font-black">
                    {row.finalPoints}
                  </span>
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
      </motion.div>
    </div>
  );
}
