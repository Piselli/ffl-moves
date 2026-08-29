"use client";

import type { ReactNode } from "react";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Inner content width — default matches FAQ / fixtures. */
  width?: "md" | "lg" | "xl" | "full";
  /** Vertically center content (connect / loading states). */
  centered?: boolean;
};

const WIDTH: Record<NonNullable<Props["width"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-7xl",
};

/**
 * Production secondary pages — locker nav + dark slate canvas (matches homepage IA).
 */
export function SitePageShell({
  children,
  className,
  width = "lg",
  centered = false,
}: Props) {
  return (
    <div className="min-h-screen bg-[#0D0F12] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(0,249,72,0.04)_0%,transparent_55%)]"
      />
      <LockerLabNav liveLinks />
      <div
        className={cn(
          "relative mx-auto px-5 sm:px-8 lg:px-10 pb-16",
          PRODUCT_PAGE_TOP,
          WIDTH[width],
          centered && "flex min-h-screen items-center justify-center py-24",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
