"use client";

import { motion, useReducedMotion } from "framer-motion";

const LINE = {
  bg: "#0c0b0a",
  ink: "#f5f3ef",
  muted: "rgba(245,243,239,0.4)",
  accent: "#00f948",
  warm: "#1a1816",
};

const NODES = [
  { id: "deadline", label: "Deadline", sub: "Fri 18:30", y: "8%" },
  { id: "lock", label: "Squad locked", sub: "11 players", y: "28%" },
  { id: "live", label: "Live", sub: "GW 24 · 6/10", y: "52%", live: true },
  { id: "rank", label: "Your rank", sub: "#4 · 2410 pts", y: "72%" },
  { id: "payout", label: "Payout", sub: "Top 10 · USDCx", y: "92%" },
];

function ScreenLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: LINE.accent }}>
        {n}
      </span>
      <span className="text-xs uppercase tracking-[0.15em]" style={{ color: LINE.muted }}>
        {title}
      </span>
    </div>
  );
}

function TimelineScreen({ children, highlight }: { children: React.ReactNode; highlight?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative aspect-[3/4] overflow-hidden border border-white/[0.08]" style={{ backgroundColor: LINE.bg }}>
      <div className="absolute bottom-[6%] left-1/2 top-[6%] w-px -translate-x-1/2" style={{ backgroundColor: `${LINE.accent}33` }} />
      <motion.div
        className="absolute bottom-[6%] left-1/2 top-[6%] w-px -translate-x-1/2 origin-top"
        style={{ backgroundColor: LINE.accent }}
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: highlight ? 0.55 : 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
      />
      {NODES.map((node) => (
        <div
          key={node.id}
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
          style={{ top: node.y }}
        >
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${node.live ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: highlight === node.id || node.live ? LINE.accent : `${LINE.accent}55`,
              boxShadow: node.live ? `0 0 12px ${LINE.accent}` : undefined,
            }}
          />
        </div>
      ))}
      <div className="relative z-10 h-full p-4 pl-6">{children}</div>
    </div>
  );
}

/** THE LINE — time as whole-site navigation */
export function TheLinePreview() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-sm border border-white/10" style={{ backgroundColor: LINE.bg }}>
      <div className="border-b border-white/[0.08] px-4 py-4 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: LINE.accent }}>
          Concept 02 · The Line
        </p>
        <h3 className="mt-1 text-lg font-semibold" style={{ color: LINE.ink }}>
          Kickoff → FT — time is the UI
        </h3>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: LINE.muted }}>
          Одна vertical green line через весь сайт. Deadline, live, payout — nodes на timeline.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-3">
        <div>
          <ScreenLabel n="01" title="Entry / Home" />
          <TimelineScreen highlight="deadline">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: LINE.muted }}>
              FORM8
            </p>
            <motion.h2
              className="mt-8 max-w-[85%] text-3xl font-black uppercase leading-[0.95] tracking-tight"
              style={{ color: LINE.ink }}
              initial={reduce ? false : { opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              Pick before
              <br />
              <span style={{ color: LINE.accent }}>the line</span>
              <br />
              moves
            </motion.h2>
            <p className="mt-6 font-mono text-4xl font-medium tabular-nums" style={{ color: LINE.ink }}>
              847
            </p>
            <p className="font-mono text-[10px] uppercase" style={{ color: LINE.muted }}>
              entries · $48,250 pool
            </p>
          </TimelineScreen>
        </div>

        <div>
          <ScreenLabel n="02" title="Live squad" />
          <TimelineScreen highlight="live">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: LINE.accent }}>
              ● Live
            </p>
            <ul className="mt-6 space-y-3 font-mono text-[11px]">
              {[
                ["Salah", "+14"],
                ["Haaland", "+12"],
                ["Palmer", "+9"],
              ].map(([name, pts]) => (
                <li key={name} className="flex justify-between border-b pb-2" style={{ borderColor: "rgba(255,255,255,0.06)", color: LINE.ink }}>
                  <span>{name}</span>
                  <span style={{ color: LINE.accent }}>{pts}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 font-mono text-3xl tabular-nums" style={{ color: LINE.ink }}>
              2410
            </p>
            <p className="font-mono text-[10px]" style={{ color: LINE.muted }}>
              your pts · rank 4
            </p>
          </TimelineScreen>
        </div>

        <div>
          <ScreenLabel n="03" title="Leaderboard" />
          <TimelineScreen highlight="payout">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: LINE.muted }}>
              Top 10
            </p>
            {[
              ["1", "2847"],
              ["2", "2791"],
              ["3", "2655"],
            ].map(([r, pts]) => (
              <div key={r} className="mt-4 flex items-baseline gap-3">
                <span className="font-mono text-xs" style={{ color: LINE.muted }}>
                  {r}
                </span>
                <span className="font-mono text-2xl tabular-nums font-medium" style={{ color: LINE.ink }}>
                  {pts}
                </span>
              </div>
            ))}
            <div className="mt-8 border-l-2 pl-3" style={{ borderColor: LINE.accent }}>
              <p className="font-mono text-[10px] uppercase" style={{ color: LINE.accent }}>
                Payout window
              </p>
              <p className="mt-1 text-sm" style={{ color: LINE.muted }}>
                Claim USDCx on Movement
              </p>
            </div>
          </TimelineScreen>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/design-preview/concept-the-line.png" alt="The Line concept" className="mx-4 mb-6 w-[calc(100%-2rem)] border border-white/[0.08] sm:mx-6 sm:w-[calc(100%-3rem)]" />
    </section>
  );
}
