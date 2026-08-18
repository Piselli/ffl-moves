"use client";

import Link from "next/link";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * Ladder — tactile ranking ladder as navigation.
 * Each destination is a rung / plate on the climb.
 */
export function LadderShell() {
  const [focus, setFocus] = useState(0);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#12100e] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1a1714_0%,#0f0e0c_50%,#090807_100%)]" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
        <div className="absolute left-1/2 top-[18%] h-[58%] w-[min(28rem,86vw)] -translate-x-1/2 rounded-[2px] border border-white/8 bg-black/20" />
      </div>

      <header className="relative z-20 mx-auto flex h-16 max-w-xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Form8Mark className="h-7" />
          <Form8Wordmark className="text-sm" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          Climb
        </p>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col justify-center px-4 pb-32 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]/75">
            Rank ladder
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-none tracking-tight">
            Pick a rung
          </h1>
        </div>

        <nav aria-label="Main" className="space-y-2.5">
          {MENU_DESTINATIONS.map((item, i) => {
            const on = focus === i;
            const rank = i + 1;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setFocus(i)}
                onFocus={() => setFocus(i)}
                className={cn(
                  "group relative flex items-center gap-4 overflow-hidden rounded-sm border px-4 py-4 transition duration-200",
                  on
                    ? "z-10 -translate-y-0.5 border-[#00f948]/45 bg-[#1a1814] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                    : "border-white/10 bg-black/30 hover:border-white/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border font-display text-lg font-black tabular-nums transition",
                    on
                      ? "border-[#00f948]/55 bg-[#00f948] text-black"
                      : "border-white/15 bg-white/[0.04] text-white/45",
                  )}
                >
                  {rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl font-black uppercase leading-none tracking-tight">
                    {item.label}
                  </span>
                  <span className="mt-1.5 block text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {item.hint}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-display text-xs font-bold uppercase tracking-[0.16em] transition",
                    on ? "text-[#00f948] opacity-100" : "text-white/0 opacity-0",
                  )}
                >
                  Ascend
                </span>
                <span
                  className={cn(
                    "pointer-events-none absolute inset-y-0 left-0 w-1 transition",
                    on ? "bg-[#00f948]" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="rounded-md border border-[#00f948]/40 bg-[#00f948]/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#00f948] transition hover:bg-[#00f948]/25 active:scale-[0.98]"
          >
            Connect
          </button>
        </div>
      </main>
    </div>
  );
}
