"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "./TeamSheetPieces";

const TABLET_MS = 520;

/**
 * F · Tablet — same team-sheet layout inside homepage tablet raise/lower language.
 */
export function TeamSheetTabletShell() {
  const s = useTeamSheetSelection();
  const reduceMotion = useReducedMotion();
  const [raised, setRaised] = useState(true);
  const [pointerIn, setPointerIn] = useState(false);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (pointerIn) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) setRaised(false);
      else setRaised(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerIn]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#12100e] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#2a241c_0%,transparent_50%),radial-gradient(ellipse_at_80%_80%,#1a2a1c_0%,transparent_45%),linear-gradient(160deg,#1a1816,#0e0d0c)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-[8%] top-[18%] h-[55%] rounded-[2rem] border border-white/5 bg-white/[0.02] blur-0"
      />

      <ResultsPlaceNav />

      {/* Lowered room strip — not locker photo, warm slate atmosphere */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 px-6 pb-28 transition-opacity",
          raised ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        style={{ transitionDuration: reduceMotion ? "0ms" : `${TABLET_MS}ms` }}
      >
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
            Results desk
          </p>
          <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight">
            Gameweek {s.data.gameweek}
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/45">
            Same device language as the homepage tablet — raise to read the sheet,
            lower to breathe.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {s.data.rows
              .filter((r) => r.rank <= 3 || r.isYou)
              .map((r) => (
                <button
                  key={r.owner}
                  type="button"
                  onClick={() => {
                    s.select(r.owner);
                    setRaised(true);
                  }}
                  className={cn(
                    "rounded-sm border px-3 py-2 font-display text-xs font-black uppercase tracking-wide",
                    r.isYou || s.openOwner === r.owner
                      ? "border-[#00f948]/50 bg-[#00f948]/15 text-[#00f948]"
                      : "border-white/15 bg-black/40 text-white/70",
                  )}
                >
                  #{r.rank} {r.nickname}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 z-20 flex justify-center px-3 transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6",
          raised ? "top-[4.25rem] translate-y-0" : "top-[4.25rem] translate-y-[74vh]",
        )}
        style={{ transitionDuration: reduceMotion ? "0ms" : `${TABLET_MS}ms` }}
        onPointerEnter={() => setPointerIn(true)}
        onPointerLeave={() => setPointerIn(false)}
      >
        <div className="relative flex max-h-[calc(100dvh-5.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.4rem] border border-white/20 bg-[#0a0c10] shadow-[0_40px_120px_rgba(0,0,0,0.75)] ring-1 ring-black/50">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
              Team sheet · GW {s.data.gameweek}
            </p>
            <button
              type="button"
              onClick={() => setRaised(false)}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 hover:text-white/70"
            >
              Lower
            </button>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-2">
            <div className="min-h-[16rem] border-b border-white/10 lg:border-b-0 lg:border-r">
              <div className="border-b border-white/10 px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00f948]">
                  Final results
                </p>
              </div>
              <TeamSheetTable
                rows={s.data.rows}
                openOwner={s.openOwner}
                onSelect={s.select}
                className="max-h-[min(38vh,22rem)] lg:max-h-[min(52vh,30rem)]"
              />
            </div>
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              className="min-h-[16rem] pt-3"
            />
          </div>

          <ClaimFascia
            data={s.data}
            you={s.you}
            claimPulse={s.claimPulse}
            onClaim={s.pulseClaim}
            onFindMe={s.findMe}
            className="rounded-none border-x-0 border-b-0"
          />
        </div>
      </div>

      {!raised ? (
        <button
          type="button"
          onClick={() => setRaised(true)}
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md hover:border-[#00f948]/40 hover:text-[#00f948]"
        >
          Show tablet
        </button>
      ) : null}
    </div>
  );
}
