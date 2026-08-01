"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LabChromeNav } from "./LabChromeNav";
import { LAB_LEADERBOARD } from "./mockData";

/**
 * Nameplate wall — each finish is a locker door plaque.
 * Open a plate for points / prize / claim. Brand continuity with hero doors.
 */
export function NameplateWallShell() {
  const data = LAB_LEADERBOARD;
  const [open, setOpen] = useState<string | null>(
    () => data.rows.find((r) => r.isYou)?.owner ?? data.rows[0]?.owner ?? null,
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#161412] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1c1916_0%,#12100e_50%,#0d0c0b_100%)]" />
        <div className="absolute inset-x-0 top-[6.5rem] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-x-[10%] top-[6.4rem] h-2 rounded-full bg-[linear-gradient(90deg,#2a2622,#4a433c,#2a2622)]" />
      </div>

      <LabChromeNav theme="neon" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-44 pt-24 sm:px-6 sm:pb-48 sm:pt-28">
        <div className="mb-10 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
            GW {data.gameweek} · Wall of finishes
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
            Nameplate table
          </h1>
          <p className="mt-3 text-sm text-white/40">
            Same door language as the homepage — ranks hang on a rail, open to claim.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {data.rows.map((row) => {
            const isOpen = open === row.owner;
            return (
              <button
                key={row.owner}
                type="button"
                onClick={() => setOpen(isOpen ? null : row.owner)}
                className={cn(
                  "group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[2px] border text-left transition duration-300",
                  isOpen
                    ? "-translate-y-2 border-[#00f948]/50 shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                    : row.isYou
                      ? "border-[#00f948]/30 hover:-translate-y-1"
                      : "border-white/12 hover:-translate-y-1 hover:border-white/25",
                )}
                style={{
                  background:
                    "linear-gradient(165deg, #2a2622 0%, #1a1714 55%, #12100e 100%)",
                }}
              >
                <span className="absolute left-1/2 top-0 z-10 h-4 w-[3px] -translate-x-1/2 bg-[#5a5248]" />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity",
                    isOpen || row.isYou ? "opacity-100" : "opacity-35",
                  )}
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 18%, rgba(0,249,72,0.2), transparent 55%)",
                  }}
                />

                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 text-center">
                  <span
                    className={cn(
                      "mb-3 flex h-10 w-10 items-center justify-center rounded-sm border font-display text-sm font-black tabular-nums",
                      isOpen || row.rank <= 3
                        ? "border-[#00f948]/55 bg-[#00f948]/15 text-[#00f948]"
                        : "border-white/15 bg-black/30 text-white/50",
                    )}
                  >
                    {row.rank}
                  </span>
                  <p className="font-display text-base font-black uppercase leading-none tracking-[0.04em] sm:text-lg">
                    {row.nickname}
                  </p>
                  {row.isYou ? (
                    <span className="mt-2 rounded bg-[#00f948] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                      You
                    </span>
                  ) : null}
                  <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
                    {row.finalPoints} pts
                  </p>
                </div>

                <div
                  className={cn(
                    "relative z-10 border-t px-2 py-2 text-center transition",
                    isOpen
                      ? "border-[#00f948]/35 bg-[#00f948]/10"
                      : "border-white/10 bg-black/20",
                  )}
                >
                  {isOpen ? (
                    row.prizeAmount > 0 && !row.claimed ? (
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#00f948]">
                        Claim {row.prizeAmount}
                      </span>
                    ) : row.claimed ? (
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#00f948]/80">
                        Claimed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                        No prize
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                      Open
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
