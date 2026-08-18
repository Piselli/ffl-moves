"use client";

import { useRef } from "react";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  useTeamSheetSelection,
} from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { cn } from "@/lib/utils";

/**
 * 5 · Dugout — horizontal manager bench; select a plate → XI above as tunnel tactics.
 */
export function ConceptDugout() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const railRef = useRef<HTMLDivElement>(null);

  const findMe = () => {
    s.findMe();
    const el = document.getElementById("dugout-you");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#06080a] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,#1a2228_0%,#06080a_55%)]" />
        <div className="absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_100%)]" />
        {/* Tunnel perspective lines */}
        <div className="absolute left-1/2 top-0 h-[48%] w-px -translate-x-1/2 bg-gradient-to-b from-white/15 to-transparent" />
        <div className="absolute left-[20%] top-0 h-[40%] w-px bg-gradient-to-b from-white/8 to-transparent" />
        <div className="absolute right-[20%] top-0 h-[40%] w-px bg-gradient-to-b from-white/8 to-transparent" />
      </div>

      <ResultsPlaceNav />

      <div className="relative z-10 flex min-h-[100dvh] flex-col pb-40 pt-20">
        <header className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Tunnel · GW {s.data.gameweek}
          </p>
          <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Dugout
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/40">
            Swipe the bench. Selected manager’s XI hangs in the tunnel light.
          </p>
        </header>

        {/* XI in the tunnel light */}
        <div className="mx-auto mt-4 w-full max-w-3xl flex-1 px-3 sm:px-6">
          <div className="h-full min-h-[14rem] overflow-hidden border border-white/10 bg-black/35 backdrop-blur-[2px]">
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              loadingXi={s.loadingXi}
              className="h-full pt-2"
            />
          </div>
        </div>

        {/* Bench rail */}
        <div className="mt-4 border-t border-white/10 bg-black/50 pb-2 pt-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between px-4 sm:px-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              Manager bench
            </p>
            <button
              type="button"
              onClick={findMe}
              className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#00f948]/80 hover:text-[#00f948]"
            >
              Find me
            </button>
          </div>
          <div
            ref={railRef}
            className="flex gap-2 overflow-x-auto px-4 pb-2 sm:px-6"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {s.data.rows.map((row) => {
              const on = s.openOwner === row.owner;
              return (
                <button
                  key={row.owner}
                  id={row.isYou ? "dugout-you" : undefined}
                  type="button"
                  onClick={() => s.select(row.owner)}
                  className={cn(
                    "flex h-[5.5rem] w-[4.6rem] shrink-0 flex-col justify-between rounded-[2px] border px-2 py-2 text-left transition active:scale-[0.97]",
                    on
                      ? "border-[#00f948]/50 bg-[#00f948]/15"
                      : row.isYou
                        ? "border-[#00f948]/30 bg-white/[0.04]"
                        : "border-white/12 bg-[#12161a] hover:border-white/25",
                  )}
                  style={{ scrollSnapAlign: "center" }}
                >
                  <span
                    className={cn(
                      "font-display text-lg font-black tabular-nums leading-none",
                      on || row.isYou ? "text-[#00f948]" : "text-white/40",
                    )}
                  >
                    {row.rank}
                  </span>
                  <span>
                    <span className="line-clamp-2 font-display text-[9px] font-bold uppercase leading-tight tracking-wide">
                      {row.nickname}
                    </span>
                    <span className="mt-0.5 block font-display text-[11px] font-black tabular-nums text-white/70">
                      {row.finalPoints}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-3 pt-2 sm:px-6">
          <div className="mx-auto max-w-3xl overflow-hidden border border-white/10 bg-black/60">
            <ClaimFascia
              data={s.data}
              you={s.you}
              claimPulse={s.claimPulse}
              onClaim={s.pulseClaim}
              onFindMe={findMe}
              claiming={room.claiming}
              claimError={room.claimError}
              className="rounded-none border-0 bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
