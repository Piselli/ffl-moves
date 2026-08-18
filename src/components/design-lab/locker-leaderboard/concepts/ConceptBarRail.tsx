"use client";

import Image from "next/image";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";

/**
 * 3 · Bar Rail — device rests on the bar surface (contact shadow), not floating mid-air.
 */
export function ConceptBarRail() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0908] text-white">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-leaderboard/concepts/lb-room-bar.png"
          alt=""
          fill
          priority
          className="object-cover object-[50%_40%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/50" />
      </div>

      <ResultsPlaceNav />

      <div className="absolute inset-x-0 top-[18%] z-10 px-5 sm:top-[20%]">
        <div className="mx-auto max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 drop-shadow">
            Supporters’ bar
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight drop-shadow sm:text-4xl">
            Results on the rail
          </h1>
        </div>
      </div>

      {/* Tablet sitting on bar — perspective grounded */}
      <div className="fixed inset-x-0 bottom-32 z-20 flex justify-center px-3 sm:bottom-36 sm:px-6">
        <div className="relative w-full max-w-3xl">
          {/* Contact shadow on the bar */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-3 left-[8%] right-[8%] h-8 rounded-[100%] bg-black/70 blur-xl"
          />
          <div
            className="relative flex max-h-[min(58vh,32rem)] flex-col overflow-hidden rounded-[1.1rem] border border-white/20 bg-[#050505]/96 shadow-[0_24px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
            style={{
              transform: "perspective(1200px) rotateX(8deg)",
              transformOrigin: "50% 100%",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                Team sheet · GW {s.data.gameweek}
              </p>
              {room.pickerMaxGw > 0 ? (
                <select
                  value={s.data.gameweek}
                  onChange={(e) => room.setGameweek(Number(e.target.value))}
                  className="rounded border border-white/15 bg-black/50 px-2 py-1 text-[10px] font-bold tabular-nums text-white/80 focus:outline-none"
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
                    <option key={gw} value={gw} className="bg-black">
                      {gw}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="grid min-h-0 flex-1 overflow-hidden sm:grid-cols-2">
              <TeamSheetTable
                rows={s.data.rows}
                openOwner={s.openOwner}
                onSelect={s.select}
                className="max-h-[min(28vh,14rem)] border-b border-white/10 sm:max-h-none sm:border-b-0 sm:border-r"
              />
              <TeamSheetPitch
                manager={s.open}
                landKey={s.landKey}
                loadingXi={s.loadingXi}
                className="min-h-[10rem] pt-1"
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
      </div>
    </div>
  );
}
