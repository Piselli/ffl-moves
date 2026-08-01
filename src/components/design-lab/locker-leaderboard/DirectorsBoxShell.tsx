"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LAB_LEADERBOARD } from "./mockData";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";

const TABLET_MS = 520;

/**
 * Directors' box — VIP suite over night pitch + raised tablet (homepage spatial logic, different room).
 */
export function DirectorsBoxShell() {
  const data = LAB_LEADERBOARD;
  const you = data.rows.find((r) => r.isYou);
  const reduceMotion = useReducedMotion();
  const [tabletRaised, setTabletRaised] = useState(true);
  const [pointerInTablet, setPointerInTablet] = useState(false);
  const [openOwner, setOpenOwner] = useState<string | null>(you?.owner ?? null);
  const open = data.rows.find((r) => r.owner === openOwner);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (pointerInTablet) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) setTabletRaised(false);
      else setTabletRaised(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerInTablet]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0c1018] text-white">
      {/* Suite atmosphere */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-leaderboard/concepts/lb-concept-directors-box.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-90"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,16,0.55)_0%,rgba(8,10,16,0.25)_40%,rgba(8,10,16,0.75)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#06080e] via-[#06080e]/80 to-transparent" />
      </div>

      <ResultsPlaceNav />

      {/* Lowered: room chrome */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 px-4 pb-28 pt-8 transition-opacity sm:px-8",
          tabletRaised ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        style={{ transitionDuration: reduceMotion ? "0ms" : `${TABLET_MS}ms` }}
      >
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
              Directors&apos; box · GW {data.gameweek}
            </p>
            <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Final table
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/50">
              Night suite over the pitch. Raise the tablet to read standings and claim.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Pool</p>
            <p className="font-display text-3xl font-black tabular-nums">
              {data.prizePoolLabel}
              <span className="ml-1 text-sm text-white/40">{data.prizeSymbol}</span>
            </p>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-5xl gap-2 overflow-x-auto pb-1">
          {data.rows.slice(0, 8).map((row) => (
            <button
              key={row.owner}
              type="button"
              onClick={() => {
                setOpenOwner(row.owner);
                setTabletRaised(true);
              }}
              className={cn(
                "shrink-0 rounded-sm border px-3 py-2 text-left transition",
                row.isYou || openOwner === row.owner
                  ? "border-[#00f948]/50 bg-[#00f948]/15"
                  : "border-white/15 bg-black/40 hover:border-white/30",
              )}
            >
              <span className="font-display text-lg font-black tabular-nums text-[#00f948]">
                #{row.rank}
              </span>
              <span className="ml-2 font-display text-xs font-black uppercase tracking-wide">
                {row.nickname}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tablet */}
      <div
        className={cn(
          "fixed inset-x-0 z-20 flex justify-center px-3 transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6",
          tabletRaised ? "top-[4.5rem] translate-y-0" : "top-[4.5rem] translate-y-[72vh]",
        )}
        style={{ transitionDuration: reduceMotion ? "0ms" : `${TABLET_MS}ms` }}
        onPointerEnter={() => setPointerInTablet(true)}
        onPointerLeave={() => setPointerInTablet(false)}
      >
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[1.35rem] border border-white/20 bg-[#0a0c12] shadow-[0_40px_120px_rgba(0,0,0,0.75)] ring-1 ring-black/40">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-5">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
              Standings · GW {data.gameweek}
            </p>
            <button
              type="button"
              onClick={() => setTabletRaised(false)}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 transition hover:text-white/70"
            >
              Lower
            </button>
          </div>

          <div className="max-h-[min(62vh,34rem)] overflow-y-auto">
            {data.rows.map((row, i) => {
              const on = openOwner === row.owner;
              return (
                <button
                  key={row.owner}
                  type="button"
                  onClick={() => setOpenOwner(on ? null : row.owner)}
                  className={cn(
                    "grid w-full grid-cols-[3rem_1fr_3.5rem_4.5rem] items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-left sm:px-5",
                    on
                      ? "bg-[#00f948]/15"
                      : row.isYou
                        ? "bg-[#00f948]/[0.06]"
                        : i % 2 === 0
                          ? "bg-white/[0.015] hover:bg-white/[0.04]"
                          : "hover:bg-white/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-xl font-black tabular-nums",
                      row.rank <= 3 || on ? "text-[#00f948]" : "text-white/35",
                    )}
                  >
                    {row.rank}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-display text-base font-black uppercase tracking-tight">
                      {row.nickname}
                    </span>
                    {row.isYou ? (
                      <span className="rounded bg-[#00f948] px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                        You
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right font-display text-base font-black tabular-nums">
                    {row.finalPoints}
                  </span>
                  <span className="text-right font-display text-sm font-black tabular-nums text-[#00f948]">
                    {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {open && open.prizeAmount > 0 && !open.claimed ? (
            <div className="border-t border-white/10 p-3 sm:p-4">
              <button
                type="button"
                className="w-full rounded-md bg-[#00f948] px-4 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
              >
                Claim {open.prizeAmount} {data.prizeSymbol}
              </button>
            </div>
          ) : (
            <div className="border-t border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-white/30">
              {open
                ? `${open.nickname} · ${open.finalPoints} pts`
                : "Select a finish · scroll outside to see the suite"}
            </div>
          )}
        </div>
      </div>

      {!tabletRaised ? (
        <button
          type="button"
          onClick={() => setTabletRaised(true)}
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition hover:border-[#00f948]/40 hover:text-[#00f948]"
        >
          Show tablet
        </button>
      ) : null}
    </div>
  );
}
