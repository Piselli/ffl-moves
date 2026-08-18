"use client";

import { useState } from "react";
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
 * 4 · Clipboard — tactics sheet hung on the wall (locker warmth, not iPad clone).
 * Pull = slight lift off the wall; press back to pin.
 */
export function ConceptClipboard() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const reduceMotion = useReducedMotion();
  const [pulled, setPulled] = useState(true);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-[50%_42%] opacity-55"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_40%,transparent_0%,rgba(14,12,11,0.55)_70%,rgba(10,9,8,0.88)_100%)]" />
      </div>

      <ResultsPlaceNav />

      <div className="relative z-10 flex min-h-[100dvh] items-start justify-center px-3 pb-44 pt-20 sm:px-6 sm:pt-24">
        <div
          className={cn(
            "relative w-full max-w-lg transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            pulled
              ? "translate-y-0 rotate-0 scale-100"
              : "translate-y-6 rotate-[-1.2deg] scale-[0.94]",
          )}
          style={{
            transitionDuration: reduceMotion ? "0ms" : undefined,
          }}
        >
          {/* Clip hardware */}
          <div
            aria-hidden
            className="absolute -top-3 left-1/2 z-20 flex h-7 w-28 -translate-x-1/2 items-center justify-center rounded-sm bg-[#2a2622] shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-white/15"
          >
            <div className="h-2 w-16 rounded-full bg-[#1a1714] ring-1 ring-white/10" />
          </div>

          {/* Paper / board */}
          <div className="relative overflow-hidden rounded-sm border border-[#3a342e] bg-[#141210] shadow-[0_28px_70px_rgba(0,0,0,0.65)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 18%), repeating-linear-gradient(0deg, transparent 0 27px, rgba(255,255,255,0.03) 27px 28px)",
              }}
            />

            <div className="relative border-b border-white/10 px-4 py-3 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                    Tactics · GW {s.data.gameweek}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-tight">
                    Results clipboard
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setPulled((v) => !v)}
                  className="shrink-0 border border-white/20 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60 transition hover:border-white/40 hover:text-white"
                >
                  {pulled ? "Pin to wall" : "Pull sheet"}
                </button>
              </div>
            </div>

            <div className="relative max-h-[min(36vh,18rem)] overflow-y-auto">
              {s.data.rows.map((row) => {
                const on = s.openOwner === row.owner;
                return (
                  <button
                    key={row.owner}
                    type="button"
                    onClick={() => s.select(row.owner)}
                    className={cn(
                      "grid w-full grid-cols-[2.75rem_1fr_3.25rem] items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-left transition",
                      on && "bg-[#00f948]/12",
                      !on && "hover:bg-white/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display text-sm font-black tabular-nums",
                        row.isYou || on ? "text-[#00f948]" : "text-white/45",
                      )}
                    >
                      {String(row.rank).padStart(2, "0")}
                    </span>
                    <span className="truncate font-display text-xs font-bold uppercase tracking-[0.08em]">
                      {row.nickname}
                    </span>
                    <span className="text-right font-display text-sm font-black tabular-nums">
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
              className="border-t border-white/10 pt-2"
            />
            <ClaimFascia
              data={s.data}
              you={s.you}
              claimPulse={s.claimPulse}
              onClaim={s.pulseClaim}
              onFindMe={s.findMe}
              claiming={room.claiming}
              claimError={room.claimError}
              className="rounded-none border-x-0 border-b-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
