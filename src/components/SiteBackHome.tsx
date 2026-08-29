"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** Align main content top with {@link SiteBackHomeFloat} (nav bar is 4.25rem). */
export const PRODUCT_PAGE_TOP = "pt-[5.25rem]";

type Props = {
  className?: string;
  /** Tighter pill for nav-adjacent placement. */
  compact?: boolean;
};

export function SiteBackHome({ className, compact = false }: Props) {
  const pathname = usePathname();
  const m = useSiteMessages();

  if (!pathname || pathname === "/") return null;

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121110]/80 font-bold uppercase text-white/60 backdrop-blur-md transition hover:border-white/30 hover:text-white/90",
        compact
          ? "h-8 px-2.5 text-[9px] tracking-[0.12em]"
          : "px-3.5 py-1.5 text-[10px] tracking-[0.14em]",
        className,
      )}
    >
      <svg className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {m.nav.backHome}
    </Link>
  );
}

/** Floating back-home — does not shift page layout (leaderboard-style). */
export function SiteBackHomeFloat({ className }: { className?: string }) {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-5 top-[5.25rem] z-[75] sm:left-8",
        className,
      )}
    >
      <SiteBackHome className="pointer-events-auto" />
    </div>
  );
}
