"use client";

import { cn } from "@/lib/utils";

/** WC 2026 emblem (26 + trophy) — transparent PNG; plate is CSS only */
const LOGO_26_SRC = "/images/wc-2026-logo-26.png";
const LOGO_TROPHY_SRC = "/images/wc-2026-logo-trophy.png";

/** Hospitality-style plate: ~12–14% margin around artwork (reference proportions) */
const PLATE_WIDTH_SCALE = 1.28;
const PLATE_HEIGHT_SCALE = 1.34;

export type WcHeroLogoVariant = "26" | "trophy";

export function Wc2026LogoPlate({
  className,
  variant = "26",
}: {
  className?: string;
  variant?: WcHeroLogoVariant;
}) {
  const src = variant === "26" ? LOGO_26_SRC : LOGO_TROPHY_SRC;

  return (
    <span className={cn("relative inline-block leading-none", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-[1.35rem] bg-black shadow-[0_12px_40px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.06] sm:rounded-[1.55rem] lg:rounded-[1.75rem]"
        style={{
          width: `${PLATE_WIDTH_SCALE * 100}%`,
          height: `${PLATE_HEIGHT_SCALE * 100}%`,
        }}
      />
      <img
        src={src}
        alt=""
        width={663}
        height={1024}
        className="relative z-10 block h-auto w-[clamp(108px,17vw,152px)] sm:w-[118px] lg:w-[132px]"
        draggable={false}
      />
    </span>
  );
}
