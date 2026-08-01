"use client";

import { ResultsPlaceNav } from "./ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "./TeamSheetPieces";

/**
 * E · Sheet — reference split layout + homepage interaction grammar
 * (row → pitch lands, find me, claim pulse). No locker photo.
 */
export function TeamSheetShell() {
  const s = useTeamSheetSelection();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#08090c] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,249,72,0.06),transparent_55%),linear-gradient(180deg,#0c0e12,#08090c)]"
      />

      <ResultsPlaceNav />

      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 pb-36 pt-20 sm:px-6 sm:pt-24">
        <header className="mb-4 sm:mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
            Gameweek {String(s.data.gameweek).padStart(2, "0")} · Final results
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Team sheet
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Leaderboard + breakdown — pick a row, XI lands on the pitch.
          </p>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
          <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0e1014]/90">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-display text-lg font-black uppercase tracking-tight">
                Gameweek {String(s.data.gameweek).padStart(2, "0")}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00f948]">
                Final results
              </p>
            </div>
            <TeamSheetTable
              rows={s.data.rows}
              openOwner={s.openOwner}
              onSelect={s.select}
              className="flex-1 py-1"
            />
          </section>

          <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0e1014]/90">
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              className="flex-1 pt-3"
            />
          </section>
        </div>

        <ClaimFascia
          data={s.data}
          you={s.you}
          claimPulse={s.claimPulse}
          onClaim={s.pulseClaim}
          onFindMe={s.findMe}
          className="mt-4 rounded-xl"
        />
      </main>
    </div>
  );
}
