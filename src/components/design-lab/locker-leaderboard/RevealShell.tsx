"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LabChromeNav } from "./LabChromeNav";
import { LAB_LEADERBOARD } from "./mockData";

/**
 * Reveal — homepage echo: open a row → squad hangs as nameplates.
 * Results table becomes a locker of XI’s without cloning the room photo.
 */
export function RevealShell() {
  const data = LAB_LEADERBOARD;
  const [openId, setOpenId] = useState<string | null>(
    () => data.rows.find((r) => r.isYou)?.owner ?? null,
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#141210] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1c1916_0%,#12100e_45%,#0c0b0a_100%)]" />
        <div className="absolute left-1/2 top-0 h-[30vh] w-[100vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,220,160,0.08),transparent_70%)]" />
      </div>

      <LabChromeNav theme="neon" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-44 pt-24 sm:px-6 sm:pb-48 sm:pt-28">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
              GW {data.gameweek} · Squad reveal
            </p>
            <h1 className="mt-1 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              Open a door
            </h1>
            <p className="mt-3 max-w-md text-sm text-white/40">
              Rank first — then pull the bay open and see the XI that got them there.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Pool</p>
            <p className="font-display text-2xl font-black tabular-nums">
              {data.prizePoolLabel}
              <span className="ml-1 text-sm text-white/40">{data.prizeSymbol}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {data.rows.map((row) => {
            const open = openId === row.owner;
            return (
              <div
                key={row.owner}
                className={cn(
                  "overflow-hidden rounded-sm border transition duration-300",
                  open
                    ? "border-[#00f948]/40 bg-[#181512]"
                    : row.isYou
                      ? "border-[#00f948]/25 bg-[#00f948]/[0.05]"
                      : "border-white/10 bg-black/25",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.owner)}
                  className="flex w-full items-center gap-3 px-3 py-3.5 text-left sm:gap-4 sm:px-4"
                >
                  <span
                    className={cn(
                      "w-10 font-display text-xl font-black tabular-nums",
                      row.rank <= 3 ? "text-white" : "text-white/35",
                    )}
                  >
                    #{row.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-display text-lg font-black uppercase tracking-tight sm:text-xl">
                        {row.nickname}
                      </span>
                      {row.isYou ? (
                        <span className="rounded bg-[#00f948] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                          You
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="hidden font-display text-lg font-black tabular-nums sm:block">
                    {row.finalPoints}
                    <span className="ml-1 text-xs text-white/35">pts</span>
                  </span>
                  <span className="w-20 text-right font-display text-sm font-black tabular-nums text-[#00f948] sm:w-24">
                    {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                    {open ? "Hide" : "Squad"}
                  </span>
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                          Starting XI · hung on the rail
                        </p>
                        {row.prizeAmount > 0 && !row.claimed ? (
                          <button
                            type="button"
                            className="rounded-md bg-[#00f948] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
                          >
                            Claim {row.prizeAmount}
                          </button>
                        ) : row.claimed ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#00f948]/80">
                            Claimed
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {(row.squad ?? []).map((name, i) => (
                          <div
                            key={`${row.owner}-${name}-${i}`}
                            className="relative flex h-24 w-[4.5rem] shrink-0 flex-col items-center justify-end overflow-hidden rounded-[2px] border border-white/12 px-1.5 pb-2 pt-3"
                            style={{
                              background:
                                "linear-gradient(165deg, #2a2622 0%, #1a1714 55%, #12100e 100%)",
                            }}
                          >
                            <span className="absolute left-1/2 top-0 h-3 w-[2px] -translate-x-1/2 bg-[#5a5248]" />
                            <span className="mb-1 font-display text-[9px] font-bold tabular-nums text-white/30">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-center font-display text-[10px] font-black uppercase leading-tight tracking-wide">
                              {name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
