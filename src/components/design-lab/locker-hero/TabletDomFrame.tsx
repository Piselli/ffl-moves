"use client";

import type { ReactNode } from "react";
import { IpadFrame } from "./IpadFrame";

type Placement = "locker" | "desk";

export const TABLET_MOTION_MS = 520;
const TABLET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * CSS box shared by Dom + WebGL wrappers.
 * The 3D camera only fills ~78–82% of this box (see ResponsiveCamera) — Dom
 * must apply DOM_MATCH_WEBGL_SCALE or the preview looks huge for a beat.
 */
export const IPAD_FRAME_SIZE =
  "aspect-[0.2816/0.2155] w-[min(99vw,calc(98.9vh*0.2816/0.2155))] shrink-0 will-change-transform";

/** Match ResponsiveCamera targetWidthFill / heightFill so Dom ≈ final WebGL size. */
export const DOM_MATCH_WEBGL_SCALE = 0.82;

type Props = {
  raised: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  onPointerInsideChange?: (inside: boolean) => void;
  placement?: Placement;
  /**
   * Shrink Dom to the on-screen size of the 3D iPad (fast homepage preview).
   * Without this, Dom fills the full CSS box and looks oversized until WebGL.
   */
  matchWebglScale?: boolean;
};

function domTabletTransform(
  placement: Placement,
  raised: boolean,
  matchWebgl: boolean,
): string {
  const fill = matchWebgl ? DOM_MATCH_WEBGL_SCALE : 1;
  const loweredScale = 0.9 * fill;
  if (placement === "desk") {
    return raised
      ? `translate3d(0, 4vh, 0) rotateX(0deg) rotateZ(0deg) scale(${fill})`
      : `translate3d(0, 24vh, 0) rotateX(14deg) rotateZ(0.3deg) scale(${loweredScale})`;
  }
  return raised
    ? `translate3d(0, 3vh, 0) rotateX(0deg) rotateZ(0deg) scale(${fill})`
    : `translate3d(0, 46vh, 0) rotateX(28deg) rotateZ(1.4deg) scale(${loweredScale})`;
}

/** CSS iPad — no WebGL. Used until the 3D model is ready, and as a WebGL fallback. */
export function TabletDomFrame({
  raised,
  reduceMotion,
  children,
  onPointerInsideChange,
  placement = "locker",
  matchWebglScale = false,
}: Props) {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[4vh]"
      style={{
        pointerEvents: raised ? "auto" : "none",
        // Match TabletScene canvas wrapper so Dom↔WebGL crossfade doesn't jump.
        perspective: "1400px",
        perspectiveOrigin: placement === "desk" ? "50% 58%" : "50% 38%",
      }}
    >
      <div
        className={IPAD_FRAME_SIZE}
        style={{
          transform: domTabletTransform(placement, raised, matchWebglScale),
          transition: reduceMotion
            ? "none"
            : `transform ${TABLET_MOTION_MS}ms ${TABLET_EASE}`,
          transformOrigin: placement === "desk" ? "50% 85%" : "50% 50%",
        }}
      >
        <IpadFrame onPointerInsideChange={onPointerInsideChange}>
          {children}
        </IpadFrame>
      </div>
    </div>
  );
}
