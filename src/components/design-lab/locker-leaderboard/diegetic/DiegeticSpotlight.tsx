"use client";

import { useEffect, useMemo, useState } from "react";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  DiegeticRoomWash,
  PLAQUE_SLOTS,
  RankPlaque,
  RoomSpotlight,
} from "./DiegeticBits";
import { cn } from "@/lib/utils";

/**
 * 4 · Find me → spotlight
 * Find me swings a green cone onto your plaque and scrolls the room focus to you.
 */
export function DiegeticSpotlight() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const [spotlight, setSpotlight] = useState(false);

  const plaques = s.data.rows.slice(0, PLAQUE_SLOTS.length);
  const youIndex = useMemo(() => {
    const i = plaques.findIndex((r) => r.isYou);
    if (i >= 0) return i;
    return plaques.findIndex((r) => r.owner === s.openOwner);
  }, [plaques, s.openOwner]);

  const youSlot =
    youIndex >= 0 ? PLAQUE_SLOTS[youIndex] : PLAQUE_SLOTS[0];
  const youRow = youIndex >= 0 ? plaques[youIndex] : undefined;

  const findMe = () => {
    if (youRow) s.select(youRow.owner);
    setSpotlight(true);
    const el = document.getElementById("diegetic-you-plaque");
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    window.setTimeout(() => setSpotlight(false), 2800);
  };

  useEffect(() => {
    // Ensure "you" plaque exists for demo: prefer isYou, else first row marked visually
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white">
      <DiegeticRoomWash />
      <ResultsPlaceNav />

      <RoomSpotlight
        active={spotlight}
        targetLeft={youSlot.left}
        targetTop={youSlot.top}
      />

      <div className="absolute inset-0 z-[20]">
        {plaques.map((row, i) => (
          <RankPlaque
            key={row.owner}
            row={{
              ...row,
              // Demo: if no wallet you, treat selected as spotlight target capable
              isYou: row.isYou || (!plaques.some((r) => r.isYou) && i === 0),
            }}
            slot={PLAQUE_SLOTS[i]}
            lit
            selected={s.openOwner === row.owner}
            spotlighted={
              spotlight &&
              (row.isYou ||
                (!plaques.some((r) => r.isYou) && i === 0) ||
                row.owner === youRow?.owner)
            }
            onSelect={() => s.select(row.owner)}
          />
        ))}
      </div>

      {spotlight ? (
        <div className="pointer-events-none absolute inset-x-0 top-[72%] z-30 px-6 text-center">
          <p className="font-display text-xl font-black uppercase tracking-tight text-[#00f948]">
            Found you
          </p>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-28 z-40 px-3 sm:px-6">
        <div className="mx-auto max-w-xl">
          <GlassPanel className="!rounded-2xl border border-white/15 bg-black/80 p-4 backdrop-blur-xl">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
              Spotlight finder · GW {s.data.gameweek}
            </p>
            <p className="mt-1 text-sm text-white/45">
              Find me lights a cone on your plaque in the room — not a list
              scroll alone.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <p className="text-[11px] text-white/40">
                {youRow
                  ? `Target · ${youRow.nickname} #${youRow.rank}`
                  : "No target"}
              </p>
              <button
                type="button"
                onClick={findMe}
                className={cn(
                  "ml-auto rounded-xl bg-[#00f948] px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[0_0_28px_rgba(0,249,72,0.35)] transition active:scale-[0.98]",
                )}
              >
                Find me · spotlight
              </button>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
