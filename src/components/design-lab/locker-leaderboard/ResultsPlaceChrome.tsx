"use client";

import Image from "next/image";
import Link from "next/link";
import { LOCKER_NAV_LINKS } from "@/components/design-lab/locker-hero/navStyles";
import { cn } from "@/lib/utils";

/** Quiet chrome for results places — brand continuity, no locker atmosphere. */
export function ResultsPlaceNav() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/25 to-transparent"
      />
      <div className="pointer-events-auto relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt="MoveMatch"
            width={235}
            height={150}
            className="h-7 w-auto sm:h-8"
            priority
          />
          <span className="truncate font-display text-sm font-black uppercase tracking-tighter text-white sm:text-[15px]">
            MOVE<span className="text-[#00f948]">MATCH</span>
          </span>
        </Link>
        <nav className="hidden items-center md:flex">
          {LOCKER_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/85 transition-colors hover:text-[#00f948]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="rounded-lg border border-[#00f948]/45 bg-[#00f948]/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#00f948] transition hover:bg-[#00f948]/25 active:scale-[0.98]"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

export function SquadStrip({
  squad,
  className,
}: {
  squad?: readonly string[];
  className?: string;
}) {
  if (!squad?.length) return null;
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}>
      {squad.slice(0, 11).map((name, i) => (
        <div
          key={`${name}-${i}`}
          className="flex h-[4.25rem] w-[3.35rem] shrink-0 flex-col items-center justify-end rounded-[2px] border border-white/12 bg-[#1a1714] px-1 pb-1.5 pt-2"
        >
          <span className="mb-1 font-display text-[8px] font-bold tabular-nums text-white/25">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-center font-display text-[9px] font-black uppercase leading-tight tracking-wide">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
