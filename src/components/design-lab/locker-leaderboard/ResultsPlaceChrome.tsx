"use client";

import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { cn } from "@/lib/utils";

/**
 * Site chrome for spatial results room — same nav as homepage / FAQ / fixtures.
 */
export function ResultsPlaceNav() {
  return <LockerLabNav liveLinks />;
}

export function SquadStrip({
  squad,
  className,
}: {
  squad?: readonly string[];
  className?: string;
}) {
  if (!squad?.length) return null;
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}>
      {squad.slice(0, 11).map((name, i) => (
        <div
          key={`${name}-${i}`}
          className="flex h-[4.25rem] w-[3.35rem] shrink-0 flex-col items-center justify-end rounded-[2px] border border-white/12 bg-[#1a1714] px-1 pb-1.5 pt-2"
        >
          <span className="mb-1 font-display text-[8px] font-bold tabular-nums text-white/25">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-center font-display text-[9px] font-black uppercase leading-tight tracking-wide">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
