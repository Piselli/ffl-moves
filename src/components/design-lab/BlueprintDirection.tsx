"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const PLAYERS = [
  { id: "P1", x: 50, y: 12, role: "ST", dim: "1.89m" },
  { id: "P2", x: 22, y: 38, role: "LW", dim: "1.78m" },
  { id: "P3", x: 78, y: 38, role: "RW", dim: "1.82m" },
  { id: "P4", x: 35, y: 58, role: "CM", dim: "1.85m" },
  { id: "P5", x: 65, y: 58, role: "CM", dim: "1.83m" },
  { id: "P6", x: 50, y: 88, role: "GK", dim: "1.91m" },
];

/** Architectural blueprint — formation as engineering drawing. */
export function BlueprintDirection() {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="overflow-hidden rounded-sm border border-cyan-500/20 bg-[#0a1628]">
      <div className="border-b border-cyan-500/15 px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-400/60">
          Direction A · Blueprint / Technical Draft
        </p>
        <h3 className="mt-1 text-lg font-medium text-cyan-50">Tactical Drawing</h3>
        <p className="mt-1 max-w-2xl text-sm text-cyan-100/40">
          Squad = engineering schematic. Dimension lines, grid refs, revision stamps. Zero game UI vocabulary.
        </p>
      </div>

      <div className="relative min-h-[480px] p-4 sm:p-8">
        {/* Blueprint grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="font-mono text-[10px] leading-relaxed text-cyan-400/50">
            <p>DRAWING NO. MM-GW24-001</p>
            <p>SCALE 1:100 · REV. {revealed ? "B" : "A"}</p>
            <p>MOVEMENT NETWORK · VERIFIED LAYER</p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-4 border border-cyan-400/40 px-4 py-2 text-[11px] uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-400/10"
            >
              Issue revision B
            </button>
          </div>

          <div className="relative mx-auto aspect-[3/4] w-full max-w-md border border-cyan-400/30 bg-[#0d1f3c]/80">
            {/* Pitch outline */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect x="4" y="4" width="92" height="92" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="0.4" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(56,189,248,0.25)" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(56,189,248,0.25)" strokeWidth="0.3" />

              {PLAYERS.map((p, i) => (
                <g key={p.id}>
                  <motion.line
                    x1={p.x}
                    y1={p.y}
                    x2={p.x}
                    y2={p.y - 8}
                    stroke="rgba(56,189,248,0.5)"
                    strokeWidth="0.25"
                    strokeDasharray="1 0.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: revealed || reduce ? 1 : 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                  />
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r="2.5"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="0.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
                  />
                  <text x={p.x} y={p.y + 0.8} textAnchor="middle" fill="rgba(56,189,248,0.9)" fontSize="2.5" fontFamily="monospace">
                    {p.id}
                  </text>
                </g>
              ))}
            </svg>

            {PLAYERS.map((p) => (
              <div
                key={`label-${p.id}`}
                className="absolute font-mono text-[9px] text-cyan-400/70"
                style={{ left: `${p.x}%`, top: `${p.y + 6}%`, transform: "translateX(-50%)" }}
              >
                {p.role} · {p.dim}
              </div>
            ))}

            {revealed && (
              <motion.div
                initial={reduce ? false : { opacity: 0, rotate: -12, scale: 1.2 }}
                animate={{ opacity: 1, rotate: -12, scale: 1 }}
                className="absolute bottom-4 right-4 border-2 border-[#00f948]/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#00f948]"
              >
                Approved
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Architectural CAD"
          title="Line-draw reveal"
          items={[
            { label: "player nodes", detail: "SVG circles draw in sequence, 100ms stagger. stroke-dashoffset technique — blueprint being plotted by machine." },
            { label: "dimension lines", detail: "On 'Issue revision B': dashed leader lines extend upward 500ms each. Feels like design approval, not gamification unlock." },
            { label: "stamp", detail: "APPROVED stamp: rotate -12deg, scale 1.2→1, 400ms. Green only on stamp border — one accent moment." },
          ]}
        />
      </div>
    </section>
  );
}
