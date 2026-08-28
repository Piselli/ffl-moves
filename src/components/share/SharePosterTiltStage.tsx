"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  SQUAD_SHARE_CARD_WIDTH,
  SHARE_CARD_CORNER_RADIUS_PX,
} from "@/components/share/shareCardTypes";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** Scaled 3D preview — pointer tilt, no chrome panel. */
export function SharePosterTiltStage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const reduce = Boolean(useReducedMotion());

  const rotateX = useSpring(0, { stiffness: 220, damping: 22, mass: 0.55 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 22, mass: 0.55 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.14) 0%, transparent 52%)`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const w = el.clientWidth;
      setScale(Math.min(1, w / SQUAD_SHARE_CARD_WIDTH));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetTilt = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }, [glareX, glareY, rotateX, rotateY]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduce) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const nx = (px - 0.5) * 2;
      const ny = (py - 0.5) * 2;
      rotateY.set(nx * 11);
      rotateX.set(-ny * 8);
      glareX.set(px * 100);
      glareY.set(py * 100);
    },
    [glareX, glareY, reduce, rotateX, rotateY],
  );

  return (
    <div
      ref={containerRef}
      className={cn("w-full cursor-default select-none [&_*]:cursor-default [&_*]:select-none", className)}
      style={{ perspective: reduce ? undefined : "1400px" }}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
    >
      <div
        style={{
          height: SQUAD_SHARE_CARD_HEIGHT * scale + 28,
          paddingBottom: 12,
        }}
      >
        <motion.div
          className="relative mx-auto"
          style={{
            width: SQUAD_SHARE_CARD_WIDTH * scale,
            height: SQUAD_SHARE_CARD_HEIGHT * scale,
            rotateX: reduce ? 0 : rotateX,
            rotateY: reduce ? 0 : rotateY,
            transformStyle: "preserve-3d",
          }}
          initial={reduce ? false : { opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduce ? 0.12 : 0.42, ease: EASE_OUT }}
        >
          <div
            aria-hidden
            className="absolute -inset-3 bg-black/90 ring-1 ring-white/[0.06]"
            style={{
              borderRadius: SHARE_CARD_CORNER_RADIUS_PX + 6,
              boxShadow: "0 24px 64px rgba(0,0,0,0.75)",
            }}
          />
          <div
            className="origin-top-left"
            style={{
              transform: `scale(${scale})`,
              width: SQUAD_SHARE_CARD_WIDTH,
              height: SQUAD_SHARE_CARD_HEIGHT,
              filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.55))",
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                width: SQUAD_SHARE_CARD_WIDTH,
                height: SQUAD_SHARE_CARD_HEIGHT,
                borderRadius: SHARE_CARD_CORNER_RADIUS_PX,
                transformStyle: "preserve-3d",
              }}
            >
              {children}
              {!reduce ? (
                <motion.div
                  data-share-overlay
                  className="pointer-events-none absolute inset-0 z-20"
                  style={{
                    background: glareBg,
                    mixBlendMode: "soft-light",
                  }}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Invisible 1:1 card for PNG export — same radius + hairline as preview. */
export function SharePosterExportRoot({
  exportRef,
  children,
}: {
  exportRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={exportRef}
      aria-hidden
      className="share-export-capture pointer-events-none absolute left-1/2 top-0 -z-10 overflow-hidden select-none"
      style={{
        width: SQUAD_SHARE_CARD_WIDTH,
        height: SQUAD_SHARE_CARD_HEIGHT,
        marginLeft: -SQUAD_SHARE_CARD_WIDTH / 2,
        opacity: 0.001,
      }}
    >
      {children}
    </div>
  );
}
