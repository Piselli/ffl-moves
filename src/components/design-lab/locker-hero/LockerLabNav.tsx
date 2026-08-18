"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Form8Mark, Form8Wordmark } from "@/components/Form8Mark";
import { LOCKER_NAV_LINKS } from "./navStyles";

type Props = {
  /** When true, nav links navigate (site). Lab keeps preventDefault for mock. */
  liveLinks?: boolean;
};

function Brand({
  className,
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center gap-2", className)}>
      <Form8Mark className="h-7 sm:h-8" priority />
      {!markOnly && (
        <Form8Wordmark className="truncate text-sm text-white sm:text-[15px]" />
      )}
    </Link>
  );
}

function Links({
  className,
  linkClassName,
  liveLinks = false,
}: {
  className?: string;
  linkClassName?: string;
  liveLinks?: boolean;
}) {
  return (
    <nav className={cn("hidden items-center md:flex", className)}>
      {LOCKER_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={liveLinks ? undefined : (e) => e.preventDefault()}
          className={cn(
            "px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/90 transition-colors hover:text-[#00f948]",
            linkClassName,
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function Right({
  connectClassName,
  localeClassName,
}: {
  connectClassName?: string;
  localeClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "hidden items-center gap-0.5 p-0.5 sm:flex",
          localeClassName ?? "rounded-md bg-black/25",
        )}
      >
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
          "px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition active:scale-[0.98]",
          connectClassName ??
            "rounded-lg bg-[#00f948] text-black hover:bg-[#00f948]/90",
        )}
      >
        Connect
      </button>
    </div>
  );
}

/**
 * Locked top menu — lit type: no bar, letters lit by room spots.
 */
export function LockerLabNav({ liveLinks = false }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.28)_55%,transparent_100%)]"
      />
      <div className="pointer-events-auto relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]" />
        <Links
          liveLinks={liveLinks}
          linkClassName={cn(
            "text-[13px] tracking-[0.14em] text-white",
            "drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]",
            "hover:text-[#00f948]",
          )}
        />
        <Right
          localeClassName="rounded-md bg-transparent"
          connectClassName="rounded-lg border border-[#00f948]/50 bg-[#00f948]/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#00f948] shadow-[0_0_24px_rgba(0,249,72,0.25)] backdrop-blur-sm"
        />
      </div>
    </div>
  );
}
