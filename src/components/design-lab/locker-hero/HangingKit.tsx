"use client";

import { clubKitSrc } from "./clubKitAsset";
import type { HangBay } from "./hangBays";

type Props = {
  teamId: number;
  bay: HangBay;
  bayIndex: number;
  position?: "GK" | "DEF" | "MID" | "FWD" | string;
  /**
   * When true, parent already positioned a full-bleed layer —
   * this component only renders the plate-aligned img.
   */
  fullBleed?: boolean;
};

/**
 * Hang kit for one bay.
 * Plate-aligned cutouts: no CSS yaw (geometry baked in source).
 * Legacy sprites: mild yaw + cool grade until hang-bay pack exists.
 */
export function HangingKit({
  teamId,
  bay,
  bayIndex,
  position,
  fullBleed = false,
}: Props) {
  const ref = clubKitSrc(teamId, bayIndex, bay.id, position);
  if (!ref) return null;

  if (ref.plateAligned || fullBleed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={ref.src}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
        aria-hidden
      />
    );
  }

  const yaw = bay.yaw;
  const absYaw = Math.abs(yaw);
  const exposure = Math.max(0.78, 0.98 - absYaw * 0.0045);
  const saturate = Math.max(0.86, 0.97 - absYaw * 0.0015);
  const cool = Math.min(0.1, absYaw * 0.0018);

  return (
    <div
      className="relative h-full w-full origin-top"
      style={{
        transform: `perspective(1600px) rotateY(${yaw * 0.34}deg)`,
        transformOrigin: yaw >= 0 ? "left top" : "right top",
        filter: `brightness(${exposure}) saturate(${saturate})`,
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[6%] h-[78%] w-[58%] -translate-x-1/2 rounded-[46%]"
        style={{
          background: `radial-gradient(ellipse at 50% 42%, rgba(12,18,28,${0.28 + absYaw * 0.002}) 0%, rgba(12,18,28,0.1) 48%, transparent 74%)`,
          filter: "blur(5px)",
          opacity: 0.7 + absYaw * 0.003,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ref.src}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-contain object-top"
        draggable={false}
        style={{
          filter: cool > 0 ? `hue-rotate(${-cool * 40}deg)` : undefined,
        }}
      />
    </div>
  );
}
