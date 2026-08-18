"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResultsRoomShell } from "./ResultsRoomShell";
import {
  DEFAULT_LOUNGE_VARIANT,
  loadLoungeVariantId,
  LOUNGE_VARIANTS,
  saveLoungeVariantId,
  type LoungeVariantId,
} from "./loungeVariants";
import { cn } from "@/lib/utils";

/**
 * Lounge TV lab — Refero wall chrome A–E.
 * Tablet interaction stays; wall language switches.
 */
export function LockerLeaderboardLab() {
  const [loungeVariantId, setLoungeVariantId] = useState<LoungeVariantId>(
    DEFAULT_LOUNGE_VARIANT,
  );

  useEffect(() => {
    setLoungeVariantId(loadLoungeVariantId());
  }, []);

  const pick = (id: LoungeVariantId) => {
    setLoungeVariantId(id);
    saveLoungeVariantId(id);
  };

  return (
    <div className="relative">
      <ResultsRoomShell loungeVariantId={loungeVariantId} />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 sm:p-4">
        <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-white/15 bg-[#0e0d0c]/92 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              Design Lab · Refero → Lounge TV
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/design-lab/locker-tablet"
                className="text-[10px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              >
                iPad styles
              </Link>
              <Link
                href="/design-lab/desk-results"
                className="text-[10px] text-lime-300/70 underline-offset-2 hover:text-lime-200 hover:underline"
              >
                Desk chromes
              </Link>
              <Link
                href="/design-lab/locker-hero"
                className="text-[10px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
              >
                Locker hero
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {LOUNGE_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v.id)}
                className={cn(
                  "rounded-xl px-2 py-2.5 text-left transition active:scale-[0.98] sm:px-2.5",
                  loungeVariantId === v.id
                    ? "bg-white/15 ring-1 ring-white/35"
                    : "bg-white/[0.04] hover:bg-white/[0.07]",
                )}
              >
                <p
                  className={cn(
                    "font-display text-[10px] font-black uppercase tracking-wide sm:text-[11px]",
                    loungeVariantId === v.id ? "text-white" : "text-white/80",
                  )}
                >
                  {v.label}
                </p>
                <p className="mt-0.5 text-[9px] leading-snug text-white/40">
                  {v.hook}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
