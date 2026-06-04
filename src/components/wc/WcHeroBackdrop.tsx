"use client";

import { WcGrassStripeBg } from "@/components/wc/WcDecor";

/** Full-bleed stadium atmosphere for the WC hero — pitch perspective, lights, watermark. No flag pills. */
export function WcHeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#0a0c0e]" />

      {/* Stadium floodlights */}
      <div className="absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_72%)]" />
      <div className="absolute right-[18%] top-0 h-[70%] w-[35%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,249,72,0.09)_0%,transparent_65%)]" />

      {/* Pitch atmosphere — bottom-right */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_92%_85%,rgba(46,125,50,0.42)_0%,transparent_58%)]" />

      {/* Perspective pitch surface */}
      <div
        className="absolute -right-[8%] bottom-[-22%] h-[72%] w-[92%] max-w-[920px]"
        style={{ transform: "perspective(1400px) rotateX(62deg) rotateZ(-1.5deg)", transformOrigin: "50% 100%" }}
      >
        <div
          className="absolute inset-0 shadow-[0_-40px_120px_rgba(0,0,0,0.65)]"
          style={{
            backgroundColor: "#2E7D32",
            backgroundImage: `repeating-linear-gradient(
              90deg,
              rgba(0,0,0,0) 0px,
              rgba(0,0,0,0) 44px,
              rgba(0,0,0,0.07) 44px,
              rgba(0,0,0,0.07) 88px
            )`,
            border: "3px solid rgba(255,255,255,0.22)",
          }}
        >
          <WcGrassStripeBg className="opacity-[0.35]" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 520" preserveAspectRatio="none" fill="none">
            <rect x="24" y="24" width="752" height="472" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
            <line x1="24" y1="260" x2="776" y2="260" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
            <circle cx="400" cy="260" r="72" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
            <rect x="220" y="360" width="360" height="136" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
            <rect x="300" y="420" width="200" height="76" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      {/* Background year — integrated, not in a card */}
      <p className="absolute right-[4%] top-[22%] hidden font-display text-[clamp(7rem,22vw,16rem)] font-black leading-none tracking-[-0.05em] text-white/[0.035] sm:block">
        2026
      </p>

      {/* Readability scrims */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0D0F12] via-[#0D0F12]/92 via-[38%] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F12] from-0% via-transparent via-[45%] to-[#0D0F12]/50" />
    </div>
  );
}
