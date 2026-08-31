"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Starter slot (0–10) — bench slots never show captain affordance. */
  isStarter: boolean;
  isCaptain: boolean;
  onSetCaptain: () => void;
  onRemove: () => void;
  captainLabel: string;
  removeLabel: string;
  compact?: boolean;
};

/**
 * Hover / touch affordances on a filled pitch slot — captain (C) without blocking remove.
 * Parent button still clears on tap; C and × stop propagation.
 */
export function PitchFilledSlot({
  children,
  isStarter,
  isCaptain,
  onSetCaptain,
  onRemove,
  captainLabel,
  removeLabel,
  compact = false,
}: Props) {
  const btnSize = compact ? "h-[18px] w-[18px] text-[8px]" : "h-5 w-5 text-[9px]";

  return (
    <span className="group/slot relative flex flex-col items-center">
      {isStarter ? (
        <button
          type="button"
          className={cn(
            "absolute z-20 flex items-center justify-center rounded-full font-black leading-none transition-[opacity,transform,box-shadow] duration-150",
            "hover:scale-105 active:scale-95",
            btnSize,
            isCaptain
              ? "opacity-100 bg-amber-400 text-black shadow-[0_0_0_1.5px_rgba(212,175,55,0.9),0_2px_8px_rgba(0,0,0,0.45)]"
              : cn(
                  "bg-black/80 text-amber-200/95 shadow-[0_1px_4px_rgba(0,0,0,0.5)]",
                  "opacity-0 group-hover/slot:opacity-100",
                  "[@media(hover:none)]:opacity-85",
                ),
            compact ? "-right-0.5 -top-0.5" : "-right-1 -top-1",
          )}
          aria-label={captainLabel}
          aria-pressed={isCaptain}
          onClick={(e) => {
            e.stopPropagation();
            onSetCaptain();
          }}
        >
          C
        </button>
      ) : null}

      {isStarter ? (
        <button
          type="button"
          className={cn(
            "absolute z-20 hidden items-center justify-center rounded-full font-bold leading-none",
            "bg-black/80 text-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.5)]",
            "opacity-0 transition-opacity duration-150 group-hover/slot:flex group-hover/slot:opacity-100",
            btnSize,
            compact ? "-left-0.5 -top-0.5" : "-left-1 -top-1",
          )}
          aria-label={removeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      ) : null}

      {children}
    </span>
  );
}
