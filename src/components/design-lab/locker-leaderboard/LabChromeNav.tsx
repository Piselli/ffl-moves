"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Form8Lockup } from "@/components/Form8Mark";
import { primarySiteNavLinks } from "@/components/design-lab/locker-hero/navStyles";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { BoardThemeId } from "./themes";

type Props = {
  theme?: BoardThemeId;
};

/**
 * Lab top nav — locker family only.
 * neon = homepage glow Connect · quiet = same chrome, no neon shout
 */
export function LabChromeNav({ theme = "neon" }: Props) {
  const m = useSiteMessages();
  const quiet = theme === "quiet";
  const links = primarySiteNavLinks(m);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)]"
      />
      <div className="pointer-events-auto relative flex h-16 w-full items-center px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="FORM8" className="relative z-10 flex shrink-0 items-center">
          <Form8Lockup
            priority
            wordmarkClassName={quiet ? "text-white/70" : undefined}
          />
        </Link>

        <nav className="mx-4 hidden flex-1 items-center justify-center md:flex min-[1400px]:absolute min-[1400px]:left-1/2 min-[1400px]:top-1/2 min-[1400px]:mx-0 min-[1400px]:flex-none min-[1400px]:-translate-x-1/2 min-[1400px]:-translate-y-1/2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => e.preventDefault()}
              className={cn(
                "inline-flex h-8 items-center px-2.5 text-[13px] font-semibold uppercase leading-none tracking-[0.14em] text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] transition-colors",
                quiet ? "hover:text-white" : "hover:text-[#00f948]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 ml-auto flex h-8 items-center gap-2">
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
              "inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-bold uppercase leading-none tracking-wide transition active:scale-[0.98]",
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
