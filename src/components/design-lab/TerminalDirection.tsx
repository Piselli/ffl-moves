"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const LEADERBOARD = [
  { rank: 1, name: "cryptokop", pts: 2847, delta: +124 },
  { rank: 2, name: "gw_hunter", pts: 2791, delta: -12 },
  { rank: 3, name: "movefan.apt", pts: 2655, delta: +89 },
  { rank: 4, name: "salah_stan", pts: 2602, delta: 0 },
];

/** HyperX / Hyperliquid — product IS the landing. */
export function TerminalDirection() {
  const reduce = useReducedMotion();
  const [prizePool, setPrizePool] = useState(48250);
  const [entries, setEntries] = useState(1247);
  const [flashRow, setFlashRow] = useState<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    const prize = setInterval(() => {
      setPrizePool((p) => p + Math.floor(Math.random() * 40));
    }, 3200);
    const ent = setInterval(() => {
      setEntries((e) => e + 1);
    }, 5000);
    const flash = setInterval(() => {
      setFlashRow(Math.floor(Math.random() * LEADERBOARD.length));
      setTimeout(() => setFlashRow(null), 600);
    }, 4500);
    return () => {
      clearInterval(prize);
      clearInterval(ent);
      clearInterval(flash);
    };
  }, [reduce]);

  return (
    <section className="overflow-hidden rounded-sm border border-white/[0.08] bg-[#080808]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Direction 01 · HyperX / Hyperliquid
        </p>
        <h3 className="mt-1 text-lg font-medium text-white/90">Live Terminal</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Landing page = embedded product. Monospace data, sharp corners, zero marketing chrome.
        </p>
      </div>

      <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
        {/* Left: headline */}
        <div className="flex flex-col justify-between border-b border-white/[0.06] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#00f948]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00f948] animate-pulse" />
              GW 24 · LIVE ON MOVEMENT
            </div>
            <h2 className="mt-4 font-mono text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">
              Build squad.
              <br />
              Rank top 10.
              <br />
              <span className="text-white/40">Claim onchain.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/40">
              Not a promo site pretending to be a product. What you see below is the real tournament panel.
            </p>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              className="rounded-sm bg-[#00f948] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-black transition-transform duration-150 active:scale-[0.97]"
            >
              Enter GW 24
            </button>
            <button
              type="button"
              className="rounded-sm border border-white/15 px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-white/60 transition-colors hover:border-white/30 hover:text-white/80"
            >
              View rules
            </button>
          </div>
        </div>

        {/* Right: live terminal panel */}
        <div className="bg-[#050505] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2 font-mono text-[10px] uppercase tracking-widest text-white/30">
            <span>Tournament feed</span>
            <span>Block #4,291,847</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Prize pool</p>
              <motion.p
                key={prizePool}
                initial={reduce ? false : { opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="mt-1 font-mono text-xl tabular-nums text-white"
              >
                ${prizePool.toLocaleString()}{" "}
                <span className="text-sm text-white/40">USDCx</span>
              </motion.p>
            </div>
            <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Entries</p>
              <motion.p
                key={entries}
                initial={reduce ? false : { y: -4, opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="mt-1 font-mono text-xl tabular-nums text-white"
              >
                {entries.toLocaleString()}
              </motion.p>
            </div>
          </div>

          <div className="rounded-sm border border-white/[0.06]">
            <div className="grid grid-cols-[32px_1fr_72px_48px] gap-2 border-b border-white/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-white/25">
              <span>#</span>
              <span>Manager</span>
              <span className="text-right">Pts</span>
              <span className="text-right">Δ</span>
            </div>
            {LEADERBOARD.map((row, i) => (
              <motion.div
                key={row.name}
                className="grid grid-cols-[32px_1fr_72px_48px] gap-2 border-b border-white/[0.04] px-3 py-2.5 font-mono text-sm last:border-0"
                animate={{
                  backgroundColor:
                    flashRow === i && !reduce ? "rgba(0,249,72,0.08)" : "rgba(255,255,255,0)",
                }}
                transition={{ duration: 0.35 }}
              >
                <span className="tabular-nums text-white/30">{row.rank}</span>
                <span className="truncate text-white/80">{row.name}</span>
                <span className="text-right tabular-nums text-white">{row.pts}</span>
                <span
                  className={`text-right tabular-nums ${
                    row.delta > 0 ? "text-[#00f948]" : row.delta < 0 ? "text-red-400" : "text-white/20"
                  }`}
                >
                  {row.delta > 0 ? `+${row.delta}` : row.delta === 0 ? "—" : row.delta}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/design-lab/design-lab-terminal-hero.png"
          alt="Terminal direction concept"
          className="w-full rounded-sm border border-white/[0.06]"
        />
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="HyperX"
          title="Terminal live-feed motion"
          items={[
            {
              label: "prize counter",
              detail:
                "Every 3.2s the USDCx value ticks up. Number does a 200ms opacity dip (0.6→1), not scale bounce. Purpose: live tournament feel.",
            },
            {
              label: "entry count",
              detail:
                "New entry: translateY -4px → 0, 200ms ease-out [0.23,1,0.32,1]. Like an order book row appearing.",
            },
            {
              label: "rank flash",
              detail:
                "Random row gets background rgba(0,249,72,0.08) for 600ms when points update. No infinite pulse on cards.",
            },
            {
              label: "CTA press",
              detail: "active:scale(0.97), 150ms. Emil rule: instant tactile feedback, no hover scale on terminal buttons.",
            },
            {
              label: "reduced motion",
              detail: "All intervals off. Static numbers. Flash disabled. Press feedback stays (accessibility-safe).",
            },
          ]}
        />
      </div>
    </section>
  );
}
