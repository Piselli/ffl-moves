"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Player } from "@/lib/types";
import { EASE_OUT, SPRING_SNAPPY } from "@/lib/uiMotion";
import { PlayerCard } from "./PlayerCard";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FORMATION,
  formationRows,
  slotPosition,
  type FormationId,
} from "@/lib/formation";

interface FormationGridProps {
  starters: (Player | null)[];
  bench?: (Player | null)[];
  onPlayerClick?: (index: number, isBench: boolean) => void;
  /** Static preview — no clicks or hover scale (e.g. marketing demo). */
  readOnly?: boolean;
  formationId?: FormationId;
  /** Empty slot currently scoped for picking. */
  activeIndex?: number | null;
}

export function FormationGrid({
  starters,
  onPlayerClick,
  readOnly = false,
  formationId = DEFAULT_FORMATION,
  activeIndex = null,
}: FormationGridProps) {
  const reduce = useReducedMotion() ?? false;
  const rows = formationRows(formationId);

  const renderSlot = (
    player: Player | null,
    index: number,
    isBench: boolean = false,
  ) => {
    const position = isBench
      ? (["DEF", "MID", "FWD"] as const)[index]
      : slotPosition(index, formationId);

    const positionColors: Record<string, string> = {
      GK: "border-rose-500/40 text-rose-400",
      DEF: "border-amber-500/40 text-amber-400",
      MID: "border-blue-500/40 text-blue-400",
      FWD: "border-emerald-500/40 text-emerald-400",
    };
    const active = !player && activeIndex === index && !isBench;

    return (
      <button
        key={`slot-${isBench ? "bench" : "start"}-${index}`}
        type="button"
        disabled={readOnly}
        onClick={() => onPlayerClick?.(index, isBench)}
        aria-label={player ? player.webName ?? player.name : `Empty ${position}`}
        className={cn(
          "relative h-24 w-20 rounded-xl bg-transparent",
          !readOnly &&
            "cursor-pointer transition-[transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-110 active:scale-[0.96]",
          readOnly && "cursor-default",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {player ? (
            <motion.span
              key={player.id}
              className="flex h-full w-full"
              initial={reduce ? false : { opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
              transition={reduce ? { duration: 0.12 } : SPRING_SNAPPY}
            >
              <PlayerCard player={player} selected compact />
            </motion.span>
          ) : (
            <motion.span
              key={`empty-${index}-${position}`}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-black/20 backdrop-blur-sm",
                positionColors[position],
                active && "border-solid bg-black/35 ring-1 ring-white/35",
              )}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={reduce ? { duration: 0.1 } : { duration: 0.16, ease: EASE_OUT }}
            >
              <span className="text-sm font-medium">{position}</span>
              <span className="text-xs opacity-60">{active ? "Now" : "Empty"}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-700 via-emerald-800 to-green-900 p-6">
      <div className="field-pattern absolute inset-0 opacity-30" />

      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10" />
        <div className="absolute left-1/2 top-0 h-20 w-56 -translate-x-1/2 rounded-b-lg border-2 border-t-0 border-white/15" />
        <div className="absolute left-1/2 top-0 h-8 w-24 -translate-x-1/2 border-2 border-t-0 border-white/10" />
        <div className="absolute bottom-0 left-1/2 h-20 w-56 -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-white/15" />
        <div className="absolute bottom-0 left-1/2 h-8 w-24 -translate-x-1/2 border-2 border-b-0 border-white/10" />
        <div className="absolute left-0 top-0 h-6 w-6 rounded-br-full border-2 border-l-0 border-t-0 border-white/10" />
        <div className="absolute right-0 top-0 h-6 w-6 rounded-bl-full border-2 border-r-0 border-t-0 border-white/10" />
        <div className="absolute bottom-0 left-0 h-6 w-6 rounded-tr-full border-2 border-b-0 border-l-0 border-white/10" />
        <div className="absolute bottom-0 right-0 h-6 w-6 rounded-tl-full border-2 border-b-0 border-r-0 border-white/10" />
      </div>

      <div className="relative space-y-6">
        {rows.map((row) => (
          <div
            key={row.join("-")}
            className={cn(
              "flex justify-center",
              row.length >= 4 ? "gap-6" : "gap-8",
            )}
          >
            {row.map((i) => renderSlot(starters[i], i))}
          </div>
        ))}
      </div>
    </div>
  );
}
