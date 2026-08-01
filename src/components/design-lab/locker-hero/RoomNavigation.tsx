"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Navigation is the room itself.
 * Each target is a physical object baked into the locker plate.
 * No floating dashboards — only a quiet nameplate on hover/focus.
 */

type Zone = {
  id: "leaderboard" | "season" | "talents" | "faq";
  href: string;
  label: string;
  hint: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const ZONES: Zone[] = [
  {
    id: "leaderboard",
    href: "/leaderboard",
    label: "Leaderboard",
    hint: "League table on the wall",
    left: 0.5,
    top: 10,
    width: 11,
    height: 48,
  },
  {
    id: "season",
    href: "/season-leaderboard",
    label: "Season",
    hint: "Tactics board — the long race",
    left: 39,
    top: 16,
    width: 22,
    height: 38,
  },
  {
    id: "talents",
    href: "/titles",
    label: "Talents",
    hint: "Scouting portraits",
    left: 70,
    top: 4,
    width: 22,
    height: 20,
  },
  {
    id: "faq",
    href: "/faq",
    label: "FAQ",
    hint: "Coach's clipboard",
    left: 74,
    top: 70,
    width: 20,
    height: 22,
  },
];

type Props = {
  interactive: boolean;
};

export function RoomNavigation({ interactive }: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 transition-opacity duration-300",
        interactive ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!interactive}
    >
      {ZONES.map((zone) => (
        <Link
          key={zone.id}
          href={zone.href}
          tabIndex={interactive ? 0 : -1}
          aria-label={`${zone.label}: ${zone.hint}`}
          className={cn(
            "group absolute outline-none",
            "transition-[background-color,box-shadow] duration-200",
            "hover:bg-white/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(255,236,200,0.22)]",
            "focus-visible:bg-white/[0.06] focus-visible:shadow-[inset_0_0_0_1.5px_rgba(255,236,200,0.55)]",
          )}
          style={{
            left: `${zone.left}%`,
            top: `${zone.top}%`,
            width: `${zone.width}%`,
            height: `${zone.height}%`,
          }}
        >
          <span
            className={cn(
              "pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2",
              "min-w-max rounded-sm border border-[#c4b49a]/25 bg-[#1a1712]/92 px-2.5 py-1.5",
              "opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-[2px]",
              "transition-[opacity,transform] duration-200",
              "group-hover:translate-y-0 group-hover:opacity-100",
              "group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
              "translate-y-1",
            )}
          >
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#f2e6d2]">
              {zone.label}
            </span>
            <span className="mt-0.5 block text-[10px] text-[#c4b49a]/70">
              {zone.hint}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
