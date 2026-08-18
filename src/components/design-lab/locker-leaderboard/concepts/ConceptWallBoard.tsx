"use client";

import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  useTeamSheetSelection,
} from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { cn } from "@/lib/utils";

/**
 * 1 · Wall Board — the wall IS the leaderboard. No floating tablet.
 * Tap a rung → XI sheet slides up from the wall.
 */
export function ConceptWallBoard() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#080706] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,#1a1714_0%,#080706_55%)]" />
        <div className="absolute inset-y-0 left-[8%] w-px bg-white/[0.06]" />
        <div className="absolute inset-y-0 right-[8%] w-px bg-white/[0.06]" />
        <div className="absolute inset-x-[8%] top-[5.5rem] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <ResultsPlaceNav />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-4 pb-44 pt-20 sm:px-6 sm:pt-24">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            GW {s.data.gameweek}
            {room.source === "live" ? " · Live" : " · Preview"}
          </p>
          <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Wall board
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/40">
            Rank rungs on the wall. Tap a manager — XI pulls out of the board.
          </p>
        </header>

        <ul className="flex flex-1 flex-col gap-1.5">
          {s.data.rows.map((row) => {
            const on = s.openOwner === row.owner;
            return (
              <li key={row.owner}>
                <button
                  type="button"
                  onClick={() => s.select(row.owner)}
                  className={cn(
                    "flex w-full items-stretch text-left transition active:scale-[0.995]",
                    on && "translate-x-1",
                  )}
                >
                  <span
                    className={cn(
                      "flex w-14 shrink-0 items-center justify-center border font-display text-base font-black tabular-nums sm:w-16 sm:text-lg",
                      on || row.isYou
                        ? "border-[#00f948]/45 bg-[#00f948]/15 text-[#00f948]"
                        : "border-white/15 bg-white/[0.04] text-white/55",
                    )}
                  >
                    {row.rank}
                  </span>
                  <span
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between gap-3 border border-l-0 px-3 py-3 sm:px-4",
                      on
                        ? "border-[#00f948]/40 bg-[#00f948]/[0.07]"
                        : "border-white/12 bg-[#0c0b0a]/90 hover:border-white/22",
                    )}
                  >
                    <span className="truncate font-display text-sm font-bold uppercase tracking-[0.06em]">
                      {row.nickname}
                      {row.isYou ? (
                        <span className="ml-2 text-[9px] text-[#00f948]/80">
                          you
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-display text-lg font-black tabular-nums">
                      {row.finalPoints}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* XI sheet — emerges from wall */}
        <div className="mt-4 overflow-hidden border border-white/12 bg-[#0a0908]/95">
          <TeamSheetPitch
            manager={s.open}
            landKey={s.landKey}
            loadingXi={s.loadingXi}
            className="max-h-[38vh] pt-2"
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
  );
}
