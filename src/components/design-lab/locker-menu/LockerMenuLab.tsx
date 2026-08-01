"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PauseShell } from "./PauseShell";
import { BayRailShell } from "./BayRailShell";
import { WallShell } from "./WallShell";
import { LadderShell } from "./LadderShell";
import { BroadcastMenuShell } from "./BroadcastMenuShell";
import { PodiumShell } from "./PodiumShell";
import { TickerShell } from "./TickerShell";

export type LockerMenuVariant =
  | "wall"
  | "ladder"
  | "broadcast"
  | "podium"
  | "ticker"
  | "pause"
  | "bay";

const STORAGE_KEY = "ffl:locker-menu:variant";

const VARIANTS: {
  id: LockerMenuVariant;
  label: string;
  hook: string;
}[] = [
  { id: "wall", label: "A · Wall", hook: "Standings board" },
  { id: "ladder", label: "B · Ladder", hook: "Rank rungs" },
  { id: "broadcast", label: "C · Broadcast", hook: "Result strips" },
  { id: "podium", label: "D · Podium", hook: "Spatial stand" },
  { id: "ticker", label: "E · Ticker", hook: "LED fascia" },
  { id: "pause", label: "F · Pause", hook: "Console list" },
  { id: "bay", label: "G · Bay", hook: "Nameplate rail" },
];

const SHELLS: Record<LockerMenuVariant, () => ReactNode> = {
  wall: () => <WallShell />,
  ladder: () => <LadderShell />,
  broadcast: () => <BroadcastMenuShell />,
  podium: () => <PodiumShell />,
  ticker: () => <TickerShell />,
  pause: () => <PauseShell />,
  bay: () => <BayRailShell />,
};

const VALID = new Set<string>(VARIANTS.map((v) => v.id));

export function LockerMenuLab() {
  const [variant, setVariant] = useState<LockerMenuVariant>("wall");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && VALID.has(saved)) {
        setVariant(saved as LockerMenuVariant);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const pick = (id: LockerMenuVariant) => {
    setVariant(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 sm:p-4">
        <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-white/15 bg-[#0e0d0c]/92 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              Design Lab · Menu · Results language
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/design-lab/locker-hero"
                className="text-[10px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Locker hero
              </Link>
              <Link
                href="/design-lab/locker-leaderboard"
                className="text-[10px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Leaderboard
              </Link>
              <Link
                href="/design-lab"
                className="text-[10px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              >
                All directions
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v.id)}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-left transition active:scale-[0.98] sm:px-2.5",
                  variant === v.id
                    ? "bg-[#00f948]/15 ring-1 ring-[#00f948]/40"
                    : "bg-white/[0.04] hover:bg-white/[0.07]",
                )}
              >
                <p
                  className={cn(
                    "font-display text-[10px] font-black uppercase tracking-wide sm:text-[11px]",
                    variant === v.id ? "text-[#00f948]" : "text-white/80",
                  )}
                >
                  {v.label}
                </p>
                <p className="mt-0.5 text-[9px] text-white/40">{v.hook}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {SHELLS[variant]()}
    </div>
  );
}
