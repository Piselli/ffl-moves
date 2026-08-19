"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { SPRING_PILL } from "@/lib/uiMotion";
import { cn } from "@/lib/utils";

export type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";

const POSITIONS: PositionFilter[] = ["ALL", "GK", "DEF", "MID", "FWD"];

export function PositionFilterPills({
  value,
  onChange,
  layoutId,
  size = "md",
  className,
}: {
  value: PositionFilter;
  onChange: (pos: PositionFilter) => void;
  layoutId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <LayoutGroup id={layoutId}>
      <div
        role="group"
        aria-label="Position"
        className={cn(
          "flex rounded-xl border border-white/[0.08] bg-black/30 p-0.5",
          size === "sm" && "overflow-x-auto no-scrollbar",
          className,
        )}
      >
        {POSITIONS.map((pos) => {
          const on = value === pos;
          return (
            <button
              key={pos}
              type="button"
              onClick={() => onChange(pos)}
              aria-pressed={on}
              className={cn(
                "relative font-medium uppercase tracking-[0.06em] transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]",
                size === "md" && "flex-1 px-3 py-2 text-sm",
                size === "sm" && "shrink-0 px-3 py-1.5 text-xs font-bold",
                on ? "text-[#00f948]" : "text-white/50 hover:text-white/80",
              )}
            >
              {on ? (
                <motion.span
                  layoutId={`${layoutId}-pill`}
                  className="absolute inset-0 rounded-lg bg-[#00f948]/15"
                  transition={reduce ? { duration: 0 } : SPRING_PILL}
                />
              ) : null}
              <span className="relative z-10">{pos}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
