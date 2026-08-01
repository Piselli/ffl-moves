"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const FORMATION = [
  { id: "gk", label: "Raya", x: 50, y: 88 },
  { id: "lb", label: "Saliba", x: 18, y: 68 },
  { id: "cb1", label: "Gabriel", x: 38, y: 72 },
  { id: "cb2", label: "White", x: 62, y: 72 },
  { id: "rb", label: "Timber", x: 82, y: 68 },
  { id: "cm1", label: "Ødegaard", x: 35, y: 48 },
  { id: "cm2", label: "Rice", x: 65, y: 48 },
  { id: "lw", label: "Martinelli", x: 18, y: 28 },
  { id: "st", label: "Haaland", x: 50, y: 22 },
  { id: "rw", label: "Saka", x: 82, y: 28 },
];

/** Zora — gallery canvas, content is the product. */
export function GalleryDirection() {
  const reduce = useReducedMotion();
  const [locked, setLocked] = useState(false);

  return (
    <section className="overflow-hidden rounded-sm border border-neutral-200 bg-[#f4f4f2] text-neutral-900">
      <div className="border-b border-neutral-200 px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">
          Direction 02 · Zora
        </p>
        <h3 className="mt-1 text-lg font-medium text-neutral-900">Gallery of Moves</h3>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Near-monochrome. Squad formation = mounted artwork. Green appears once, on the transaction.
        </p>
      </div>

      <div className="grid min-h-[480px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-neutral-200 p-6 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">MoveMatch</p>
          <nav className="mt-8 space-y-1 text-[13px] text-neutral-500">
            {["Squad", "Fixtures", "Leaderboard", "Archive"].map((item) => (
              <div
                key={item}
                className={`py-1.5 ${item === "Squad" ? "font-medium text-neutral-900" : ""}`}
              >
                {item}
              </div>
            ))}
          </nav>
          <div className="mt-10 space-y-4 text-[11px] uppercase tracking-wider text-neutral-400">
            <p>GW 24</p>
            <p className="tabular-nums text-neutral-900">847 managers</p>
            <p className="tabular-nums text-neutral-900">$48,250 pool</p>
          </div>
        </aside>

        <div className="relative flex flex-col p-6 sm:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.02em] text-neutral-900 sm:text-3xl">
                Squad composition
              </h2>
              <p className="mt-1 text-sm text-neutral-500">Formation 4-4-2 · Deadline Fri 18:30</p>
            </div>
            <motion.button
              type="button"
              onClick={() => setLocked(true)}
              disabled={locked}
              className="shrink-0 rounded-full bg-[#00f948] px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-black disabled:opacity-60"
              whileTap={reduce ? undefined : { scale: 0.97 }}
            >
              {locked ? "Locked" : "Register squad"}
            </motion.button>
          </div>

          {/* Pitch as gallery wall */}
          <div className="relative flex-1 min-h-[320px] bg-white">
            <div className="absolute inset-0 border border-neutral-200" />
            {/* Center line */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-neutral-200" />
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200" />

            {FORMATION.map((p, i) => (
              <motion.div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex h-14 w-14 flex-col items-center justify-center border border-neutral-300 bg-[#fafafa] sm:h-16 sm:w-16">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400">{p.id}</span>
                  <span className="mt-0.5 max-w-[56px] truncate text-[10px] font-medium text-neutral-800">
                    {p.label}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Clip-path lock reveal overlay */}
            <motion.div
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-900/90"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{
                clipPath: locked ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
              }}
              transition={
                locked
                  ? { duration: reduce ? 0 : 1.2, ease: [0.77, 0, 0.175, 1] }
                  : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
              }
            >
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Verified</p>
                <p className="mt-2 text-xl font-medium text-white">Squad locked on Movement</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-[#00f948]">tx 0x8f2a…c41b</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-[#f4f4f2] p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/design-lab/design-lab-gallery-hero.png"
          alt="Gallery direction concept"
          className="w-full rounded-sm border border-neutral-200"
        />
      </div>

      <div className="bg-[#f4f4f2] px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Zora + Emil (clip-path)"
          title="Gallery lock ceremony"
          items={[
            {
              label: "player tiles enter",
              detail:
                "Stagger 40ms per tile. opacity 0→1, scale 0.92→1. Purpose: formation feels composed, not dumped on screen.",
            },
            {
              label: "register press",
              detail: "whileTap scale 0.97 only. No hover glow. Green button is the ONLY color on the page until lock.",
            },
            {
              label: "lock overlay",
              detail:
                "clip-path inset(0 100% 0 0) → inset(0 0 0 0) over 1.2s ease-in-out. Left-to-right wipe like a gallery curtain. Emil asymmetric: press slow (1.2s), would release fast (200ms) if undo existed.",
            },
            {
              label: "tx hash reveal",
              detail: "Appears after wipe completes (+200ms delay). Monospace, green only on hash prefix. Blockchain as footnote, not hero.",
            },
          ]}
        />
      </div>
    </section>
  );
}
