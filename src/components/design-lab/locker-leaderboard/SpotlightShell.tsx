"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { LabChromeNav } from "./LabChromeNav";
import { LAB_LEADERBOARD } from "./mockData";

/**
 * Spotlight — cinematic results stage.
 * One rank owns the frame; the rest is a scrub rail. ↑↓ to move, click to claim.
 */
export function SpotlightShell() {
  const data = LAB_LEADERBOARD;
  const youIndex = useMemo(
    () => Math.max(0, data.rows.findIndex((r) => r.isYou)),
    [data.rows],
  );
  const [focus, setFocus] = useState(youIndex);
  const row = data.rows[focus] ?? data.rows[0];

  useEffect(() => {
    setFocus(youIndex);
  }, [youIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => Math.min(data.rows.length - 1, f + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => Math.max(0, f - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.rows.length]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0908] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#161310_0%,#0a0908_48%,#050504_100%)]" />
        <div
          className="absolute left-1/2 top-[18%] h-[55vh] w-[70vw] -translate-x-1/2 rounded-full blur-[110px] transition-colors duration-500"
          style={{
            background: row.isYou
              ? "rgba(0,249,72,0.16)"
              : row.rank <= 3
                ? "rgba(255,215,120,0.12)"
                : "rgba(255,255,255,0.05)",
          }}
        />
      </div>

      <LabChromeNav theme="neon" />

      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-6xl gap-6 px-4 pb-44 pt-24 sm:px-6 lg:grid-cols-[1fr_15rem] lg:items-center lg:pb-48 lg:pt-28">
        <section className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
            GW {data.gameweek} · Spotlight
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <p
              className={cn(
                "font-display text-[7.5rem] font-black leading-none tracking-tighter sm:text-[9rem]",
                row.rank === 1
                  ? "text-[#FFD700]"
                  : row.rank === 2
                    ? "text-[#E8ECF2]"
                    : row.rank === 3
                      ? "text-[#D4A574]"
                      : "text-white",
              )}
            >
              #{row.rank}
            </p>
            <div className="mb-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {row.isYou ? (
                  <span className="rounded bg-[#00f948] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                    You
                  </span>
                ) : null}
                <h1 className="truncate font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
                  {row.nickname}
                </h1>
              </div>
              <p className="mt-2 text-sm text-white/40">
                {data.entries} entries · pool {data.prizePoolLabel} {data.prizeSymbol}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-sm border border-white/10 bg-black/35 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Points</p>
              <p className="mt-1 font-display text-4xl font-black tabular-nums">
                {row.finalPoints}
              </p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/35 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Prize</p>
              <p className="mt-1 font-display text-4xl font-black tabular-nums text-[#00f948]">
                {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                {row.prizeAmount > 0 ? (
                  <span className="ml-1 text-sm text-white/40">{data.prizeSymbol}</span>
                ) : null}
              </p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/35 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Status</p>
              <p className="mt-2 font-display text-xl font-black uppercase tracking-wide">
                {row.prizeAmount <= 0
                  ? "No prize"
                  : row.claimed
                    ? "Claimed"
                    : "Unclaimed"}
              </p>
            </div>
          </div>

          {row.prizeAmount > 0 && !row.claimed ? (
            <button
              type="button"
              className="mt-6 rounded-md bg-[#00f948] px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
            >
              Claim {row.prizeAmount} {data.prizeSymbol}
            </button>
          ) : null}

          <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-white/25">
            ↑↓ scrub ranks · stage follows selection
          </p>
        </section>

        <aside className="max-h-[70vh] overflow-y-auto rounded-sm border border-white/10 bg-black/40 p-2 backdrop-blur-md lg:max-h-[75vh]">
          {data.rows.map((r, i) => (
            <button
              key={r.owner}
              type="button"
              onClick={() => setFocus(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition",
                i === focus
                  ? "bg-[#00f948]/15 ring-1 ring-[#00f948]/40"
                  : "hover:bg-white/[0.05]",
                r.isYou && i !== focus && "bg-white/[0.03]",
              )}
            >
              <span
                className={cn(
                  "w-8 font-display text-sm font-black tabular-nums",
                  i === focus ? "text-[#00f948]" : "text-white/35",
                )}
              >
                {r.rank}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-xs font-bold uppercase tracking-wide">
                {r.nickname}
              </span>
              <span className="font-display text-xs font-black tabular-nums text-white/50">
                {r.finalPoints}
              </span>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
