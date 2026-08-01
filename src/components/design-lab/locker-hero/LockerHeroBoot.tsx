"use client";

import { cn } from "@/lib/utils";

type Props = {
  /** False starts the fade-out; unmount after the transition ends. */
  visible: boolean;
  reduceMotion: boolean;
  onFadeComplete?: () => void;
};

/** Covers the locker plate until the hero scene is composited — site homepage only. */
export function LockerHeroBoot({
  visible,
  reduceMotion,
  onFadeComplete,
}: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 z-[100] bg-[#1a1816]",
        !reduceMotion && "transition-opacity duration-[650ms] ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ pointerEvents: visible ? "auto" : "none" }}
      onTransitionEnd={(e) => {
        if (e.propertyName !== "opacity" || visible) return;
        onFadeComplete?.();
      }}
    />
  );
}
