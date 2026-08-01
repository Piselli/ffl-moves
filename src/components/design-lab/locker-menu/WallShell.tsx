"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * Wall — permanent stadium results board as navigation.
 * Destinations read as columns on a standings fascia.
 */
export function WallShell() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0e0f12] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#15171c_0%,#0c0d10_55%,#08090b_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,249,72,0.1),transparent_70%)]" />
        <div className="absolute inset-x-[6%] top-[5.5rem] bottom-[18%] rounded-sm border border-white/10 bg-[#12141a]/90 shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]" />
      </div>

      <header className="relative z-20 mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="MoveMatch" width={120} height={76} className="h-7 w-auto" />
          <span className="font-display text-sm font-black uppercase tracking-tighter">
            MOVE<span className="text-[#00f948]">MATCH</span>
          </span>
        </Link>
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
          Official board
        </p>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-32 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#00f948]/80">
              Results surface
            </p>
            <h1 className="mt-1 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              League board
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Status</p>
            <p className="font-display text-lg font-black uppercase text-white/80">Resolved</p>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-sm border border-white/12 bg-white/10 sm:grid-cols-4">
          {MENU_DESTINATIONS.map((item, i) => {
            const on = active === i;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cn(
                  "relative flex min-h-[14rem] flex-col justify-between bg-[#101218] p-5 transition duration-200",
                  on
                    ? "bg-[#141a16] ring-1 ring-inset ring-[#00f948]/45"
                    : "hover:bg-[#14161c]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "font-display text-3xl font-black tabular-nums leading-none",
                      on ? "text-[#00f948]" : "text-white/25",
                    )}
                  >
                    {item.code}
                  </span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full transition",
                      on ? "bg-[#00f948] shadow-[0_0_12px_rgba(0,249,72,0.8)]" : "bg-white/20",
                    )}
                  />
                </div>
                <div>
                  <p className="font-display text-2xl font-black uppercase leading-none tracking-tight">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {item.hint}
                  </p>
                </div>
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-1 transition",
                    on ? "bg-[#00f948]" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
            Permanent wall · Rank language
          </p>
          <button
            type="button"
            className="rounded-md bg-[#00f948] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            Connect
          </button>
        </div>
      </main>
    </div>
  );
}
