"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  SQUAD_SHARE_CARD_WIDTH,
} from "@/components/SquadLockShareCard";
import type { ShareModalLayout } from "@/components/ShareSquadOnXModal";
import {
  ShareCopyPosterMotion,
  shareCopyPosterPulse,
} from "@/components/share/shareCopyMotions";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** Scaled preview only — never used for PNG export. */
export function SharePosterPreview({
  children,
  className,
  copied,
  copying,
  copiedLabel = "Copied",
  copyMotion = "classic",
}: {
  children: React.ReactNode;
  className?: string;
  copied?: boolean;
  copying?: boolean;
  copiedLabel?: string;
  copyMotion?: ShareModalLayout;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const reduce = Boolean(useReducedMotion());

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

  const pulse = shareCopyPosterPulse(copyMotion, Boolean(copied), reduce);

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <motion.div
        style={{ height: SQUAD_SHARE_CARD_HEIGHT * scale }}
        animate={pulse}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <div
          className="origin-top-left overflow-hidden rounded-[20px] ring-1 ring-white/[0.08]"
          style={{
            transform: `scale(${scale})`,
            width: SQUAD_SHARE_CARD_WIDTH,
            height: SQUAD_SHARE_CARD_HEIGHT,
          }}
        >
          <div
            className="relative overflow-hidden rounded-[inherit]"
            style={{
              width: SQUAD_SHARE_CARD_WIDTH,
              height: SQUAD_SHARE_CARD_HEIGHT,
            }}
          >
            {children}
            <motion.div
              className="pointer-events-none absolute inset-0 z-10 bg-black"
              animate={{ opacity: copying ? 0.06 : 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              aria-hidden
            />
            <ShareCopyPosterMotion
              variant={copyMotion}
              label={copiedLabel}
              copied={Boolean(copied)}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Full 1200×630 off-screen card — sole PNG capture target. */
export function SharePosterExportLayer({
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
      className="pointer-events-none fixed top-0 left-0"
      style={{
        width: SQUAD_SHARE_CARD_WIDTH,
        height: SQUAD_SHARE_CARD_HEIGHT,
        transform: "translateX(-200vw)",
        zIndex: -1,
      }}
    >
      {children}
    </div>
  );
}
