"use client";

import type { ReactNode } from "react";
import { IpadFrame } from "./IpadFrame";

type Placement = "locker" | "desk";

export const TABLET_MOTION_MS = 520;
const TABLET_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export const IPAD_FRAME_SIZE =
  "aspect-[0.2816/0.2155] w-[min(99vw,calc(98.9vh*0.2816/0.2155))] shrink-0 will-change-transform";

const DOM_LOCKER_RAISED =
  "translate3d(0, 3vh, 0) rotateX(0deg) rotateZ(0deg) scale(1)";
const DOM_LOCKER_LOWERED =
  "translate3d(0, 46vh, 0) rotateX(28deg) rotateZ(1.4deg) scale(0.9)";
const DOM_DESK_RAISED =
  "translate3d(0, 4vh, 0) rotateX(0deg) rotateZ(0deg) scale(1)";
const DOM_DESK_LOWERED =
  "translate3d(0, 24vh, 0) rotateX(14deg) rotateZ(0.3deg) scale(0.9)";

function domTabletTransform(placement: Placement, raised: boolean): string {
  if (placement === "desk") {
    return raised ? DOM_DESK_RAISED : DOM_DESK_LOWERED;
  }
  return raised ? DOM_LOCKER_RAISED : DOM_LOCKER_LOWERED;
}

type Props = {
  raised: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  onPointerInsideChange?: (inside: boolean) => void;
  placement?: Placement;
};

/** CSS iPad — no WebGL. Used until the 3D model is ready, and as a WebGL fallback. */
export function TabletDomFrame({
  raised,
  reduceMotion,
  children,
  onPointerInsideChange,
  placement = "locker",
}: Props) {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center overflow-hidden pt-[4vh]"
      style={{
        pointerEvents: raised ? "auto" : "none",
        perspective: "1200px",
        perspectiveOrigin: placement === "desk" ? "50% 55%" : "50% 35%",
      }}
    >
      <div
        className={IPAD_FRAME_SIZE}
        style={{
          transform: domTabletTransform(placement, raised),
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
