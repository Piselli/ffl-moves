"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FORMATION_OPTIONS,
  type FormationId,
} from "@/lib/formation";

type Props = {
  value: FormationId;
  onChange: (id: FormationId) => void;
  className?: string;
  /** Compact trigger for pitch chrome */
  size?: "xs" | "sm" | "md";
  /** Registered squad — show the scheme, don't allow switching. */
  locked?: boolean;
};

export function FormationPicker({
  value,
  onChange,
  className,
  size = "sm",
  locked = false,
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (locked) setOpen(false);
  }, [locked]);

  const triggerPad =
    size === "xs"
      ? "px-2.5 py-1 text-[10px] leading-none tracking-[0.06em]"
      : size === "md"
        ? "px-3.5 py-1.5 text-[12px] tracking-[0.07em]"
        : "px-3 py-1.5 text-[11px] tracking-[0.06em]";

  const optionPad =
    size === "xs"
      ? "px-2.5 py-1.5 text-[10px] tracking-[0.06em]"
      : size === "md"
        ? "px-3.5 py-2 text-[12px] tracking-[0.07em]"
        : "px-3 py-1.5 text-[11px] tracking-[0.06em]";

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="Formation"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={locked}
        onClick={() => {
          if (!locked) setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-black/10 bg-white font-bold uppercase text-black shadow-[0_1px_4px_rgba(0,0,0,0.28)] transition-[transform,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
          triggerPad,
          locked
            ? "cursor-default opacity-90"
            : "hover:bg-white/95 active:scale-[0.97]",
        )}
      >
        <span className="whitespace-nowrap">{value}</span>
        {locked ? null : (
          <motion.span
            aria-hidden
            className="text-[0.85em] text-black/45"
            animate={{ rotate: open ? 180 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 32 }
            }
          >
            ▾
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && !locked ? (
          <motion.div
            id={listId}
            role="listbox"
            aria-label="Choose formation"
            initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 6, scale: 0.96 }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 460, damping: 34 }
            }
            className="absolute bottom-[calc(100%+6px)] left-0 z-40 min-w-[4.75rem] overflow-hidden rounded-xl border border-white/20 bg-black/90 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)] backdrop-blur-md"
          >
            {FORMATION_OPTIONS.map((id) => {
              const on = id === value;
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg font-bold uppercase transition-colors duration-120",
                    optionPad,
                    on
                      ? "bg-white text-black"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span className="whitespace-nowrap">{id}</span>
                  {on ? (
                    <span className="shrink-0 text-[0.9em] opacity-70">✓</span>
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
