"use client";

import Image from "next/image";
import { useReducedMotion, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Same room as desktop locker — atmosphere without the 3D tablet. */
const GATE_ROOM_SRC =
  "/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.webp";

export type MatchdayGateCopy = {
  buildTeam: string;
  trustLine: string;
  poolFallback: string;
  poolLabel: string;
  managersLabel: (n: number) => string;
  managersFallback: string;
  /** Two short lines under the offer — same voice as managers, not a paragraph. */
  fundLines: [string, string];
};

type Props = {
  prizeLabel: string;
  entries: number | null;
  loading?: boolean;
  copy: MatchdayGateCopy;
  onEnter: () => void;
};

/**
 * Mobile IG entry — Matchday Gate.
 * Offer stack only: pool + managers center, two quiet fund lines, CTA.
 * No Game Week. No competing headline above the offer.
 */
export function MatchdayGate({
  prizeLabel,
  entries,
  loading = false,
  copy,
  onEnter,
}: Props) {
  const reduce = Boolean(useReducedMotion());

  return (
    <motion.div
      className="absolute inset-0 z-[70] flex flex-col overflow-hidden bg-[#0a0908] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={GATE_ROOM_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/82 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_40%_at_50%_100%,rgba(0,249,72,0.1),transparent_55%)]" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {copy.poolLabel}
          </p>
          <p
            className={cn(
              "mt-1.5 font-display text-[clamp(3.75rem,18vw,5.5rem)] font-black leading-[0.88] tracking-tight text-[#00f948]",
              "drop-shadow-[0_0_48px_rgba(0,249,72,0.28)]",
              loading && "animate-pulse text-white/30",
            )}
          >
            {loading ? copy.poolFallback : prizeLabel}
          </p>

          <p
            className={cn(
              "mt-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-white/65",
              loading && "text-white/30",
            )}
          >
            {!loading && entries != null ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f948] shadow-[0_0_8px_rgba(0,249,72,0.65)]"
                aria-hidden
              />
            ) : null}
            {loading || entries == null
              ? copy.managersFallback
              : copy.managersLabel(entries)}
          </p>

          <div
            className={cn(
              "mt-5 space-y-1 text-[12px] font-semibold leading-snug tracking-wide text-white/45",
              loading && "text-white/25",
            )}
          >
            <p>{copy.fundLines[0]}</p>
            <p>{copy.fundLines[1]}</p>
          </div>
        </motion.div>
      </div>

      <div className="relative flex flex-col gap-2.5 pt-2">
        <button
          type="button"
          onClick={onEnter}
          className="flex h-12 w-full items-center justify-center rounded-xl font-display text-[15px] font-bold uppercase tracking-[0.08em] text-white transition active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(180deg, #3BE07A 0%, #17C255 46%, #0E9B41 100%)",
            textShadow: "0 1px 1px rgba(0,0,0,0.35)",
            boxShadow: [
              "inset 0 1.5px 0 rgba(255,255,255,0.55)",
              "inset 0 -2px 4px rgba(0,40,14,0.45)",
              "0 4px 10px rgba(0,0,0,0.35)",
              "0 12px 28px rgba(10,120,50,0.35)",
            ].join(", "),
          }}
        >
          {copy.buildTeam}
        </button>
        <p className="text-center text-[10px] leading-snug text-white/35">
          {copy.trustLine}
        </p>
      </div>
    </motion.div>
  );
}
