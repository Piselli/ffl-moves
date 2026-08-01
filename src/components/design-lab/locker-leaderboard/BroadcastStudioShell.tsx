"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LAB_LEADERBOARD } from "./mockData";
import { ResultsPlaceNav, SquadStrip } from "./ResultsPlaceChrome";

/**
 * Broadcast studio — ESPN / Sky desk: big LED wall + lower-third + ticker.
 */
export function BroadcastStudioShell() {
  const data = LAB_LEADERBOARD;
  const you = data.rows.find((r) => r.isYou);
  const [openOwner, setOpenOwner] = useState<string | null>(you?.owner ?? null);
  const open = data.rows.find((r) => r.owner === openOwner);
  const ticker = data.rows
    .slice(0, 10)
    .map((r) => `#${r.rank} ${r.nickname} ${r.finalPoints}pts`)
    .join("  ·  ");

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#05070c] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#0a1020_0%,#05070c_45%,#03050a_100%)]" />
        <div className="absolute -left-20 top-10 h-[50vh] w-[50vh] rounded-full bg-[#1b3a8a]/25 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[50vw] bg-[#0a2a18]/30 blur-[90px]" />
        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(0deg,rgba(20,30,50,0.9),transparent)]" />
        <div className="absolute inset-x-[10%] bottom-[12%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <ResultsPlaceNav />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-36 pt-24 sm:px-6 sm:pb-40">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-sm bg-[#e10600] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            On air
          </span>
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
            MoveMatch Studio · GW {data.gameweek} Results
          </span>
        </div>

        <div className="overflow-hidden rounded-sm border border-white/15 bg-[#070b14] shadow-[0_40px_100px_rgba(0,0,0,0.65)]">
          <div className="flex items-end justify-between gap-4 border-b border-white/10 bg-[linear-gradient(90deg,#0c1630,#0a1a12)] px-4 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
                Final table
              </p>
              <h1 className="mt-1 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">
                Gameweek {data.gameweek}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Prize pool</p>
              <p className="font-display text-3xl font-black tabular-nums sm:text-4xl">
                {data.prizePoolLabel}
                <span className="ml-1 text-sm text-white/40">{data.prizeSymbol}</span>
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_0.9fr]">
            <div className="max-h-[min(52vh,30rem)] overflow-y-auto border-b border-white/10 lg:border-b-0 lg:border-r">
              {data.rows.map((row, i) => {
                const on = openOwner === row.owner;
                return (
                  <button
                    key={row.owner}
                    type="button"
                    onClick={() => setOpenOwner(on ? null : row.owner)}
                    className={cn(
                      "grid w-full grid-cols-[3.5rem_1fr_4rem_5rem] items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-left transition sm:px-5",
                      on
                        ? "bg-[#00f948]/15"
                        : row.isYou
                          ? "bg-[#00f948]/[0.06]"
                          : i % 2 === 0
                            ? "bg-white/[0.02] hover:bg-white/[0.05]"
                            : "hover:bg-white/[0.05]",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display text-2xl font-black tabular-nums",
                        row.rank <= 3 || on ? "text-[#00f948]" : "text-white/35",
                      )}
                    >
                      {row.rank}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-display text-base font-black uppercase tracking-tight sm:text-lg">
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
                    <span className="text-right font-display text-base font-black tabular-nums text-[#00f948]">
                      {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col justify-between bg-[#0a1020] p-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Selected finish
                </p>
                {open ? (
                  <>
                    <p className="mt-2 font-display text-5xl font-black tabular-nums text-[#00f948]">
                      #{open.rank}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight">
                      {open.nickname}
                    </h2>
                    <p className="mt-2 text-sm text-white/45">
                      {open.finalPoints} pts ·{" "}
                      {open.prizeAmount > 0
                        ? `${open.prizeAmount} ${data.prizeSymbol}`
                        : "no prize"}
                    </p>
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                        Starting XI
                      </p>
                      <SquadStrip squad={open.squad} />
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-white/35">
                    Click a row — graphics package locks on.
                  </p>
                )}
              </div>
              {open && open.prizeAmount > 0 && !open.claimed ? (
                <button
                  type="button"
                  className="mt-6 rounded-md bg-[#00f948] px-4 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
                >
                  Claim {open.prizeAmount} {data.prizeSymbol}
                </button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden border-t border-white/10 bg-[#00f948] py-2 text-black">
            <p className="whitespace-nowrap px-4 font-display text-xs font-black uppercase tracking-[0.12em]">
              {ticker}
              {"  ·  "}
              Pool {data.prizePoolLabel} {data.prizeSymbol}
              {"  ·  "}
              {data.entries} entries
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">
          Studio desk · results on the LED wall
        </p>
      </main>
    </div>
  );
}
