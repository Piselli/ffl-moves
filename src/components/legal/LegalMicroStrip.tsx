"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSiteLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Tighter padding for overlays / menus. */
  compact?: boolean;
  /**
   * Render into document.body with a high fixed z-index so WebGL / drei Html
   * layers cannot steal clicks (homepage bottom strip).
   */
  portal?: boolean;
};

/**
 * Tiny legal attribution line for homepage, FAQ, and mobile menu —
 * so Terms are reachable before anyone hits Register.
 * Uses plain <a> (not next/link) to avoid prefetch storms near the WebGL tablet.
 */
export function LegalMicroStrip({ className, compact = false, portal = false }: Props) {
  const { locale } = useSiteLocale();
  const uk = locale === "uk";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sep = <span className="text-white/20"> · </span>;
  const linkClass = "cursor-pointer transition-colors hover:text-white/70 hover:underline";

  const body = (
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

  if (portal) {
    if (!mounted) return null;
    return createPortal(
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] hidden px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 md:block"
        data-legal-microstrip=""
      >
        <div className="pointer-events-auto mx-auto max-w-3xl drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return body;
}
