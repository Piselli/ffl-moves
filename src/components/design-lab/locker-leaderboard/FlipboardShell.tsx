"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LAB_LEADERBOARD } from "./mockData";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";

/**
 * Flipboard hall — mechanical split-flap wall IS the leaderboard.
 */
export function FlipboardShell() {
  const data = LAB_LEADERBOARD;
  const you = data.rows.find((r) => r.isYou);
  const reduceMotion = useReducedMotion();
  const [focusOwner, setFocusOwner] = useState(you?.owner ?? data.rows[0]?.owner ?? "");
  const [flipping, setFlipping] = useState(false);
  const focus = data.rows.find((r) => r.owner === focusOwner) ?? data.rows[0];

  const select = (owner: string) => {
    if (owner === focusOwner) return;
    setFlipping(true);
    setFocusOwner(owner);
  };

  useEffect(() => {
    if (!flipping) return;
    const t = window.setTimeout(
      () => setFlipping(false),
      reduceMotion ? 0 : 420,
    );
    return () => window.clearTimeout(t);
  }, [flipping, focusOwner, reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = data.rows.findIndex((r) => r.owner === focusOwner);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = data.rows[Math.min(data.rows.length - 1, idx + 1)];
        if (next) select(next.owner);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = data.rows[Math.max(0, idx - 1)];
        if (prev) select(prev.owner);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select closes over focusOwner
  }, [focusOwner, data.rows]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#12100e] text-[#f2eee6]">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-leaderboard/concepts/lb-concept-flipboard.png"
          alt=""
          fill
          priority
          className="object-cover object-[50%_35%] opacity-55"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,8,0.75)_0%,rgba(12,10,8,0.45)_35%,rgba(12,10,8,0.92)_100%)]" />
      </div>

      <ResultsPlaceNav />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-36 pt-24 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]">
              Stadium board · GW {data.gameweek}
            </p>
            <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Results flap
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              {data.entries} entries
            </p>
            <p className="font-display text-2xl font-black tabular-nums">
              {data.prizePoolLabel}{" "}
              <span className="text-sm text-white/40">{data.prizeSymbol}</span>
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-sm border border-white/15 bg-[#0a0908]/85 shadow-[0_30px_80px_rgba(0,0,0,0.65)] backdrop-blur-sm">
          <div className="grid grid-cols-[3.25rem_1fr_4.5rem_5rem] gap-px border-b border-white/10 bg-white/5 px-2 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 sm:px-3">
            <span>Rk</span>
            <span>Manager</span>
            <span className="text-right">Pts</span>
            <span className="text-right">Prize</span>
          </div>

          <div className="max-h-[min(52vh,28rem)] overflow-y-auto">
            {data.rows.map((row) => {
              const on = focusOwner === row.owner;
              return (
                <button
                  key={row.owner}
                  type="button"
                  onClick={() => select(row.owner)}
                  className={cn(
                    "grid w-full grid-cols-[3.25rem_1fr_4.5rem_5rem] items-stretch gap-px border-b border-white/[0.07] px-2 text-left transition sm:px-3",
                    on ? "bg-[#00f948]/12" : "hover:bg-white/[0.04]",
                  )}
                >
                  <FlapCell
                    active={on}
                    flipping={on && flipping}
                    className="font-display text-2xl font-black tabular-nums"
                  >
                    {String(row.rank).padStart(2, "0")}
                  </FlapCell>
                  <FlapCell active={on} flipping={on && flipping}>
                    <span className="flex items-center gap-2">
                      <span className="font-display text-sm font-black uppercase tracking-wide sm:text-base">
                        {row.nickname}
                      </span>
                      {row.isYou ? (
                        <span className="rounded bg-[#00f948] px-1.5 py-0.5 text-[8px] font-black uppercase text-black">
                          You
                        </span>
                      ) : null}
                    </span>
                  </FlapCell>
                  <FlapCell
                    active={on}
                    flipping={on && flipping}
                    className="text-right font-display text-lg font-black tabular-nums"
                  >
                    {row.finalPoints}
                  </FlapCell>
                  <FlapCell
                    active={on}
                    flipping={on && flipping}
                    className="text-right font-display text-base font-black tabular-nums text-[#00f948]"
                  >
                    {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                  </FlapCell>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/12 bg-black/50 px-4 py-3 backdrop-blur-md">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              Locked on
            </p>
            <p className="font-display text-xl font-black uppercase tracking-tight">
              #{focus?.rank} {focus?.nickname}
              <span className="ml-2 text-white/40">{focus?.finalPoints} pts</span>
            </p>
          </div>
          {focus && focus.prizeAmount > 0 && !focus.claimed ? (
            <button
              type="button"
              className="rounded-md bg-[#00f948] px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
            >
              Claim {focus.prizeAmount} {data.prizeSymbol}
            </button>
          ) : (
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
              ↑↓ flip · click a row
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function FlapCell({
  children,
  active,
  flipping,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  flipping?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative my-1 overflow-hidden rounded-[2px] border border-white/10 bg-[#1a1714] px-2 py-2.5",
        active && "border-[#00f948]/35 bg-[#141f16]",
        className,
      )}
    >
      <span
        className={cn(
          "block origin-top transition-transform duration-[210ms] ease-in",
          flipping && "scale-y-0 opacity-40",
        )}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/50"
      />
    </span>
  );
}
