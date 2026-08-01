"use client";

/**
 * Pitch mini jersey — cropped from the same hang-bay plates as the locker
 * background. No fake collars; Everton yellow trim only where the plate has it.
 */

import { useEffect, useState } from "react";
import { clubKitFor } from "./clubKitColors";

const PITCH_MINI = "/design-lab/locker-hero/kit/pitch-mini";
const CLUBS_FALLBACK = "/design-lab/locker-hero/kit/clubs";
const KIT_CACHE = "v10";

export function MiniKitIcon({
  teamId,
  size = 52,
  position,
  className,
}: {
  teamId: number;
  size?: number;
  position?: "GK" | "DEF" | "MID" | "FWD" | string;
  variant?: string;
  className?: string;
}) {
  const role = position === "GK" ? "gk" : "home";
  const primary = `${PITCH_MINI}/t${teamId}-${role}.webp?${KIT_CACHE}`;
  const fallback = `${CLUBS_FALLBACK}/t${teamId}-${role}.png?${KIT_CACHE}`;
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);
  const colors = clubKitFor(teamId);
  const h = Math.round(size * 1.2);

  useEffect(() => {
    setSrc(primary);
    setFailed(false);
  }, [primary]);

  if (failed) {
    return (
      <span
        className={className}
        style={{
          width: size,
          height: h,
          display: "block",
          borderRadius: "28% 28% 22% 22% / 18% 18% 28% 28%",
          background: colors.primary,
          boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
        }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt=""
      width={size}
      height={h}
      draggable={false}
      aria-hidden
      className={className}
      onError={() => {
        if (src !== fallback) {
          setSrc(fallback);
          return;
        }
        setFailed(true);
      }}
      style={{
        width: size,
        height: h,
        objectFit: "contain",
        objectPosition: "center center",
        display: "block",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}
