"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Real ~8.4mm bezel as % of body — uniform absolute width. */
const BEZEL_X = (0.0084 / 0.2816) * 100;
const BEZEL_Y = (0.0084 / 0.2155) * 100;
const SCREEN = {
  left: BEZEL_X,
  top: BEZEL_Y,
  width: 100 - BEZEL_X * 2,
  height: 100 - BEZEL_Y * 2,
};

export const SCREEN_CANVAS = { w: 960, h: 720 };

type Props = {
  children: ReactNode;
  className?: string;
  onPointerInsideChange?: (inside: boolean) => void;
};

export function IpadFrame({ children, className, onPointerInsideChange }: Props) {
  const screenRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(w / SCREEN_CANVAS.w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "relative aspect-[0.2816/0.2155] w-full select-none overflow-hidden rounded-[clamp(14px,1.65vw,26px)] bg-black shadow-[0_24px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]",
        className,
      )}
      onMouseEnter={() => onPointerInsideChange?.(true)}
      onMouseLeave={() => onPointerInsideChange?.(false)}
    >
      <div
        ref={screenRef}
        className="absolute overflow-hidden rounded-[clamp(9px,1.05vw,16px)] bg-black"
        style={{
          left: `${SCREEN.left}%`,
          top: `${SCREEN.top}%`,
          width: `${SCREEN.width}%`,
          height: `${SCREEN.height}%`,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: SCREEN_CANVAS.w,
            height: SCREEN_CANVAS.h,
            // `zoom` re-lays out the UI at the target size, so type stays sharp;
            // `transform: scale()` would rasterize at 960px and upscale.
            zoom: scale || 0.001,
            opacity: scale ? 1 : 0,
          }}
        >
          {children}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.03)",
            background:
              "linear-gradient(130deg, rgba(255,255,255,0.035) 0%, transparent 10%, transparent 100%)",
          }}
        >
          <div className="absolute bottom-[7px] left-1/2 h-[2.5px] w-[84px] -translate-x-1/2 rounded-full bg-white/26" />
        </div>
      </div>

      <span
        aria-hidden
        className="absolute left-1/2 h-[clamp(2px,0.28vw,5px)] w-[clamp(2px,0.28vw,5px)] -translate-x-1/2 rounded-full bg-[#050508]"
        style={{ top: `${BEZEL_Y * 0.5}%` }}
      />
    </div>
  );
}
