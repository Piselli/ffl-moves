"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const FOIL = "linear-gradient(180deg, #ffffff 0%, #eef1f5 44%, #b9bfca 100%)";
const GOLD = "linear-gradient(180deg, #f8e7ad 0%, #e9c873 48%, #c79a3b 100%)";

/** Metacade / Avark broadcast energy + ceremonial foil moments. */
export function BroadcastDirection() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "lock">("idle");

  return (
    <section className="overflow-hidden rounded-sm border border-white/[0.08] bg-[#020408]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Direction 04 · Metacade / Avark / Broadcast
        </p>
        <h3 className="mt-1 text-lg font-medium text-white/90">Ceremonial Broadcast</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Immersive stadium atmosphere for peak moments. Foil type, scan lines, host-nation bars — reserved for
          registration lock and bracket wins.
        </p>
      </div>

      <div className="relative min-h-[520px] overflow-hidden">
        {/* Stadium atmosphere */}
        <div className="absolute inset-0 bg-[#020408]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 4px)",
            animation: reduce ? undefined : "designLabScan 14s linear infinite",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,4,8,0.75)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(46,125,50,0.2),transparent_60%)]" />

        {/* Host nation bars */}
        <div className="absolute right-6 top-6 flex h-24 gap-1 sm:right-10 sm:top-10 sm:h-32">
          {[
            { c: "#B22234", w: "w-3 sm:w-4" },
            { c: "#FFFFFF", w: "w-3 sm:w-4" },
            { c: "#3C3B6E", w: "w-3 sm:w-4" },
            { c: "#006847", w: "w-3 sm:w-4" },
            { c: "#FFFFFF", w: "w-3 sm:w-4" },
            { c: "#CE1126", w: "w-3 sm:w-4" },
            { c: "#FF0000", w: "w-2 sm:w-3" },
            { c: "#FFFFFF", w: "w-2 sm:w-3" },
            { c: "#FF0000", w: "w-2 sm:w-3" },
          ].map((bar, i) => (
            <div key={i} className={`${bar.w} h-full opacity-80`} style={{ backgroundColor: bar.c }} />
          ))}
        </div>

        <div className="relative z-10 flex min-h-[520px] flex-col items-center justify-center px-6 py-16 text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#00f948]"
          >
            Movement Network · Verified
          </motion.p>

          <motion.h2
            className="mt-4 font-display text-[clamp(2rem,8vw,4.5rem)] font-black uppercase leading-[0.92] tracking-tighter"
            style={{
              background: phase === "lock" ? GOLD : FOIL,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            animate={
              phase === "lock" && !reduce
                ? { scale: [1, 1.02, 1], filter: ["brightness(1)", "brightness(1.15)", "brightness(1)"] }
                : {}
            }
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {phase === "lock" ? "Squad Locked" : "World Cup 2026"}
          </motion.h2>

          <motion.p
            className="mt-2 font-display text-[clamp(3rem,12vw,7rem)] font-black uppercase leading-none tracking-tighter text-[#00f948]"
            initial={reduce ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            2026
          </motion.p>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/45">
            {phase === "lock"
              ? "Your XI is immutably registered. 847 managers competing for onchain prizes."
              : "Predict the bracket. Build your squad. Every move verified on Movement."}
          </p>

          <motion.button
            type="button"
            onClick={() => setPhase(phase === "idle" ? "lock" : "idle")}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-[#00f948] py-1.5 pl-6 pr-1.5 text-black shadow-[0_12px_34px_-12px_rgba(0,249,72,0.55)] ring-1 ring-inset ring-white/25"
            whileTap={reduce ? undefined : { scale: 0.98 }}
          >
            <span className="font-display text-sm font-extrabold uppercase tracking-[0.04em]">
              {phase === "lock" ? "View squad" : "Simulate lock moment"}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </motion.button>

          {/* Lower third stat bug */}
          <motion.div
            className="absolute bottom-8 left-4 right-4 sm:left-8 sm:right-auto sm:max-w-sm"
            initial={reduce ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-stretch overflow-hidden rounded-sm border border-white/10 bg-black/60 backdrop-blur-sm">
              <div className="w-1 shrink-0 bg-[#00f948]" />
              <div className="flex flex-1 items-center justify-between gap-4 px-4 py-3 font-mono text-[11px]">
                <span className="uppercase tracking-wider text-white/50">Prize pool</span>
                <span className="tabular-nums text-white">$48,250 USDCx</span>
                <span className="hidden text-white/30 sm:inline">·</span>
                <span className="hidden uppercase tracking-wider text-white/50 sm:inline">Rounds</span>
                <span className="hidden tabular-nums text-white sm:inline">7</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Metacade + WC broadcast"
          title="Ceremonial lock sequence"
          items={[
            {
              label: "scan lines",
              detail:
                "repeating-linear-gradient drifts vertically 14s linear infinite. opacity 0.035 max. Purpose: broadcast signal, not cyberpunk noise.",
            },
            {
              label: "headline foil → gold",
              detail:
                "On lock: gradient swaps white-silver FOIL to trophy GOLD over 400ms. Optional scale 1→1.02→1 + brightness pulse 800ms. This is THE moment — allowed to be cinematic.",
            },
            {
              label: "2026 year",
              detail:
                "Enters staggered +120ms after title. opacity 0 + scale 0.95 → 1. StaggerChildren 60ms family (already in WC promo).",
            },
            {
              label: "lower third",
              detail:
                "Slides from x:-20, 500ms ease-out, delay 350ms. Mimics TV stat bug appearing after main title. Green accent bar 4px left edge only.",
            },
            {
              label: "CTA arrow",
              detail:
                "group-hover: arrow translateX 2px, 200ms. Press scale 0.98. No glow pulse on button.",
            },
            {
              label: "when to use",
              detail:
                "ONLY: squad lock, bracket submit, payout claim, share poster. Never on homepage hero by default — earns meaning through rarity.",
            },
          ]}
        />
      </div>

      <style jsx global>{`
        @keyframes designLabScan {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(8px);
          }
        }
      `}</style>
    </section>
  );
}
