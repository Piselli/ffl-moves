"use client";

import Link from "next/link";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * C · Bay rail — destinations as locker nameplates on a hanging rail.
 * Same door language as the hero, different surface (no room plate).
 */
export function BayRailShell() {
  const [hover, setHover] = useState<number | null>(1);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#161412] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1c1916_0%,#12100e_40%,#0d0c0b_100%)]" />
        <div className="absolute left-1/2 top-0 h-[28vh] w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,220,160,0.09),transparent_70%)]" />
        <div className="absolute inset-x-0 top-[7.25rem] h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="absolute inset-x-[8%] top-[7.15rem] h-2 rounded-full bg-[linear-gradient(90deg,#2a2622,#4a433c,#2a2622)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]" />
      </div>

      <header className="relative z-20 mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Form8Mark className="h-7" />
          <Form8Wordmark className="text-sm drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" />
        </Link>
        <button
          type="button"
          className="rounded-md border border-[#00f948]/40 bg-[#00f948]/15 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#00f948] transition hover:bg-[#00f948]/25 active:scale-[0.98]"
        >
          Connect
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-28 pt-10 sm:px-6 sm:pb-32 sm:pt-14">
        <div className="mb-14 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Navigation as nameplates
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Hang your
            <span className="text-[#00f948]"> next move</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            The menu borrows the locker door grammar — number card, Oswald
            label, soft bay light — without shipping the room photograph.
          </p>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute inset-x-4 -top-3 h-3 rounded-full bg-[#2f2a25] sm:inset-x-8"
            aria-hidden
          />
          <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4 sm:gap-4">
            {MENU_DESTINATIONS.map((item, i) => {
              const lit = hover === i;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[2px] border transition duration-300",
                    lit
                      ? "-translate-y-2 border-[#00f948]/50 shadow-[0_18px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,249,72,0.2)]"
                      : "border-white/12 hover:-translate-y-1 hover:border-white/25",
                  )}
                  style={{
                    background:
                      "linear-gradient(165deg, #2a2622 0%, #1a1714 55%, #12100e 100%)",
                  }}
                >
                  <span
                    className="pointer-events-none absolute left-1/2 top-0 z-10 h-4 w-[3px] -translate-x-1/2 bg-[#5a5248]"
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 transition-opacity duration-300",
                      lit ? "opacity-100" : "opacity-40",
                    )}
                    style={{
                      background:
                        "radial-gradient(ellipse at 50% 18%, rgba(0,249,72,0.22), transparent 55%)",
                    }}
                  />

                  <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 text-center">
                    <span
                      className={cn(
                        "mb-3 flex h-10 w-10 items-center justify-center rounded-sm border font-display text-sm font-black tabular-nums tracking-wider transition",
                        lit
                          ? "border-[#00f948]/55 bg-[#00f948]/15 text-[#00f948]"
                          : "border-white/15 bg-black/30 text-white/55",
                      )}
                    >
                      {item.code}
                    </span>
                    <p className="font-display text-lg font-black uppercase leading-none tracking-[0.04em] sm:text-xl">
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-[10px] uppercase tracking-[0.14em] transition",
                        lit ? "text-white/50" : "text-white/28",
                      )}
                    >
                      {item.hint}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "relative z-10 border-t px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] transition",
                      lit
                        ? "border-[#00f948]/35 bg-[#00f948]/10 text-[#00f948]"
                        : "border-white/10 bg-black/20 text-white/30",
                    )}
                  >
                    Open bay
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.18em] text-white/25">
          Same door language · Different surface
        </p>
      </main>
    </div>
  );
}
