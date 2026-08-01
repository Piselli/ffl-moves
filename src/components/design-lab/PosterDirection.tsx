"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

/** Swiss poster brutalism — type IS the interface. */
export function PosterDirection() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-sm border border-white/10 bg-[#e8e4dc] text-black">
      <div className="border-b border-black/10 px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">
          Direction F · Match Poster
        </p>
        <h3 className="mt-1 text-lg font-bold text-black">Swiss Poster System</h3>
        <p className="mt-1 max-w-2xl text-sm text-black/55">
          One poster per GW. Typography overlaps, bleeds, shouts. International Typographic Style meets football.
        </p>
      </div>

      <div className="relative overflow-hidden p-4 sm:p-8">
        <motion.div
          className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden bg-[#c41e3a] p-6 sm:p-8"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.p
            className="absolute -right-4 top-8 font-black uppercase leading-[0.82] tracking-[-0.04em] text-black/20"
            style={{ fontSize: "clamp(4rem, 18vw, 8rem)" }}
            initial={reduce ? false : { x: 40 }}
            whileInView={{ x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            24
          </motion.p>

          <p className="relative z-10 font-mono text-[10px] uppercase tracking-[0.3em] text-black/60">MoveMatch presents</p>

          <motion.h2
            className="relative z-10 mt-4 font-black uppercase leading-[0.9] tracking-[-0.03em] text-[#e8e4dc]"
            style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)" }}
            initial={reduce ? false : { y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            Game
            <br />
            Week
          </motion.h2>

          <motion.div
            className="relative z-10 mt-8 inline-block bg-black px-4 py-2"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
            style={{ transformOrigin: "left" }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00f948]">Deadline 18:30 UTC</p>
          </motion.div>

          <div className="absolute bottom-6 left-6 right-6 z-10 flex items-end justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-black/50">Pool</p>
              <p className="text-2xl font-black tabular-nums text-black">$48k</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-wider text-black/50">Movement</p>
              <p className="text-sm font-bold uppercase text-black">Onchain</p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black" />
        </motion.div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Swiss International Style / poster culture"
          title="Type collision enter"
          items={[
            { label: "bg number", detail: "Giant '24' slides from x:40, 700ms. Background layer — depth without images." },
            { label: "headline", detail: "GAME/WEEK stacks with negative tracking. Delay 100ms after number starts." },
            { label: "deadline bar", detail: "scaleX 0→1 from left, 400ms. Green text on black bar — only accent." },
            { label: "why unique", detail: "Each GW gets a new poster composition. Shareable, collectible, zero UI chrome." },
          ]}
        />
      </div>
    </section>
  );
}
