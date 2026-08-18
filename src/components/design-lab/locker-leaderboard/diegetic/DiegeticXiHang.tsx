"use client";

import { useState } from "react";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  DiegeticRoomWash,
  HungXiStrip,
  XI_HOOKS,
} from "./DiegeticBits";
import { cn } from "@/lib/utils";

/**
 * 2 · Select → XI in the room
 * Pick a manager — their XI hangs into the space (homepage kits language),
 * not only inside a pitch panel.
 */
export function DiegeticXiHang() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const [sheetOpen, setSheetOpen] = useState(true);
  const xi = s.open?.xi ?? [];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white">
      <DiegeticRoomWash src="/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png" />
      <ResultsPlaceNav />

      {/* Hung XI — diegetic */}
      <div className="absolute inset-0 z-[25]">
        {XI_HOOKS.map((hook, i) => {
          const player = xi[i];
          if (!player) return null;
          return (
            <HungXiStrip
              key={`${s.openOwner}-${player.name}-${i}`}
              player={player}
              hook={hook}
              index={i}
              visible={Boolean(s.open && xi.length)}
            />
          );
        })}
      </div>

      {!sheetOpen && s.open ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-36 z-30 px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00f948]/80">
            {s.open.nickname} · XI hung
          </p>
          <p className="mt-1 font-display text-2xl font-black uppercase tracking-tight">
            {s.loadingXi ? "Loading kit…" : `${xi.length || 0} players in the room`}
          </p>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-28 z-40 px-3 sm:px-6">
        <div className="mx-auto max-w-xl">
          <GlassPanel className="!rounded-2xl border border-white/15 bg-black/80 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Pick manager · hang XI
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  Selection materializes players in the room
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#00f948]/80"
              >
                {sheetOpen ? "Hide list" : "Show list"}
              </button>
            </div>
            {sheetOpen ? (
              <div className="max-h-[32vh] overflow-y-auto">
                {s.data.rows.map((row) => (
                  <button
                    key={row.owner}
                    type="button"
                    onClick={() => {
                      s.select(row.owner);
                      setSheetOpen(false);
                    }}
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
            ) : (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="w-full py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white/50"
              >
                Change manager
              </button>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
