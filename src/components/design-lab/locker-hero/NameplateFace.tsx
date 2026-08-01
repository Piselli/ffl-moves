"use client";

import type { CSSProperties } from "react";
import type { NameplateStyleId } from "./nameplateStyles";
import {
  getNameplateFont,
  type NameplateFontId,
} from "./nameplateFonts";
import {
  getNameplateGlow,
  type NameplateGlowId,
} from "./nameplateGlows";
import { cn } from "@/lib/utils";

export type NameplateFaceProps = {
  styleId: NameplateStyleId;
  name: string;
  number: string | null;
  short?: string;
  badgeCode?: number;
  fontId?: NameplateFontId;
  glowId?: NameplateGlowId;
  className?: string;
};

/**
 * Flat face art — rendered at style faceW×faceH, then corner-pinned onto a door quad.
 * Production lock: number-card + Oswald + black ink + spot-soft glow.
 */
export function NameplateFace({
  styleId: _styleId,
  name,
  number,
  fontId = "oswald",
  glowId = "spot-soft",
  className,
}: NameplateFaceProps) {
  const font = getNameplateFont(fontId);
  const glow = getNameplateGlow(glowId);
  const type: CSSProperties = {
    fontFamily: font.family,
    letterSpacing: font.tracking,
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center rounded-[1px] px-[4%] py-[2%]",
        className,
      )}
      style={{
        background: glow.background,
        boxShadow: glow.boxShadow,
        filter: glow.filter,
      }}
    >
      <span
        className="max-w-full truncate text-[33px] font-semibold uppercase leading-none text-black"
        style={type}
      >
        {name}
      </span>
      {number ? (
        <span
          className="mt-[3px] max-w-full truncate text-[24px] font-semibold leading-none tabular-nums text-black"
          style={type}
        >
          {number}
        </span>
      ) : null}
    </div>
  );
}
