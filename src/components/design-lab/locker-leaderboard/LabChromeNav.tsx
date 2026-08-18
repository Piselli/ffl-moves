"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { LOCKER_NAV_LINKS } from "@/components/design-lab/locker-hero/navStyles";
import type { BoardThemeId } from "./themes";

type Props = {
  theme?: BoardThemeId;
};

/**
 * Lab top nav — locker family only.
 * neon = homepage glow Connect · quiet = same chrome, no neon shout
 */
export function LabChromeNav({ theme = "neon" }: Props) {
  const quiet = theme === "quiet";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)]"
      />
      <div className="pointer-events-auto relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Form8Mark className="h-7 sm:h-8" priority />
          <Form8Wordmark
            className="truncate text-sm text-white sm:text-[15px]"
            accentClassName={quiet ? "text-white/55" : "text-[#00f948]"}
          />
        </Link>

        <nav className="hidden items-center md:flex">
          {LOCKER_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => e.preventDefault()}
              className={cn(
                "px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-colors",
                quiet ? "hover:text-white" : "hover:text-[#00f948]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-0.5 p-0.5 sm:flex">
            <span className="rounded px-2 py-1 text-[10px] font-bold text-white">
              EN
            </span>
            <span className="px-2 py-1 text-[10px] font-bold text-white/40">
              UA
            </span>
          </div>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition active:scale-[0.98]",
              quiet
                ? "border border-white/25 bg-white/10 text-white/90 backdrop-blur-sm hover:bg-white/15"
                : "border border-[#00f948]/50 bg-[#00f948]/20 text-[#00f948] shadow-[0_0_24px_rgba(0,249,72,0.25)] backdrop-blur-sm",
            )}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
