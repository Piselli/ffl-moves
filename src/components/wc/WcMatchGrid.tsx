"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * WC 2026 Group Stage opening fixtures — hardcoded promo display.
 * Replace with live data from /api/wc-fixtures once the fixture file is populated.
 */
const MATCHES = [
  { home: "mx", homeCode: "MEX", away: "uy", awayCode: "URY", date: "Jun 11", group: "A" },
  { home: "us", homeCode: "USA", away: "de", awayCode: "GER", date: "Jun 12", group: "B" },
  { home: "ca", homeCode: "CAN", away: "cl", awayCode: "CHI", date: "Jun 13", group: "C" },
  { home: "fr", homeCode: "FRA", away: "ar", awayCode: "ARG", date: "Jun 14", group: "D" },
  { home: "br", homeCode: "BRA", away: "es", awayCode: "ESP", date: "Jun 15", group: "E" },
  { home: "gb-eng", homeCode: "ENG", away: "pt", awayCode: "POR", date: "Jun 16", group: "F" },
] as const;

function MatchCard({
  match,
  delay,
}: {
  match: (typeof MATCHES)[number];
  delay: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="flex flex-col overflow-hidden border border-white/[0.08] bg-[#0c0e11]"
    >
      {/* Header band — group label + date */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#00f948]/[0.05] px-3 py-[5px]">
        <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#00f948]/60">
          Group {match.group}
        </span>
        <span className="font-mono text-[8.5px] tracking-[0.08em] text-white/25">
          {match.date}
        </span>
      </div>

      {/* Flags + team codes */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-[5px]">
          <span
            className="block h-[26px] w-9 rounded-[2px] bg-cover bg-center ring-1 ring-white/[0.12] sm:h-[30px] sm:w-10"
            style={{ backgroundImage: `url(/flags/4x3/${match.home}.svg)` }}
            aria-hidden
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">
            {match.homeCode}
          </span>
        </div>

        {/* VS divider */}
        <span className="font-mono text-[11px] font-bold text-white/15">vs</span>

        {/* Away */}
        <div className="flex flex-col items-center gap-[5px]">
          <span
            className="block h-[26px] w-9 rounded-[2px] bg-cover bg-center ring-1 ring-white/[0.12] sm:h-[30px] sm:w-10"
            style={{ backgroundImage: `url(/flags/4x3/${match.away}.svg)` }}
            aria-hidden
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">
            {match.awayCode}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function WcMatchGrid() {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col gap-3">
      {/* Section label */}
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
        className="flex items-center gap-2"
      >
        <span className="h-px flex-1 bg-white/[0.07]" aria-hidden />
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">
          Group Stage · Jun 11–26
        </span>
        <span className="h-px flex-1 bg-white/[0.07]" aria-hidden />
      </motion.div>

      {/* 2 × 3 Panini sticker grid */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
        {MATCHES.map((match, i) => (
          <div key={i} className="bg-[#050608]">
            <MatchCard match={match} delay={0.22 + i * 0.05} />
          </div>
        ))}
      </div>
    </div>
  );
}
