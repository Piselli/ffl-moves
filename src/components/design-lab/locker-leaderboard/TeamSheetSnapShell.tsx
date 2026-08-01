"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";
import {
  ClaimFascia,
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "./TeamSheetPieces";

/**
 * G · Snap — condensed table (top / you / last) like the ref mock.
 * Find me snaps + pitch re-lands; claim locks the fascia.
 */
export function TeamSheetSnapShell() {
  const s = useTeamSheetSelection();
  const [snapTick, setSnapTick] = useState(0);
  const [pitchOpen, setPitchOpen] = useState(true);

  const findMe = () => {
    s.findMe();
    setSnapTick((t) => t + 1);
    setPitchOpen(true);
  };

  const select = (owner: string) => {
    s.select(owner);
    setPitchOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        findMe();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.you?.owner]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#07080b] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,#0b0d11_0%,#07080b_100%)]"
      />

      <ResultsPlaceNav />

      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-4 pb-36 pt-20 sm:px-6 sm:pt-24">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
              Snap standings · GW {String(s.data.gameweek).padStart(2, "0")}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              See what they scored
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
            Press F · find me
          </p>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <section
            className={cn(
              "flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0e1014]/95 transition duration-300",
              snapTick > 0 && "ring-1 ring-[#00f948]/35",
            )}
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-display text-lg font-black uppercase tracking-tight">
                Gameweek {String(s.data.gameweek).padStart(2, "0")}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00f948]">
                Condensed · top / you / last
              </p>
            </div>
            <TeamSheetTable
              rows={s.data.rows}
              openOwner={s.openOwner}
              onSelect={select}
              condensed
              scrollToYou={snapTick > 0}
              className="flex-1 py-1"
            />
          </section>

          <section
            className={cn(
              "relative flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#0e1014]/95 transition duration-500",
              pitchOpen ? "opacity-100 translate-y-0" : "opacity-60 translate-y-2",
            )}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <p className="font-display text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                {s.open?.isYou ? "Your team" : `${s.open?.nickname ?? "—"} XI`}
              </p>
              <button
                type="button"
                onClick={() => setPitchOpen((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 hover:text-white/70"
              >
                {pitchOpen ? "Dim" : "Raise"}
              </button>
            </div>
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey + snapTick}
              label=" "
              className="flex-1 pt-2"
            />
          </section>
        </div>

        <ClaimFascia
          data={s.data}
          you={s.you}
          claimPulse={s.claimPulse}
          onClaim={s.pulseClaim}
          onFindMe={findMe}
          className="mt-4 rounded-xl"
        />
      </main>
    </div>
  );
}
