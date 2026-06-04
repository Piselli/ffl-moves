"use client";

import { cn } from "@/lib/utils";

/** Official WC 2026 emblem — transparent PNG (trophy + 26). */
export function Wc2026LogoMark({
  className,
  imgClassName,
  glowClassName,
  noGlow = false,
  withBacking = false,
}: {
  className?: string;
  imgClassName?: string;
  glowClassName?: string;
  noGlow?: boolean;
  /** Black rounded plate — tight to logo edges */
  withBacking?: boolean;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-visible", withBacking && "w-fit", className)}>
      {!noGlow ? (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 h-[min(44vw,240px)] w-[min(44vw,240px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.42)_0%,rgba(255,180,0,0.14)_42%,transparent_72%)] blur-2xl",
            glowClassName,
          )}
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "relative z-10",
          withBacking &&
            "inline-flex w-fit items-center justify-center rounded-[1.15rem] bg-black p-[0.14em] shadow-[0_10px_36px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.07] sm:rounded-[1.25rem] sm:p-[0.16em] lg:rounded-[1.35rem] lg:p-[0.18em]",
        )}
      >
        <img
          src="/images/wc-2026-logo.png"
          alt=""
          width={663}
          height={1024}
          className={cn(
            "block h-auto max-w-none object-contain",
            withBacking ? "drop-shadow-none" : "drop-shadow-[0_8px_28px_rgba(0,0,0,0.5)]",
            imgClassName,
          )}
          draggable={false}
        />
      </div>
    </div>
  );
}
