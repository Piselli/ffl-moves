"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * Podium — spatial results podium as navigation.
 * Destinations sit as depth panels / places on the stand.
 */
export function PodiumShell() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0b0d12] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#12151c_0%,#0a0b0f_55%,#07080a_100%)]" />
        <div className="absolute bottom-[-10%] left-1/2 h-[50vh] w-[80vw] -translate-x-1/2 rounded-full bg-[#00f948]/08 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <header className="relative z-20 mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="MoveMatch" width={120} height={76} className="h-7 w-auto" />
          <span className="font-display text-sm font-black uppercase tracking-tighter">
            MOVE<span className="text-[#00f948]">MATCH</span>
          </span>
        </Link>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55 backdrop-blur-md">
          Results · Menu
        </span>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col justify-end px-4 pb-32 pt-8 sm:px-6">
        <div className="mb-10 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Podium nav
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
            Take your place
          </h1>
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-4 sm:gap-4">
          {MENU_DESTINATIONS.map((item, i) => {
            const on = active === i;
            const heights = ["min-h-[16rem]", "min-h-[18rem]", "min-h-[15rem]", "min-h-[17rem]"];
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition duration-300",
                  heights[i],
                  on
                    ? "z-10 -translate-y-3 border-white/30 bg-white/[0.1] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
                    : "border-white/12 bg-white/[0.05] hover:-translate-y-1 hover:bg-white/[0.07]",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity",
                    on ? "opacity-100" : "opacity-0",
                  )}
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 100%, rgba(0,249,72,0.2), transparent 60%)",
                  }}
                />
                <span
                  className={cn(
                    "font-display text-4xl font-black tabular-nums leading-none",
                    on ? "text-[#00f948]" : "text-white/25",
                  )}
                >
                  {item.code}
                </span>
                <div className="relative">
                  <p className="font-display text-xl font-black uppercase leading-none tracking-tight sm:text-2xl">
                    {item.label}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {item.hint}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="rounded-full border border-[#00f948]/40 bg-[#00f948]/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#00f948] transition hover:bg-[#00f948]/25 active:scale-[0.98]"
          >
            Connect
          </button>
        </div>
      </main>
    </div>
  );
}
