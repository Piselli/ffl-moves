"use client";

import { Form8Mark } from "@/components/Form8Mark";
import { cn } from "@/lib/utils";

type Props = {
  /** False starts the fade-out; unmount after the transition ends. */
  visible: boolean;
  reduceMotion: boolean;
  onFadeComplete?: () => void;
};

/**
 * Covers the locker plate until the hero scene is composited — site homepage only.
 * Brand mark on pure black keeps the hold intentional until the settled frame.
 */
export function LockerHeroBoot({
  visible,
  reduceMotion,
  onFadeComplete,
}: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 z-[100] flex items-center justify-center bg-black",
        !reduceMotion && "transition-opacity duration-[480ms] ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ pointerEvents: visible ? "auto" : "none" }}
      onTransitionEnd={(e) => {
        if (e.propertyName !== "opacity" || visible) return;
        onFadeComplete?.();
      }}
    >
      <Form8Mark
        priority
        className={cn(
          "h-[4.5rem] w-auto sm:h-20",
          reduceMotion ? "opacity-95" : "opacity-90 animate-pulse",
        )}
      />
    </div>
  );
}
