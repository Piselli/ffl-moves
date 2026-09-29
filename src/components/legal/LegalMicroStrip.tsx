"use client";

import { useSiteLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Tighter padding for overlays / menus. */
  compact?: boolean;
};

/**
 * Tiny legal attribution line for homepage, FAQ, and mobile menu —
 * so Terms are reachable before anyone hits Register.
 * Uses plain <a> (not next/link) to avoid prefetch storms near the WebGL tablet.
 */
export function LegalMicroStrip({ className, compact = false }: Props) {
  const { locale } = useSiteLocale();
  const uk = locale === "uk";

  const sep = <span className="text-white/20"> · </span>;
  const linkClass = "transition-colors hover:text-white/70";

  return (
    <p
      className={cn(
        "text-center font-medium leading-relaxed text-white/35",
        compact ? "text-[10px]" : "text-[10px] sm:text-[11px]",
        className,
      )}
    >
      <a href="/terms" className={linkClass}>
        {uk ? "Умови" : "Terms"}
      </a>
      {sep}
      <a href="/privacy" className={linkClass}>
        {uk ? "Конфіденційність" : "Privacy"}
      </a>
      {sep}
      <a href="/risk" className={linkClass}>
        {uk ? "Ризики" : "Risk"}
      </a>
      {sep}
      <span>18+</span>
      {sep}
      <span>
        {uk
          ? "Не повʼязано з Премʼєр-лігою"
          : "Not affiliated with the Premier League"}
      </span>
    </p>
  );
}
