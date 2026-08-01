"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "./TeamSheetPieces";
import { WallBroadcast, useWallCycle } from "./WallBroadcast";
import { useResultsRoomData } from "./useResultsRoomData";
import type { LabLeaderboardRow, LabSquadPlayer } from "./mockData";

const TABLET_MS = 520;

const LOUNGE = {
  place: "Supporters’ lounge",
  src: "/design-lab/locker-leaderboard/concepts/lb-room-lounge.png",
  screen: { top: "11%", left: "22%", width: "56%" },
} as const;

/**
 * Locked results room: Lounge TV + interactive iPad.
 * Tablet = this GW (claim / XI / find me). Wall = previous GW + season highlights (passive).
 */
export function ResultsRoomShell() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const reduceMotion = useReducedMotion();
  const [raised, setRaised] = useState(true);
  const [pointerIn, setPointerIn] = useState(false);
  const { mode } = useWallCycle(false);

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0908] text-white">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={LOUNGE.src}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
      </div>

      <ResultsPlaceNav />

      {/* Wall TV — passive broadcast composited onto the lounge screen */}
      <div
        className={cn(
          "pointer-events-none absolute z-[15] transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          raised ? "opacity-85" : "opacity-100",
        )}
        style={{
          top: LOUNGE.screen.top,
          left: LOUNGE.screen.left,
          width: LOUNGE.screen.width,
          transitionDuration: reduceMotion ? "0ms" : `${TABLET_MS}ms`,
          transform: raised ? "scale(1)" : "scale(1.04)",
        }}
      >
        <WallBroadcast
          mode={mode}
          prevBoard={room.wallPrev}
          seasonHighlights={room.seasonHighlights}
          className="shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        />
      </div>

      {raised ? (
        <p className="pointer-events-none absolute bottom-[7.5rem] left-1/2 z-[18] -translate-x-1/2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Scroll down · see the lounge
        </p>
      ) : (
        <div className="absolute inset-x-0 bottom-28 z-[18] px-5">
          <div className="mx-auto flex max-w-3xl items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948] drop-shadow">
                {LOUNGE.place}
              </p>
              <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight drop-shadow sm:text-4xl">
                Results lounge
              </h1>
              <p className="mt-1 max-w-md text-sm text-white/55">
                TV tells last week and the season story. Your tablet is this
                gameweek — pick a manager, check the XI, claim if you won.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive iPad */}
      <div
        className={cn(
          "fixed inset-x-0 z-20 flex justify-center px-3 transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6",
          raised
            ? "top-[min(42vh,22rem)] translate-y-0 sm:top-[min(40vh,24rem)]"
            : "top-[4.25rem] translate-y-[78vh]",
        )}
        style={{ transitionDuration: reduceMotion ? "0ms" : `${TABLET_MS}ms` }}
        onPointerEnter={() => setPointerIn(true)}
        onPointerLeave={() => setPointerIn(false)}
      >
        <div className="relative flex max-h-[calc(100dvh-8rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.35rem] border border-white/25 bg-[#0a0c10]/97 shadow-[0_40px_120px_rgba(0,0,0,0.85)] ring-1 ring-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
                Team sheet · GW
              </p>
              {room.pickerMaxGw > 0 ? (
                <select
                  value={s.data.gameweek}
                  onChange={(e) => room.setGameweek(Number(e.target.value))}
                  className="rounded border border-white/15 bg-black/40 px-2 py-1 font-display text-xs font-black tabular-nums text-[#00f948] focus:outline-none"
                >
                  {Array.from(
                    {
                      length: Math.max(
                        1,
                        room.pickerMaxGw - room.pickerMinGw + 1,
                      ),
                    },
                    (_, i) => room.pickerMinGw + i,
                  ).map((gw) => (
                    <option key={gw} value={gw} className="bg-[#0a0c10]">
                      {gw}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-display text-xs font-black tabular-nums text-[#00f948]">
                  {s.data.gameweek}
                </span>
              )}
              {room.loading ? (
                <span className="text-[9px] uppercase tracking-[0.14em] text-white/30">
                  Loading…
                </span>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.14em] text-white/25">
                  {room.source === "live" ? "Live" : "Preview"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRaised(false)}
              className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#00f948]/80 hover:text-[#00f948]"
            >
              See lounge
            </button>
          </div>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
            <div className="min-h-[12rem] border-b border-white/10 lg:border-b-0 lg:border-r">
              <div className="border-b border-white/10 px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00f948]">
                  This gameweek · interactive
                </p>
              </div>
              <TeamSheetTable
                rows={s.data.rows}
                openOwner={s.openOwner}
                onSelect={s.select}
                className="max-h-[min(28vh,16rem)] lg:max-h-[min(36vh,20rem)]"
              />
            </div>
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              loadingXi={s.loadingXi}
              className="min-h-[12rem] pt-2"
            />
          </div>

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

      {!raised ? (
        <button
          type="button"
          onClick={() => setRaised(true)}
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-md hover:border-[#00f948]/40 hover:text-[#00f948]"
        >
          Show tablet
        </button>
      ) : null}
    </div>
  );
}

/** @deprecated Lounge is locked — kept for type imports in old experiments. */
export type ResultsRoomId = "lounge";

export const RESULTS_ROOM_LIST = [
  { id: "lounge" as const, label: "Lounge", place: LOUNGE.place },
];

// Re-export helpers used by pitch when wiring XI into open row
export type { LabLeaderboardRow, LabSquadPlayer };
