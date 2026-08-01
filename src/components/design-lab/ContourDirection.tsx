"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const PEAKS = [
  { name: "cryptokop", pts: 2847, x: 72, h: 88 },
  { name: "gw_hunter", pts: 2791, x: 58, h: 82 },
  { name: "movefan", pts: 2655, x: 44, h: 74 },
  { name: "you", pts: 2410, x: 38, h: 62, you: true },
];

/** Rankings as topographic terrain — data landscape. */
export function ContourDirection() {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section className="overflow-hidden rounded-sm border border-emerald-900/30 bg-[#0a0f0c]">
      <div className="border-b border-emerald-900/20 px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-500/50">
          Direction E · Topographic Rank
        </p>
        <h3 className="mt-1 text-lg font-medium text-emerald-50">Points Landscape</h3>
        <p className="mt-1 max-w-2xl text-sm text-emerald-100/35">
          Leaderboard = elevation map. Higher pts = peak. Hover a contour to reveal manager. Data viz as world.
        </p>
      </div>

      <div className="relative min-h-[420px] overflow-hidden">
        {/* Contour lines SVG */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          {[20, 35, 50, 65, 80].map((y, i) => (
            <motion.path
              key={y}
              d={`M 0 ${y} Q 25 ${y - 4 + i} 50 ${y} T 100 ${y}`}
              fill="none"
              stroke="rgba(52,211,153,0.15)"
              strokeWidth="0.3"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 1.2, ease: "easeInOut" }}
            />
          ))}
          {PEAKS.map((p, i) => (
            <g key={p.name}>
              <motion.line
                x1={p.x}
                y1={100 - p.h * 0.45}
                x2={p.x}
                y2={95}
                stroke={p.you ? "#00f948" : "rgba(52,211,153,0.4)"}
                strokeWidth={p.you ? "0.6" : "0.35"}
                strokeDasharray="1 1"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
              />
              <circle
                cx={p.x}
                cy={100 - p.h * 0.45}
                r={hover === i ? "2.2" : "1.5"}
                fill={p.you ? "#00f948" : "#34d399"}
                className="cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
        </svg>

        <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-between p-6 sm:p-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-500/40">Elevation key</p>
            <p className="mt-1 text-sm text-emerald-100/50">2,400m = top 10 cutoff</p>
          </div>

          <motion.div
            className="self-start rounded-sm border border-emerald-500/20 bg-black/50 px-4 py-3 backdrop-blur-sm"
            animate={{ opacity: hover !== null ? 1 : 0.6 }}
          >
            {hover !== null ? (
              <>
                <p className="font-mono text-[10px] uppercase text-emerald-500/60">{PEAKS[hover].name}</p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-white">{PEAKS[hover].pts}</p>
                <p className="text-xs text-emerald-400/60">elev. {Math.round(PEAKS[hover].h * 28)}m</p>
              </>
            ) : (
              <p className="text-sm text-white/40">Hover a peak</p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Data-as-landscape (Machine Football adj.)"
          title="Contour draw + peak probe"
          items={[
            { label: "contour draw", detail: "SVG pathLength 0→1 on scroll, 1.2s staggered 120ms. Map being surveyed." },
            { label: "peak hover", detail: "Circle radius 1.5→2.2, tooltip fades to full opacity. No card pop — label floats on terrain." },
            { label: "your peak", detail: "Green (#00f948) only for user's marker. Others emerald — hierarchy without gamification colors." },
            { label: "why unique", detail: "Leaderboard that doesn't look like a table. Memorable, screenshot-worthy." },
          ]}
        />
      </div>
    </section>
  );
}
