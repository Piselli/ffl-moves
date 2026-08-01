"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * Broadcast — matchday graphic strips as navigation.
 * Destinations are horizontal result bars, not doors.
 */
export function BroadcastMenuShell() {
  const [active, setActive] = useState(1);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#07080a] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[50vh] w-[70vw] rounded-full bg-[#1a3d28]/30 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[40vh] w-[50vw] bg-[#12161c] blur-[80px]" />
        <div className="absolute inset-x-0 top-[4.5rem] h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <header className="relative z-20 border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="MoveMatch" width={120} height={76} className="h-7 w-auto" />
            <span className="font-display text-sm font-black uppercase tracking-tighter">
              MOVE<span className="text-[#00f948]">MATCH</span>
            </span>
          </Link>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
            Live graphic
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-32 pt-12 sm:px-6 sm:pt-16">
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]/80">
            Season 25/26
          </p>
          <h1 className="mt-1 font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            Destinations
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/45">
            Navigation as broadcast rank strips — the same language as a results table.
          </p>
        </div>

        <div className="space-y-2">
          {MENU_DESTINATIONS.map((item, i) => {
            const on = active === i;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cn(
                  "group grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-sm px-4 py-4 transition sm:grid-cols-[5rem_1fr_auto] sm:gap-5 sm:px-5",
                  on
                    ? "bg-[#00f948]/12 ring-1 ring-[#00f948]/35"
                    : "bg-white/[0.04] hover:bg-white/[0.07]",
                )}
              >
                <span
                  className={cn(
                    "font-display text-2xl font-black tabular-nums leading-none sm:text-3xl",
                    on ? "text-[#00f948]" : "text-white/30",
                  )}
                >
                  {item.code}
                </span>
                <span>
                  <span className="block font-display text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                    {item.label}
                  </span>
                  <span className="mt-1.5 block text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {item.hint}
                  </span>
                </span>
                <span
                  className={cn(
                    "rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition",
                    on
                      ? "bg-[#00f948] text-black"
                      : "bg-white/10 text-white/50 group-hover:bg-white/15",
                  )}
                >
                  Open
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-[#00f948] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            Connect
          </button>
        </div>
      </main>
    </div>
  );
}
