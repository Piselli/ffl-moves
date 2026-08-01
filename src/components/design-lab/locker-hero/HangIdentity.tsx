"use client";

import { useEffect, useRef, useState } from "react";
import type { Player } from "@/lib/types";
import type { HangBay } from "./hangBays";
import {
  cssMatrix3dFromQuadPct,
  isCompleteQuad,
  objectCoverRect,
  resolveNameplateQuads,
  type CoverRect,
  type NameplateQuadPct,
} from "./nameplateQuads";
import {
  getNameplateStyle,
  type NameplateStyleId,
} from "./nameplateStyles";
import {
  ACTIVE_NAMEPLATE_FONT,
  type NameplateFontId,
} from "./nameplateFonts";
import {
  ACTIVE_NAMEPLATE_GLOW,
  type NameplateGlowId,
} from "./nameplateGlows";
import { NameplateFace } from "./NameplateFace";

/** Locked pick — white surname placard + Oswald + black ink + spot-soft glow. */
export const ACTIVE_NAMEPLATE_STYLE: NameplateStyleId = "everton-card";

type Props = {
  player: Player;
  bay: HangBay;
  /** Full-bleed plate cutout vs positioned sprite (nameplate always door-pinned). */
  plateAligned: boolean;
  glowId?: NameplateGlowId;
  /** When set (lab), allow localStorage calibrator overrides. */
  preferBakedQuads?: boolean;
  /**
   * Shared object-cover stage for the 16:9 plate inside the viewport.
   * Required so door % quads track the background/kits cover crop.
   */
  cover: CoverRect;
};

function shirtName(player: Player): string {
  return (player.webName ?? player.name).trim().toUpperCase();
}

/**
 * Stall naming on the white door above the hung kit.
 * Production path: corner-pin onto calibrated door quads.
 */
export function HangIdentity({
  player,
  bay,
  glowId,
  preferBakedQuads = true,
  cover,
}: Props) {
  const name = shirtName(player);

  return (
    <PinnedDoorNameplate
      bayId={bay.id}
      name={name}
      glowId={glowId ?? ACTIVE_NAMEPLATE_GLOW}
      preferBakedQuads={preferBakedQuads}
      cover={cover}
    />
  );
}

function PinnedDoorNameplate({
  bayId,
  name,
  glowId,
  preferBakedQuads,
  cover,
}: {
  bayId: string;
  name: string;
  glowId: NameplateGlowId;
  preferBakedQuads: boolean;
  cover: CoverRect;
}) {
  const [quads, setQuads] = useState<Record<string, NameplateQuadPct>>({});
  const fontId: NameplateFontId = ACTIVE_NAMEPLATE_FONT;
  const style = getNameplateStyle(ACTIVE_NAMEPLATE_STYLE);
  const quad = quads[bayId];

  useEffect(() => {
    setQuads(resolveNameplateQuads({ preferBaked: preferBakedQuads }));
  }, [preferBakedQuads]);

  const m =
    isCompleteQuad(quad) && cover.w > 0
      ? cssMatrix3dFromQuadPct(
          quad,
          cover.w,
          cover.h,
          style.faceW,
          style.faceH,
        )
      : null;

  if (!m || cover.w <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: cover.x,
        top: cover.y,
        width: cover.w,
        height: cover.h,
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: style.faceW,
          height: style.faceH,
          transform: m,
          transformOrigin: "0 0",
        }}
      >
        <NameplateFace
          styleId={ACTIVE_NAMEPLATE_STYLE}
          fontId={fontId}
          glowId={glowId}
          name={name}
          number={null}
        />
      </div>
    </div>
  );
}

/** Measure the viewport host and compute the plate's object-cover rect. */
export function usePlateCoverRect() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [cover, setCover] = useState<CoverRect>({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      setCover(objectCoverRect(r.width, r.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return { hostRef, cover };
}
