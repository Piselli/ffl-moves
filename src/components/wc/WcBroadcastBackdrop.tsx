"use client";

import { useReducedMotion } from "framer-motion";
import { Wc2026LogoMark } from "@/components/wc/Wc2026LogoMark";

/** Stadium broadcast atmosphere — photo backdrop, floodlights, WC 2026 logo on the left. */
export function WcBroadcastBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#020408]" />

      {/* Stadium photography */}
      <img
        src="/images/wc-hero-stadium.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-[0.72]"
      />

      {/* Night grade + WC blue/gold tint */}
      <div className="absolute inset-0 bg-[#020818]/55 mix-blend-multiply" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_14%_46%,rgba(255,215,0,0.28)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(46,125,50,0.18)_0%,transparent_55%)]" />

      {/* Broadcast vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(2,4,8,0.55)_100%)]" />

      {/* Kinetic scan lines */}
      {!reduceMotion && (
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)",
            animation: "wcScanDrift 12s linear infinite",
          }}
        />
      )}

      {/* Rotating broadcast ring behind logo */}
      <div className="absolute left-[4%] top-1/2 hidden w-[min(50vw,500px)] -translate-y-[48%] lg:block">
        <div
          className="relative aspect-square"
          style={reduceMotion ? undefined : { animation: "wcRingSpin 60s linear infinite" }}
        >
          <svg className="absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 400 400" fill="none">
            <circle cx="200" cy="200" r="188" stroke="#FFD700" strokeWidth="1.5" strokeDasharray="6 12" />
            <circle cx="200" cy="200" r="168" stroke="white" strokeWidth="0.75" strokeDasharray="3 16" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* WC 2026 logo — desktop, left side */}
      <Wc2026LogoMark
        className="absolute left-[6%] top-1/2 z-[2] hidden -translate-y-1/2 lg:block"
        imgClassName="w-[200px] drop-shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
      />

      {/* Mobile logo overlay */}
      <Wc2026LogoMark
        className="absolute left-3 top-[10%] z-[2] lg:hidden"
        imgClassName="w-[140px]"
      />

      {/* Readability scrims — keep center copy legible, leave left logo bright */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_48%,rgba(2,4,8,0.72)_0%,transparent_72%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020408] from-0% via-transparent via-[55%] to-[#020408]/30" />

      <style>{`
        @keyframes wcScanDrift {
          0% { transform: translateY(0); }
          100% { transform: translateY(8px); }
        }
        @keyframes wcRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-broadcast-backdrop * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
