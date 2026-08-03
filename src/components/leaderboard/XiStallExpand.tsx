"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NameplateFace } from "@/components/design-lab/locker-hero/NameplateFace";
import { ACTIVE_NAMEPLATE_GLOW } from "@/components/design-lab/locker-hero/nameplateGlows";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Formation lanes: FWD → MID → DEF → GK */
const LANES: { key: string; slice: [number, number] }[] = [
  { key: "fwd", slice: [8, 11] },
  { key: "mid", slice: [5, 8] },
  { key: "def", slice: [1, 5] },
  { key: "gk", slice: [0, 1] },
];

type Props = {
  nickname: string;
  rank: number;
  totalPts: number;
  starters: Player[];
  bench: Player[];
  getPoints: (player: Player) => number;
  showScores: boolean;
  loadingLabel: string;
  loading?: boolean;
  error?: boolean;
  errorLabel: string;
  benchLabel: string;
  xiTotalLabel: string;
};

/**
 * Expand payoff — XI as hung Oswald nameplates (homepage object language).
 * Table stays; this is the stall reveal inside the row.
 */
export function XiStallExpand({
  nickname,
  rank,
  totalPts,
  starters,
  bench,
  getPoints,
  showScores,
  loadingLabel,
  loading,
  error,
  errorLabel,
  benchLabel,
  xiTotalLabel,
}: Props) {
  const reduce = useReducedMotion();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00f948]/50 border-t-transparent" />
        <p className="text-sm text-white/35">{loadingLabel}</p>
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-white/30">{errorLabel}</p>;
  }

  return (
    <div className="px-2 py-5 sm:px-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Stall · #{rank > 0 ? rank : "—"}
          </p>
          <p className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-white">
            {nickname}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            {xiTotalLabel}
          </p>
          <p className="font-display text-3xl font-black tabular-nums text-white">
            {totalPts}
          </p>
        </div>
      </div>

      <div className="relative rounded-xl border border-white/10 bg-black/40 px-3 py-6 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(255,252,248,0.06)_0%,transparent_60%)]"
        />
        <AnimatePresence mode="popLayout">
          <div className="relative space-y-5">
            {LANES.map((lane, laneIdx) => {
              const players = starters.slice(lane.slice[0], lane.slice[1]);
              if (!players.length) return null;
              return (
                <div
                  key={lane.key}
                  className="flex flex-wrap items-start justify-center gap-2 sm:gap-3"
                >
                  {players.map((player, i) => {
                    const pts = showScores ? getPoints(player) : null;
                    const name = (player.webName || player.name).toUpperCase();
                    const delay = 0.04 + laneIdx * 0.05 + i * 0.035;
                    return (
                      <HungPlate
                        key={`${player.id}-${lane.key}`}
                        delay={delay}
                        reduce={Boolean(reduce)}
                        faceScale={0.36}
                        rot={i % 2 === 0 ? -1.4 : 1.6}
                      >
                        <NameplateFace
                          styleId="everton-card"
                          name={name}
                          number={pts != null ? String(pts) : null}
                          glowId={ACTIVE_NAMEPLATE_GLOW}
                        />
                      </HungPlate>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>

      {bench.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {benchLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {bench.map((player, i) => {
              const pts = showScores ? getPoints(player) : null;
              const name = (player.webName || player.name).toUpperCase();
              return (
                <HungPlate
                  key={`bench-${player.id}`}
                  delay={0.2 + i * 0.03}
                  reduce={Boolean(reduce)}
                  faceScale={0.28}
                  rot={0}
                  cordHeight={10}
                >
                  <NameplateFace
                    styleId="everton-card"
                    name={name}
                    number={pts != null ? String(pts) : null}
                    glowId={ACTIVE_NAMEPLATE_GLOW}
                  />
                </HungPlate>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HungPlate({
  children,
  delay,
  reduce,
  faceScale,
  rot,
  cordHeight = 16,
}: {
  children: ReactNode;
  delay: number;
  reduce: boolean;
  faceScale: number;
  rot: number;
  cordHeight?: number;
}) {
  const w = 280 * faceScale;
  const h = 90 * faceScale;
  return (
    <motion.div
      className="relative origin-top"
      style={{ width: w }}
      initial={reduce ? false : { opacity: 0, y: -18, rotate: rot - 3 }}
      animate={{ opacity: 1, y: 0, rotate: rot }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
      transition={
        reduce
          ? { duration: 0 }
          : { delay, type: "spring", stiffness: 280, damping: 22 }
      }
    >
      <div
        aria-hidden
        className="absolute left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-white/30 to-white/5"
        style={{ top: -cordHeight, height: cordHeight }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40"
        style={{ top: -cordHeight }}
      />
      <div
        className={cn(
          "overflow-hidden rounded-[2px] shadow-[0_10px_24px_rgba(0,0,0,0.5)]",
        )}
        style={{ width: w, height: h }}
      >
        <div
          className="origin-top-left"
          style={{
            width: 280,
            height: 90,
            transform: `scale(${faceScale})`,
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}
