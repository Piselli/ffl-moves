"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const SQUAD = [
  { pos: "GK", name: "Raya", club: "ARS" },
  { pos: "DEF", name: "Saliba", club: "ARS" },
  { pos: "DEF", name: "Gabriel", club: "ARS" },
  { pos: "MID", name: "Ødegaard", club: "ARS" },
  { pos: "FWD", name: "Haaland", club: "MCI" },
];

/** Movement chain as border crossing — passport / visa stamp metaphor. */
export function PassportDirection() {
  const reduce = useReducedMotion();
  const [stamped, setStamped] = useState(false);

  return (
    <section className="overflow-hidden rounded-sm border border-neutral-300/20 bg-[#1a1814]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Direction D · Movement Passport
        </p>
        <h3 className="mt-1 text-lg font-medium text-white/90">Onchain Visa</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Register squad = entry stamp. Movement Network as border authority. Ownable web3 metaphor, not wallet UI.
        </p>
      </div>

      <div className="flex justify-center bg-[#252219] p-6 sm:p-12">
        <div
          className="relative w-full max-w-md overflow-hidden bg-[#e8e4d9] p-6 text-neutral-900 shadow-2xl sm:p-8"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)
            `,
          }}
        >
          <div className="flex items-start justify-between border-b border-neutral-400/50 pb-4">
            <div>
              <p className="font-serif text-[10px] uppercase tracking-[0.25em] text-neutral-500">Movement Network</p>
              <p className="mt-1 font-serif text-xl font-bold tracking-tight">Squad Entry Permit</p>
            </div>
            <div className="text-right font-mono text-[9px] text-neutral-500">
              <p>GW 24</p>
              <p>MM-2026-847</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-wider text-neutral-500">Registered players</p>
          <ul className="mt-2 space-y-1.5 font-mono text-xs">
            {SQUAD.map((p) => (
              <li key={p.name} className="flex justify-between border-b border-neutral-300/60 pb-1">
                <span>
                  {p.pos} · {p.name}
                </span>
                <span className="text-neutral-400">{p.club}</span>
              </li>
            ))}
            <li className="pt-1 text-neutral-400">+ 6 more…</li>
          </ul>

          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">Holder</p>
              <p className="font-serif text-sm font-semibold">0x8f2a…c41b</p>
            </div>
            <button
              type="button"
              onClick={() => setStamped(true)}
              disabled={stamped}
              className="rounded-sm border border-neutral-600 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 disabled:opacity-50"
            >
              {stamped ? "Stamped" : "Apply visa"}
            </button>
          </div>

          {/* Stamp overlay */}
          <motion.div
            className="pointer-events-none absolute bottom-16 right-8 flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#00f948]/70 font-mono text-[9px] font-bold uppercase leading-tight tracking-wider text-[#00f948]/90"
            initial={{ opacity: 0, scale: 1.4, rotate: -24 }}
            animate={
              stamped
                ? { opacity: 0.85, scale: 1, rotate: -18 }
                : { opacity: 0, scale: 1.4, rotate: -24 }
            }
            transition={
              stamped
                ? { type: "spring", duration: 0.45, bounce: 0.35 }
                : { duration: 0.2 }
            }
            style={{
              boxShadow: "inset 0 0 0 2px rgba(0,249,72,0.2)",
            }}
          >
            <span className="text-center">
              Movement
              <br />
              Verified
              <br />
              GW24
            </span>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Document / onchain proof"
          title="Visa stamp spring"
          items={[
            { label: "stamp land", detail: "scale 1.4→1, rotate -24→-18, spring bounce 0.35. Feels like physical rubber stamp hitting paper." },
            { label: "opacity", detail: "Stamp at 85% opacity — ink not perfectly uniform." },
            { label: "paper", detail: "Ruled lines via repeating-linear-gradient. No texture image needed." },
            { label: "why unique", detail: "Only MoveMatch can own 'Movement visa'. Chain-native story, not generic web3 purple." },
          ]}
        />
      </div>
    </section>
  );
}
