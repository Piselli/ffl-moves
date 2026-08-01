"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MENU_DESTINATIONS } from "./menuLinks";

/**
 * B · Pause — console-style pre-match pause overlay.
 * One full-frame destination list; brand stays the hero signal.
 */
export function PauseShell() {
  const [focus, setFocus] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => (f + 1) % MENU_DESTINATIONS.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocus(
          (f) => (f - 1 + MENU_DESTINATIONS.length) % MENU_DESTINATIONS.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0908] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(40,36,30,0.9),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(0,249,72,0.07),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#141210_0%,#0a0908_50%,#070605_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col justify-center px-5 py-16 transition duration-500 sm:px-8",
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MoveMatch"
              width={140}
              height={90}
              className="h-10 w-auto sm:h-11"
              priority
            />
            <span className="font-display text-2xl font-black uppercase tracking-tighter sm:text-3xl">
              MOVE<span className="text-[#00f948]">MATCH</span>
            </span>
          </Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Paused · Select destination
          </p>
        </div>

        <nav aria-label="Main" className="space-y-1.5">
          {MENU_DESTINATIONS.map((item, i) => {
            const isFocus = focus === i;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setFocus(i)}
                onFocus={() => setFocus(i)}
                className={cn(
                  "group flex items-center gap-4 rounded-sm px-3 py-3 transition duration-200 sm:gap-5 sm:px-4 sm:py-3.5",
                  isFocus
                    ? "bg-white/[0.06] pl-5 sm:pl-6"
                    : "hover:bg-white/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "h-8 w-1 shrink-0 rounded-full transition duration-200",
                    isFocus
                      ? "scale-y-100 bg-[#00f948]"
                      : "scale-y-50 bg-transparent group-hover:bg-white/20",
                  )}
                />
                <span
                  className={cn(
                    "w-8 font-display text-sm font-bold tabular-nums tracking-[0.14em] transition",
                    isFocus ? "text-[#00f948]" : "text-white/25",
                  )}
                >
                  {item.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-display text-3xl font-black uppercase leading-none tracking-tight transition sm:text-4xl",
                      isFocus ? "text-white" : "text-white/55 group-hover:text-white/80",
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 block text-[11px] uppercase tracking-[0.16em] transition",
                      isFocus ? "text-white/45" : "text-white/20",
                    )}
                  >
                    {item.hint}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden font-display text-xs font-bold uppercase tracking-[0.18em] transition sm:block",
                    isFocus
                      ? "translate-x-0 text-[#00f948] opacity-100"
                      : "translate-x-2 text-white/0 opacity-0",
                  )}
                >
                  Enter →
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
          <button
            type="button"
            className="rounded-md bg-[#00f948] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            Connect wallet
          </button>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
            ↑↓ to browse · Enter to open
          </p>
        </div>
      </div>
    </div>
  );
}
