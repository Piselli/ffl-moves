"use client";

import Link from "next/link";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * Ticker — LED stadium fascia / results ribbon as navigation.
 */
export function TickerShell() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050607] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#14181c,transparent_65%)]" />
        <div className="absolute inset-0 bg-[#050607]" />
      </div>

      <header className="relative z-20 mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Form8Mark className="h-7" />
          <Form8Wordmark className="text-sm" />
        </Link>
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#00f948]/70">
          LED · Live
        </p>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col justify-center px-4 pb-32 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
            Results ribbon
          </h1>
          <p className="mt-3 text-sm text-white/40">
            Stadium fascia language — destinations as lit segments on the board.
          </p>
        </div>

        <div className="overflow-hidden rounded-sm border border-[#00f948]/25 bg-black shadow-[0_0_40px_rgba(0,249,72,0.08)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0c0e] px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              FORM8 · Destinations
            </span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#00f948]" />
          </div>
          <div className="divide-y divide-white/10">
            {MENU_DESTINATIONS.map((item, i) => {
              const on = active === i;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-5 transition sm:gap-6 sm:px-5",
                    on ? "bg-[#00f948]/10" : "hover:bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "w-12 font-display text-xl font-black tabular-nums tracking-wider",
                      on ? "text-[#00f948]" : "text-[#00f948]/35",
                    )}
                  >
                    {item.code}
                  </span>
                  <span
                    className={cn(
                      "flex-1 font-display text-2xl font-black uppercase tracking-[0.06em] sm:text-3xl",
                      on ? "text-[#00f948]" : "text-[#00f948]/55",
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "hidden text-[11px] uppercase tracking-[0.16em] sm:block",
                      on ? "text-white/50" : "text-white/20",
                    )}
                  >
                    {item.hint}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="rounded-sm border border-[#00f948]/50 bg-[#00f948]/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#00f948] transition hover:bg-[#00f948]/25 active:scale-[0.98]"
          >
            Connect
          </button>
        </div>
      </main>
    </div>
  );
}
