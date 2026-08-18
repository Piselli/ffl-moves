"use client";

import { cn } from "@/lib/utils";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  FORMATION_OPTIONS,
  type FormationId,
} from "@/lib/formation";

type Props = {
  value: FormationId;
  onChange: (id: FormationId) => void;
  className?: string;
  /** Compact pill for pitch chrome */
  size?: "xs" | "sm" | "md";
};

export function FormationPicker({
  value,
  onChange,
  className,
  size = "sm",
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <LayoutGroup id="formation-picker">
      <div
        role="group"
        aria-label="Formation"
        className={cn(
          "inline-flex items-center rounded-full border border-white/15 bg-black/45 p-0.5 backdrop-blur-sm",
          className,
        )}
      >
        {FORMATION_OPTIONS.map((id) => {
          const on = id === value;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={on}
              className={cn(
                "relative rounded-full font-bold uppercase tracking-[0.08em] transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]",
                size === "xs" && "px-1.5 py-0.5 text-[8px] leading-none",
                size === "sm" && "px-2.5 py-1 text-[9px]",
                size === "md" && "px-3 py-1.5 text-[10px]",
                on ? "text-black" : "text-white/70 hover:text-white",
              )}
            >
              {on ? (
                <motion.span
                  layoutId="formation-pill"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              ) : null}
              <span className="relative z-10">{id}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
