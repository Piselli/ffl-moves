"use client";

import { cn } from "@/lib/utils";

export const WC_HOST_NATIONS = [
  { label: "USA", bars: ["#B22234", "#FFFFFF", "#3C3B6E"] },
  { label: "MEX", bars: ["#006847", "#FFFFFF", "#CE1126"] },
  { label: "CAN", bars: ["#FF0000", "#FFFFFF", "#FF0000"] },
] as const;

export function WcGrassStripeBg({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: `repeating-linear-gradient(
          180deg,
          rgba(46, 125, 50, 0.04) 0px,
          rgba(46, 125, 50, 0.04) 56px,
          rgba(56, 142, 60, 0.1) 56px,
          rgba(56, 142, 60, 0.1) 112px
        )`,
      }}
      aria-hidden
    />
  );
}

export function WcPitchLinesSvg({ className }: { className?: string }) {
  return (
    <svg
      className={cn("absolute inset-0 h-full w-full", className)}
      viewBox="0 0 320 280"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden
    >
      <rect x="16" y="16" width="288" height="248" stroke="white" strokeWidth="1.5" />
      <line x1="16" y1="140" x2="304" y2="140" stroke="white" strokeWidth="1.5" />
      <circle cx="160" cy="140" r="36" stroke="white" strokeWidth="1.5" />
      <rect x="72" y="196" width="176" height="68" stroke="white" strokeWidth="1.5" />
      <rect x="112" y="232" width="96" height="32" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

export function WcHostNationBars({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-2 sm:gap-3", className)}>
      {WC_HOST_NATIONS.map((nation) => (
        <div key={nation.label} className="flex flex-col items-center gap-1.5">
          <div className="flex h-12 w-2 sm:h-14 sm:w-2.5 flex-col overflow-hidden rounded-full ring-1 ring-white/10">
            {nation.bars.map((color, i) => (
              <span key={i} className="flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-[8px] font-bold tracking-widest text-white/25">{nation.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * One consistent cinematic stage for WC routes — a calm stadium-night vignette
 * (no moving pitch). Shares the exact base tones with the hero so the page reads
 * as a single surface from top to bottom.
 */
/** Filmic grain — kept page-wide on the fixed stage so it never clips at a section edge. */
const WC_GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function WcCampaignAmbient() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0b0e]" aria-hidden>
      {/* One flat tone for the whole page — no gradient, so there is zero colour transition. */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: WC_GRAIN_BG, backgroundSize: "120px 120px" }}
      />
    </div>
  );
}
