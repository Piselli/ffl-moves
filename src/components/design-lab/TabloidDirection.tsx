"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

/** UK tabloid front page — chaos as identity, not dashboard. */
export function TabloidDirection() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-sm border border-red-900/40 bg-[#f2f0eb] text-black">
      <div className="border-b border-black/10 bg-[#f2f0eb] px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">
          Direction B · Tabloid Front Page
        </p>
        <h3 className="mt-1 text-lg font-bold text-black">Matchday Newspaper</h3>
        <p className="mt-1 max-w-2xl text-sm text-black/55">
          Each GW = tomorrow&apos;s front page. Screaming headline, column stats, no cards no badges no XP.
        </p>
      </div>

      <motion.article
        className="mx-auto max-w-2xl bg-[#faf9f6] p-4 shadow-[4px_4px_0_#000] sm:p-8"
        initial={reduce ? false : { rotate: -0.5 }}
        whileHover={reduce ? undefined : { rotate: 0 }}
      >
        {/* Masthead */}
        <div className="border-b-4 border-black pb-2">
          <p className="text-center font-serif text-[10px] uppercase tracking-[0.35em] text-black/50">
            The FORM8 · Onchain Edition
          </p>
          <h2 className="mt-1 text-center font-serif text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
            FORM8
          </h2>
          <p className="mt-1 text-center text-xs text-black/45">GW 24 · Friday 18 March 2026 · 50p</p>
        </div>

        {/* Screaming headline */}
        <motion.h3
          className="mt-6 font-serif text-[clamp(1.75rem,6vw,3.25rem)] font-black uppercase leading-[0.95] text-[#c41e3a]"
          initial={reduce ? false : { scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          Salah Doubtful
          <span className="block text-black">Captain Crisis Hits Top 10</span>
        </motion.h3>

        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-black/15 pt-6 sm:grid-cols-[1fr_120px]">
          <div className="columns-1 gap-8 sm:columns-2">
            <p className="text-sm leading-relaxed text-black/80 first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-black first-letter:leading-none">
              Managers scrambling before the 18:30 deadline as Liverpool&apos;s Egyptian king faces a late fitness test.
              Onchain entries closed at 847 with $48,250 in the pool. Movement Network confirms all squads immutably locked
              at cutoff.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-black/65">
              Haaland remains the differential pick. Palmer surges after midweek display. Full analysis inside.
            </p>
          </div>
          <aside className="border-l-0 border-black/15 sm:border-l sm:pl-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Live table</p>
            <ul className="mt-2 space-y-2 font-serif text-sm font-bold">
              {[
                ["1", "cryptokop", "2847"],
                ["2", "gw_hunter", "2791"],
                ["3", "movefan", "2655"],
              ].map(([rank, name, pts]) => (
                <li key={name} className="flex justify-between border-b border-black/10 pb-1">
                  <span>{rank}. {name}</span>
                  <span className="tabular-nums">{pts}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-[#c41e3a]">Enter GW 25 →</p>
          </aside>
        </div>

        <div className="mt-8 flex items-center justify-between border-t-2 border-black pt-3 text-[10px] uppercase tracking-wider text-black/40">
          <span>Verified on Movement</span>
          <span>Not affiliated with FPL</span>
        </div>
      </motion.article>

      <div className="bg-[#f2f0eb] px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Print / Tabloid culture"
          title="Newspaper physics"
          items={[
            { label: "paper tilt", detail: "Whole page sits at rotate(-0.5deg), straightens on hover. Feels physical, pinned to a wall." },
            { label: "headline enter", detail: "scale 0.98→1, 400ms. Like ink settling — not bounce." },
            { label: "drop cap", detail: "CSS first-letter float — editorial native, zero components." },
            { label: "why unique", detail: "No crypto app looks like a newspaper. Sports fans instantly read the hierarchy." },
          ]}
        />
      </div>
    </section>
  );
}
