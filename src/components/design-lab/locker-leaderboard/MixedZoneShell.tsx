"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LAB_LEADERBOARD } from "./mockData";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";

/**
 * Mixed zone — walk the curved LED results wall; tablet locks the focused finish.
 */
export function MixedZoneShell() {
  const data = LAB_LEADERBOARD;
  const you = data.rows.find((r) => r.isYou);
  const [focusIdx, setFocusIdx] = useState(
    Math.max(0, data.rows.findIndex((r) => r.isYou)),
  );
  const railRef = useRef<HTMLDivElement>(null);
  const focus = data.rows[focusIdx] ?? data.rows[0];

  const move = (dir: -1 | 1) => {
    setFocusIdx((i) => Math.min(data.rows.length - 1, Math.max(0, i + dir)));
  };

  useEffect(() => {
    const el = railRef.current?.querySelector<HTMLElement>(`[data-idx="${focusIdx}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#07090e] text-white">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-leaderboard/concepts/lb-concept-mixed-zone.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,14,0.7)_0%,rgba(6,8,14,0.35)_40%,rgba(6,8,14,0.88)_100%)]" />
      </div>

      <ResultsPlaceNav />

      <main className="relative z-10 flex min-h-[100dvh] flex-col justify-between pb-28 pt-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
            Mixed zone · GW {data.gameweek}
          </p>
          <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
            LED wall
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/45">
            Walk the corridor. The wall holds every finish — the tablet locks yours.
          </p>
        </div>

        {/* LED rail */}
        <div className="relative mt-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f948]/50 to-transparent"
          />
          <div
            ref={railRef}
            className="flex gap-3 overflow-x-auto px-[12vw] py-6 scrollbar-none"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {data.rows.map((row, i) => {
              const on = i === focusIdx;
              return (
                <button
                  key={row.owner}
                  type="button"
                  data-idx={i}
                  onClick={() => setFocusIdx(i)}
                  style={{ scrollSnapAlign: "center" }}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-sm border transition duration-300",
                    on
                      ? "w-[min(72vw,22rem)] border-[#00f948]/55 bg-[#0a1a12]/90 shadow-[0_0_40px_rgba(0,249,72,0.18)]"
                      : "w-[9.5rem] border-white/15 bg-black/55 opacity-70 hover:opacity-100",
                  )}
                >
                  <div
                    className={cn(
                      "bg-[linear-gradient(135deg,#0c1420,#0a1a12)] px-4 py-5",
                      on ? "min-h-[11rem]" : "min-h-[8.5rem]",
                    )}
                  >
                    <p
                      className={cn(
                        "font-display font-black tabular-nums leading-none",
                        on ? "text-6xl text-[#00f948]" : "text-3xl text-white/35",
                      )}
                    >
                      {row.rank}
                    </p>
                    <p
                      className={cn(
                        "mt-2 truncate font-display font-black uppercase tracking-tight",
                        on ? "text-xl" : "text-sm",
                      )}
                    >
                      {row.nickname}
                    </p>
                    {on ? (
                      <p className="mt-3 text-sm text-white/50">
                        {row.finalPoints} pts
                        {row.prizeAmount > 0
                          ? ` · ${row.prizeAmount} ${data.prizeSymbol}`
                          : ""}
                      </p>
                    ) : null}
                    {row.isYou ? (
                      <span className="absolute right-2 top-2 rounded bg-[#00f948] px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                        You
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00f948]/35 to-transparent"
          />
        </div>

        {/* Handheld tablet panel */}
        <div className="mx-auto mt-4 w-full max-w-md px-4 sm:px-6">
          <div className="overflow-hidden rounded-[1.25rem] border border-white/20 bg-[#0a0c12]/95 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                Focus lock
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/60 hover:border-white/30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/60 hover:border-white/30"
                >
                  →
                </button>
              </div>
            </div>
            <div className="px-4 py-4">
              <p className="font-display text-5xl font-black tabular-nums text-[#00f948]">
                #{focus?.rank}
              </p>
              <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight">
                {focus?.nickname}
              </h2>
              <p className="mt-2 text-sm text-white/45">
                {focus?.finalPoints} pts · pool {data.prizePoolLabel} {data.prizeSymbol}
              </p>
              {focus && focus.prizeAmount > 0 && !focus.claimed ? (
                <button
                  type="button"
                  className="mt-4 w-full rounded-md bg-[#00f948] px-4 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
                >
                  Claim {focus.prizeAmount} {data.prizeSymbol}
                </button>
              ) : you ? (
                <button
                  type="button"
                  onClick={() =>
                    setFocusIdx(Math.max(0, data.rows.findIndex((r) => r.isYou)))
                  }
                  className="mt-4 w-full rounded-md border border-[#00f948]/40 px-4 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#00f948] transition hover:bg-[#00f948]/10"
                >
                  Find me · #{you.rank}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
