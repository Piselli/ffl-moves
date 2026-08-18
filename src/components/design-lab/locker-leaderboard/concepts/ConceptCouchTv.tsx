"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  useTeamSheetSelection,
} from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { cn } from "@/lib/utils";

/**
 * 2 · Couch TV — big screen is the hero; remote strip at bottom (not floating iPad).
 */
export function ConceptCouchTv() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0908] text-white">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-leaderboard/concepts/lb-room-lounge.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,transparent_0%,rgba(8,7,6,0.35)_70%,rgba(5,4,4,0.75)_100%)]" />
      </div>

      <ResultsPlaceNav />

      {/* Hero TV — interactive board */}
      <div className="absolute left-[12%] top-[14%] z-20 w-[76%] max-w-4xl sm:left-[18%] sm:top-[12%] sm:w-[64%]">
        <div className="overflow-hidden rounded-lg border border-white/20 bg-black/90 shadow-[0_30px_80px_rgba(0,0,0,0.7)] ring-1 ring-black/80">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00f948]" />
              Live board · GW {s.data.gameweek}
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-white/30">
              {s.open?.nickname ?? "—"}
            </span>
          </div>
          <div className="grid max-h-[min(52vh,28rem)] grid-cols-1 overflow-hidden sm:grid-cols-[1.1fr_1fr]">
            <div className="min-h-0 overflow-y-auto border-b border-white/10 sm:border-b-0 sm:border-r">
              {s.data.rows.map((row) => {
                const on = s.openOwner === row.owner;
                return (
                  <button
                    key={row.owner}
                    type="button"
                    onClick={() => s.select(row.owner)}
                    className={cn(
                      "grid w-full grid-cols-[2.5rem_1fr_3rem] items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-left text-sm transition",
                      on && "bg-[#00f948]/15",
                      !on && row.isYou && "bg-white/[0.04]",
                      !on && "hover:bg-white/[0.05]",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display text-xs font-black tabular-nums",
                        on || row.isYou ? "text-[#00f948]" : "text-white/45",
                      )}
                    >
                      {row.rank}
                    </span>
                    <span className="truncate font-display text-[11px] font-bold uppercase tracking-wide">
                      {row.nickname}
                    </span>
                    <span className="text-right font-display text-xs font-black tabular-nums">
                      {row.finalPoints}
                    </span>
                  </button>
                );
              })}
            </div>
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              loadingXi={s.loadingXi}
              className={cn(
                "min-h-[12rem] bg-black/40 pt-1 transition duration-300",
                !reduceMotion && "sm:min-h-[16rem]",
              )}
            />
          </div>
        </div>
      </div>

      {/* Remote strip — grounded bottom chrome */}
      <div className="fixed inset-x-0 bottom-36 z-30 px-3 sm:bottom-40 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-black/80 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="border-b border-white/10 px-4 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              Remote
            </p>
          </div>
          <ClaimFascia
            data={s.data}
            you={s.you}
            claimPulse={s.claimPulse}
            onClaim={s.pulseClaim}
            onFindMe={s.findMe}
            claiming={room.claiming}
            claimError={room.claimError}
            className="rounded-none border-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
