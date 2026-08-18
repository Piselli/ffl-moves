"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IxTripleDWall } from "./concepts/IxTripleDWall";
import { IxTripleDLogs } from "./concepts/IxTripleDLogs";
import { IxTripleDNotch } from "./concepts/IxTripleDNotch";

export const LEADERBOARD_CONCEPTS = [
  {
    id: "wall",
    label: "1 · Light Wall",
    hook: "Holographic Wall + Spotlight — real TripleD code",
  },
  {
    id: "logs",
    label: "2 · Expand Logs",
    hook: "Interactive Logs expand — ported",
  },
  {
    id: "notch",
    label: "3 · Profile Notch",
    hook: "Native Profile Notch spring morph — ported",
  },
] as const;

export type LeaderboardConceptId = (typeof LEADERBOARD_CONCEPTS)[number]["id"];

/**
 * Leaderboard concepts built by adapting TripleD component source,
 * with Refero Active Theory restraint (chrome quiet, scene loud).
 */
export function LeaderboardConceptsLab({
  shipping = false,
}: {
  shipping?: boolean;
}) {
  const [id, setId] = useState<LeaderboardConceptId>("wall");
  const active = useMemo(
    () =>
      LEADERBOARD_CONCEPTS.find((c) => c.id === id) ?? LEADERBOARD_CONCEPTS[0],
    [id],
  );

  return (
    <div className="relative min-h-[100dvh] bg-black text-white">
      {id === "wall" ? <IxTripleDWall /> : null}
      {id === "logs" ? <IxTripleDLogs /> : null}
      {id === "notch" ? <IxTripleDNotch /> : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4">
            <div className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0e0d0c]/94 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-2.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              {shipping ? "Leaderboard" : "Lab"} · TripleD code ports
            </p>
            <div className="flex items-center gap-3">
              <span className="hidden text-[10px] text-white/35 sm:inline">
                {active.hook}
              </span>
              <Link
                href="/leaderboard/classic"
                className="text-[10px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Classic
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {LEADERBOARD_CONCEPTS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setId(c.id)}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-left transition active:scale-[0.98] sm:px-2.5",
                  id === c.id
                    ? "bg-white/15 ring-1 ring-white/35"
                    : "bg-white/[0.04] hover:bg-white/[0.07]",
                )}
              >
                <p
                  className={cn(
                    "font-display text-[10px] font-black uppercase tracking-wide sm:text-[11px]",
                    id === c.id ? "text-white" : "text-white/75",
                  )}
                >
                  {c.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-white/40">
                  {c.hook}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
