"use client";

import { cn } from "@/lib/utils";
import type { WcGroup } from "@/components/wc/wcGroups";

/** Glossy flag tile — rounded, ringed, with a soft sheen so it reads as a real
 *  waving flag rather than a flat icon. */
export function WcFlagChip({ code, name, className }: { code: string; name: string; className?: string }) {
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-[3px] ring-1 ring-white/20 shadow-[0_2px_5px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <span
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/flags/4x3/${code}.svg)` }}
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/25" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
    </span>
  );
}

/**
 * One group of the draw: a colored letter tab + the four nations. Tuned to be
 * compact enough that six stack cleanly down one side of the hero.
 */
export function WcGroupCard({ group, className }: { group: WcGroup; className?: string }) {
  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border border-white/[0.08] bg-[#0b0e13]/85 backdrop-blur-sm",
        className,
      )}
      style={{ boxShadow: `inset 2px 0 0 ${group.accent}` }}
    >
      {/* Letter tab */}
      <div
        className="flex w-9 shrink-0 items-center justify-center sm:w-10"
        style={{ backgroundColor: group.accent }}
      >
        <span className="font-wc-display text-xl leading-none text-black/85 sm:text-2xl">
          {group.letter}
        </span>
      </div>

      {/* Nations */}
      <ul className="flex-1 divide-y divide-white/[0.05] py-0.5">
        {group.teams.map((t) => (
          <li key={t.code} className="flex items-center gap-2 px-2.5 py-[3px]">
            <WcFlagChip code={t.code} name={t.name} className="h-3.5 w-[22px]" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:text-[11px]">
              {t.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
