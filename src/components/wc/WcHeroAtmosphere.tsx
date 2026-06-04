"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const PAGE_BG = "#050608";

/**
 * WC26 hero atmosphere — a full-bleed cinematic shot of the golden trophy under
 * stadium lights with falling confetti (clean broadcast art; the real national
 * flags now live in their own crisp ribbon layer, not faked into the image).
 * A slow, barely-there drift keeps it alive. Legibility scrims keep the left
 * copy zone readable and blend into the page.
 */
export function WcHeroAtmosphere() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050608]" aria-hidden>
      {/* Full-bleed cinematic trophy */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={reduce ? { scale: 1 } : { scale: [1, 1.045, 1] }}
        transition={
          reduce
            ? undefined
            : { duration: 26, ease: "easeInOut", repeat: Infinity }
        }
      >
        <Image
          src="/images/wc-hero-trophy-c.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center] sm:object-[64%_center]"
        />
      </motion.div>

      {/* Left-to-right legibility scrim — keeps the headline zone deep,
          but lighter than before so the flag ribbon reads through */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(5,6,8,0.9) 0%, rgba(5,6,8,0.66) 24%, rgba(5,6,8,0.26) 46%, rgba(5,6,8,0.04) 68%, transparent 100%)",
        }}
      />

      {/* Vertical depth — slightly lifts the middle, anchors top + bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,8,0.5) 0%, transparent 26%, transparent 64%, rgba(5,6,8,0.5) 100%)",
        }}
      />

      {/* Top fade into navbar + bottom fade into page bg */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#050608] to-transparent sm:h-24" />
      <div
        className="absolute inset-x-0 bottom-0 h-[24%] min-h-[150px]"
        style={{ background: `linear-gradient(180deg, transparent 0%, ${PAGE_BG} 94%)` }}
      />
    </div>
  );
}
