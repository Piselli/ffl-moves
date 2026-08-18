"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LabLeaderboardRow, LabSquadPlayer } from "../mockData";

/** Wall plaque positions — % of stage (like hang bays, but for ranks). */
export const PLAQUE_SLOTS: { left: string; top: string; rot: number }[] = [
  { left: "8%", top: "18%", rot: -2.2 },
  { left: "22%", top: "16%", rot: 1.4 },
  { left: "36%", top: "19%", rot: -1.1 },
  { left: "50%", top: "15%", rot: 0.8 },
  { left: "64%", top: "18%", rot: -1.6 },
  { left: "78%", top: "17%", rot: 2.0 },
  { left: "12%", top: "38%", rot: 1.2 },
  { left: "28%", top: "40%", rot: -0.9 },
  { left: "44%", top: "37%", rot: 1.8 },
  { left: "60%", top: "39%", rot: -2.0 },
  { left: "74%", top: "36%", rot: 0.6 },
  { left: "18%", top: "58%", rot: -1.4 },
  { left: "40%", top: "56%", rot: 1.0 },
  { left: "62%", top: "58%", rot: -0.7 },
];

/** Hook positions for XI hanging in the room. */
export const XI_HOOKS: { left: string; top: string }[] = [
  { left: "10%", top: "22%" },
  { left: "26%", top: "20%" },
  { left: "42%", top: "23%" },
  { left: "58%", top: "21%" },
  { left: "74%", top: "22%" },
  { left: "14%", top: "48%" },
  { left: "30%", top: "50%" },
  { left: "46%", top: "47%" },
  { left: "62%", top: "49%" },
  { left: "78%", top: "48%" },
  { left: "46%", top: "72%" },
];

export function DiegeticRoomWash({
  src = "/design-lab/locker-leaderboard/concepts/lb-room-cabinet.png",
}: {
  src?: string;
}) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        priority
        className="object-cover object-center opacity-[0.42]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,transparent_0%,rgba(12,10,9,0.55)_70%,rgba(8,7,6,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[#1a1816]/35" />
    </div>
  );
}

export function RankPlaque({
  row,
  slot,
  lit,
  selected,
  spotlighted,
  pulsing,
  onSelect,
}: {
  row: LabLeaderboardRow;
  slot: (typeof PLAQUE_SLOTS)[number];
  lit: boolean;
  selected: boolean;
  spotlighted?: boolean;
  pulsing?: boolean;
  onSelect?: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      id={row.isYou ? "diegetic-you-plaque" : undefined}
      onClick={onSelect}
      className={cn(
        "absolute w-[min(18vw,7.5rem)] origin-center rounded-[2px] border px-2 py-2 text-left shadow-[0_12px_28px_rgba(0,0,0,0.55)] backdrop-blur-[2px] transition",
        selected
          ? "border-[#00f948]/55 bg-[#12100e]/95"
          : lit
            ? "border-white/25 bg-[#161412]/90"
            : "border-white/10 bg-[#0e0d0c]/55",
        spotlighted && "z-30 ring-2 ring-[#00f948]/70",
        pulsing && "z-30",
      )}
      style={{
        left: slot.left,
        top: slot.top,
        rotate: `${slot.rot}deg`,
      }}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.92 }}
      animate={{
        opacity: lit || selected || spotlighted ? 1 : 0.25,
        y: 0,
        scale: pulsing ? [1, 1.06, 1] : selected ? 1.04 : 1,
        filter: pulsing
          ? [
              "brightness(1)",
              "brightness(1.45)",
              "brightness(1)",
            ]
          : spotlighted
            ? "brightness(1.25)"
            : "brightness(1)",
      }}
      transition={
        pulsing
          ? { duration: 0.7, ease: "easeOut" }
          : reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 320, damping: 28 }
      }
    >
      <p
        className={cn(
          "font-display text-lg font-black tabular-nums leading-none sm:text-xl",
          selected || row.isYou || spotlighted
            ? "text-[#00f948]"
            : lit
              ? "text-white/70"
              : "text-white/30",
        )}
      >
        {row.rank}
      </p>
      <p className="mt-1 truncate font-display text-[9px] font-bold uppercase tracking-wide text-white/85 sm:text-[10px]">
        {row.nickname}
      </p>
      <p className="font-display text-[11px] font-black tabular-nums text-white/55">
        {row.finalPoints}
      </p>
    </motion.button>
  );
}

export function HungXiStrip({
  player,
  hook,
  index,
  visible,
}: {
  player: LabSquadPlayer;
  hook: (typeof XI_HOOKS)[number];
  index: number;
  visible: boolean;
}) {
  const reduce = useReducedMotion();
  const src = player.photo || player.cast;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={`${player.name}-${index}`}
          className="pointer-events-none absolute w-[min(14vw,5.5rem)]"
          style={{ left: hook.left, top: hook.top }}
          initial={
            reduce
              ? false
              : { opacity: 0, y: -24, rotate: -6 }
          }
          animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -2 : 2 }}
          exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
          transition={{
            delay: reduce ? 0 : 0.04 + index * 0.045,
            type: "spring",
            stiffness: 280,
            damping: 22,
          }}
        >
          {/* Hook */}
          <div className="mx-auto mb-1 h-2 w-2 rounded-full bg-white/35 shadow-[0_0_8px_rgba(255,255,255,0.25)]" />
          <div className="mx-auto mb-0.5 h-3 w-px bg-white/25" />
          <div className="overflow-hidden rounded-[2px] border border-white/20 bg-[#141210] shadow-[0_16px_36px_rgba(0,0,0,0.6)]">
            <div className="relative mx-auto mt-2 h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-[#1a221c]">
              {src ? (
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="48px"
                  unoptimized={src.startsWith("http") || src.includes("/api/")}
                />
              ) : (
                <span className="flex h-full items-center justify-center font-display text-[10px] font-black text-white/40">
                  {player.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="px-1.5 py-2 text-center">
              <p className="truncate font-display text-[9px] font-black uppercase tracking-wide text-white">
                {player.name}
              </p>
              <p className="font-display text-[10px] font-black tabular-nums text-[#00f948]">
                {player.pts}
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function RoomSpotlight({
  active,
  targetLeft,
  targetTop,
}: {
  active: boolean;
  targetLeft: string;
  targetTop: string;
}) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 h-[42vmin] w-[42vmin] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        left: targetLeft,
        top: targetTop,
        background:
          "radial-gradient(circle, rgba(0,249,72,0.22) 0%, rgba(0,249,72,0.08) 35%, transparent 70%)",
        boxShadow: "0 0 80px rgba(0,249,72,0.18)",
      }}
    />
  );
}

export function ClaimPrizeOrb({
  active,
  amount,
  symbol,
}: {
  active: boolean;
  amount?: number;
  symbol?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[42%] z-40 -translate-x-1/2 -translate-y-1/2"
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: [0.85, 1.08, 1] }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-full border border-[#00f948]/50 bg-black/70 px-6 py-4 text-center shadow-[0_0_60px_rgba(0,249,72,0.45)] backdrop-blur-md">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#00f948]/80">
              Prize claimed
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-[#00f948]">
              {amount} {symbol}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
