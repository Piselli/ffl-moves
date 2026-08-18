"use client";

import { motion, useReducedMotion } from "framer-motion";

const SLOT = {
  bg: "#121010",
  cream: "#f0ece4",
  muted: "rgba(240,236,228,0.45)",
  accent: "#00f948",
  perforation: "rgba(240,236,228,0.25)",
};

const FORMATION = [
  { name: "Haaland", pos: "FWD", fee: "14.2m", col: 2, row: 0 },
  { name: "Salah", pos: "FWD", fee: "13.1m", col: 0, row: 0 },
  { name: "Saka", pos: "FWD", fee: "10.8m", col: 4, row: 0 },
  { name: "Palmer", pos: "MID", fee: "11.4m", col: 1, row: 1 },
  { name: "Ødegaard", pos: "MID", fee: "9.2m", col: 2, row: 1 },
  { name: "Rice", pos: "MID", fee: "8.8m", col: 3, row: 1 },
  { name: "Saliba", pos: "DEF", fee: "6.1m", col: 0, row: 2 },
  { name: "Gabriel", pos: "DEF", fee: "5.9m", col: 2, row: 2 },
  { name: "Raya", pos: "GK", fee: "5.2m", col: 2, row: 3 },
];

function Perforation({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-2 w-full ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, ${SLOT.perforation} 1px, transparent 1px)`,
        backgroundSize: "6px 6px",
      }}
      aria-hidden
    />
  );
}

function TicketSlot({
  name,
  pos,
  fee,
  highlight,
  delay = 0,
}: {
  name: string;
  pos: string;
  fee: string;
  highlight?: boolean;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative flex flex-col border p-2"
      style={{
        borderColor: highlight ? SLOT.accent : "rgba(240,236,228,0.2)",
        backgroundColor: highlight ? "rgba(0,249,72,0.06)" : "rgba(240,236,228,0.03)",
      }}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: highlight ? SLOT.accent : "transparent" }} />
      <Perforation />
      <p className="mt-1 font-mono text-[8px] uppercase tracking-wider" style={{ color: SLOT.muted }}>
        {pos}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-semibold uppercase" style={{ color: SLOT.cream }}>
        {name}
      </p>
      <p className="mt-auto font-mono text-[8px] tabular-nums" style={{ color: SLOT.muted }}>
        {fee}
      </p>
      <Perforation className="mt-1" />
    </motion.div>
  );
}

function ScreenLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: SLOT.accent }}>
        {n}
      </span>
      <span className="text-xs uppercase tracking-[0.15em]" style={{ color: SLOT.muted }}>
        {title}
      </span>
    </div>
  );
}

/** PERFORATED SLOT — tournament ticket sheet identity */
export function PerforatedSlotPreview() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-sm border border-white/10" style={{ backgroundColor: SLOT.bg }}>
      <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: SLOT.accent }}>
          Concept 03 · Perforated Slot
        </p>
        <h3 className="mt-1 text-lg font-semibold" style={{ color: SLOT.cream }}>
          11 slots — tournament ticket
        </h3>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: SLOT.muted }}>
          VIP entry sheet, perforation, green stripe. Leaderboard = stub tear-offs. Весь сайт = ticket module.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-3">
        {/* HOME */}
        <div>
          <ScreenLabel n="01" title="Entry ticket" />
          <div className="aspect-[3/4] border p-4" style={{ borderColor: "rgba(240,236,228,0.15)", backgroundColor: "#0a0908" }}>
            <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest" style={{ color: SLOT.muted }}>
              <span>FORM8</span>
              <span>GW 24</span>
            </div>
            <Perforation className="my-3" />
            <motion.h2
              className="text-2xl font-black uppercase leading-tight tracking-tight"
              style={{ color: SLOT.cream }}
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Official
              <br />
              Entry
              <br />
              Sheet
            </motion.h2>
            <p className="mt-4 font-mono text-[9px] leading-relaxed" style={{ color: SLOT.muted }}>
              Admit one manager · 11 slots · Movement Network verified
            </p>
            <div className="mt-6 space-y-2 font-mono text-[10px]" style={{ color: SLOT.cream }}>
              <p>POOL · $48,250 USDCx</p>
              <p>ENTRIES · 847</p>
              <p>CUTOFF · 18:30 UTC</p>
            </div>
            <div
              className="mt-8 border py-2 text-center font-mono text-[9px] uppercase tracking-[0.15em]"
              style={{ borderColor: SLOT.accent, color: SLOT.accent }}
            >
              Punch ticket →
            </div>
          </div>
        </div>

        {/* SQUAD */}
        <div>
          <ScreenLabel n="02" title="11-slot grid" />
          <div className="aspect-[3/4] border p-3" style={{ borderColor: "rgba(240,236,228,0.15)" }}>
            <p className="mb-2 text-center font-mono text-[8px] uppercase tracking-[0.2em]" style={{ color: SLOT.muted }}>
              Formation 4-3-3
            </p>
            <div className="grid h-[calc(100%-2rem)] grid-cols-5 grid-rows-4 gap-1.5">
              {FORMATION.map((p, i) => (
                <div
                  key={p.name}
                  style={{ gridColumn: p.col + 1, gridRow: p.row + 1 }}
                >
                  <TicketSlot {...p} delay={i * 0.04} highlight={p.name === "Haaland"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LEADERBOARD */}
        <div>
          <ScreenLabel n="03" title="Stub ranks" />
          <div className="aspect-[3/4] space-y-2 border p-3" style={{ borderColor: "rgba(240,236,228,0.15)" }}>
            {[
              ["1", "cryptokop", "2847"],
              ["2", "gw_hunter", "2791"],
              ["3", "movefan", "2655"],
              ["4", "you", "2410"],
            ].map(([rank, name, pts], i) => (
              <motion.div
                key={name}
                className="flex items-stretch gap-0 border"
                style={{ borderColor: "rgba(240,236,228,0.12)" }}
                initial={reduce ? false : { x: -8, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="flex w-8 shrink-0 items-center justify-center font-mono text-xs" style={{ backgroundColor: "rgba(240,236,228,0.06)", color: SLOT.muted }}>
                  {rank}
                </div>
                <Perforation className="!h-auto !w-1 shrink-0 self-stretch" />
                <div className="flex flex-1 items-center justify-between px-2 py-2">
                  <span className="font-mono text-[10px] uppercase" style={{ color: name === "you" ? SLOT.accent : SLOT.cream }}>
                    {name}
                  </span>
                  <span className="font-mono text-sm tabular-nums" style={{ color: SLOT.cream }}>
                    {pts}
                  </span>
                </div>
              </motion.div>
            ))}
            <p className="pt-2 text-center font-mono text-[8px] uppercase tracking-widest" style={{ color: SLOT.muted }}>
              Tear stub to claim →
            </p>
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/design-preview/concept-perforated-slot.png" alt="Perforated Slot concept" className="mx-4 mb-6 w-[calc(100%-2rem)] border border-white/[0.08] sm:mx-6 sm:w-[calc(100%-3rem)]" />
    </section>
  );
}
