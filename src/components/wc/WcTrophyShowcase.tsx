"use client";

import { useReducedMotion } from "framer-motion";

/** Feather the trophy plate's black edges so the bokeh dissolves into the bg. */
const TROPHY_MASK =
  "radial-gradient(72% 86% at 50% 46%, #000 52%, transparent 84%)";

/**
 * The real FIFA trophy as the right-side focal — gold on black, screen-blended
 * so the confetti bokeh melts into the flag wall, with an orbiting specular
 * shine, a soft gold glow and a gentle float. Motion respects reduced-motion.
 */
export function WcTrophyShowcase() {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center">
      {/* Gold glow pool behind the cup */}
      <div
        className="wc-anim absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(233,196,106,0.34) 0%, rgba(214,170,90,0.12) 38%, transparent 68%)",
          filter: "blur(6px)",
          animation: reduce ? undefined : "wcGlowPulse 6s ease-in-out infinite",
        }}
        aria-hidden
      />

      <div
        className="wc-anim relative w-[clamp(220px,25vw,360px)]"
        style={{ animation: reduce ? undefined : "wcFloat 7s ease-in-out infinite" }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            WebkitMaskImage: TROPHY_MASK,
            maskImage: TROPHY_MASK,
            mixBlendMode: "screen",
          }}
        >
          <img
            src="/images/wc-trophy-hero.png"
            alt="FIFA World Cup trophy"
            width={1024}
            height={683}
            className="block h-auto w-full select-none"
            draggable={false}
          />
          {/* Orbiting specular shine across the metal */}
          {!reduce && (
            <div
              className="wc-anim pointer-events-none absolute inset-y-0 left-0 w-1/3 mix-blend-screen"
              style={{
                background:
                  "linear-gradient(105deg, transparent, rgba(255,247,222,0.55) 48%, transparent)",
                animation: "wcShine 6.5s ease-in-out 1.5s infinite",
              }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}
