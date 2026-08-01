"use client";

import { ResultsRoomShell } from "./ResultsRoomShell";

/**
 * Locked Lounge TV results room — interactive tablet + passive wall broadcast.
 * Cabinet / bar / greenroom A/B retired; continuity via raise/lower + brand.
 */
export function LockerLeaderboardLab() {
  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 sm:p-4">
        <div className="rounded-full border border-white/15 bg-[#0e0d0c]/90 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 backdrop-blur-md">
          Locked · Lounge TV · tablet interactive · wall watch-only
        </div>
      </div>
      <ResultsRoomShell />
    </div>
  );
}
