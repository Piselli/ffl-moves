"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DuotonePhoto, ISSUE } from "./shared";

const PLAYERS = [
  { name: "Haaland", pos: "FWD", val: "14.2m", top: "12%", left: "50%" },
  { name: "Salah", pos: "FWD", val: "13.1m", top: "12%", left: "28%" },
  { name: "Palmer", pos: "MID", val: "11.4m", top: "38%", left: "62%" },
  { name: "Saka", pos: "MID", val: "10.8m", top: "38%", left: "38%" },
  { name: "Raya", pos: "GK", val: "5.2m", top: "78%", left: "50%" },
];

function ScreenLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: ISSUE.accent }}>
        {n}
      </span>
      <span className="text-xs uppercase tracking-[0.15em]" style={{ color: ISSUE.muted }}>
        {title}
      </span>
    </div>
  );
}

/** DUOTONE ISSUE — whole-site magazine identity */
export function DuotoneIssuePreview() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-sm border border-white/10" style={{ backgroundColor: ISSUE.bg }}>
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: ISSUE.accent }}>
          Concept 01 · Duotone Issue
        </p>
        <h3 className="mt-1 text-lg font-semibold" style={{ color: ISSUE.ink }}>
          Matchday magazine — one ink
        </h3>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: ISSUE.muted }}>
          Stone canvas, duotone green photography, кожен GW = новий cover. Весь сайт = поточний issue.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:grid-cols-1 sm:p-6 lg:grid-cols-3">
        {/* HOME */}
        <div>
          <ScreenLabel n="01" title="Cover / Home" />
          <div className="relative aspect-[3/4] overflow-hidden border border-white/10" style={{ backgroundColor: ISSUE.stone }}>
            <div className="absolute left-4 top-4 z-10 font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: ISSUE.muted }}>
              FORM8 · Issue
            </div>
            <motion.p
              className="absolute left-4 top-12 z-10 font-black uppercase leading-[0.82] tracking-[-0.04em]"
              style={{ color: ISSUE.ink, fontSize: "clamp(2.5rem, 8vw, 3.5rem)" }}
              initial={reduce ? false : { y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              GW
              <br />
              <span style={{ color: ISSUE.accent }}>24</span>
            </motion.p>
            <DuotonePhoto
              alt="Cover player"
              className="absolute inset-0 top-[22%] h-[78%] w-full"
              src="https://picsum.photos/seed/mm-issue-haaland/600/800"
            />
            <p className="absolute bottom-16 left-4 right-4 z-10 text-[11px] leading-snug" style={{ color: ISSUE.muted }}>
              Know the EPL better than everyone. Pick XI. Rank top 10. Claim on Movement.
            </p>
            <div
              className="absolute bottom-4 left-4 right-4 z-10 border py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ borderColor: ISSUE.accent, color: ISSUE.accent }}
            >
              Start competing →
            </div>
          </div>
        </div>

        {/* SQUAD */}
        <div>
          <ScreenLabel n="02" title="Squad spread" />
          <div className="relative aspect-[3/4] border border-white/10 p-4" style={{ backgroundColor: ISSUE.bg }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: ISSUE.muted }}>
              Formation 4-3-3 · Budget 0.0m
            </p>
            <h4 className="mt-2 text-2xl font-black uppercase tracking-tight" style={{ color: ISSUE.ink }}>
              Your XI
            </h4>
            <div className="relative mt-4 h-[55%]">
              {PLAYERS.map((p, i) => (
                <motion.div
                  key={p.name}
                  className="absolute w-[28%] -translate-x-1/2 -translate-y-1/2"
                  style={{ top: p.top, left: p.left }}
                  initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <DuotonePhoto alt={p.name} className="aspect-[3/4] w-full" src={`https://picsum.photos/seed/mm-${p.name}/200/280`} />
                  <p className="mt-1 truncate font-mono text-[8px] uppercase" style={{ color: ISSUE.ink }}>
                    {p.name}
                  </p>
                  <p className="font-mono text-[7px]" style={{ color: ISSUE.muted }}>
                    {p.val}
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-center font-mono text-[9px]" style={{ color: ISSUE.muted }}>
              11/11 · Lock before 18:30
            </div>
          </div>
        </div>

        {/* LEADERBOARD */}
        <div>
          <ScreenLabel n="03" title="Results colophon" />
          <div className="relative aspect-[3/4] flex flex-col border border-white/10 p-4" style={{ backgroundColor: ISSUE.stone }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: ISSUE.accent }}>
              Live table
            </p>
            <h4 className="mt-2 text-3xl font-black tabular-nums" style={{ color: ISSUE.ink }}>
              2847
            </h4>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: ISSUE.muted }}>
              pts · rank 1
            </p>
            <ul className="mt-6 flex-1 space-y-0 font-mono text-[11px]">
              {[
                ["1", "cryptokop", "2847"],
                ["2", "gw_hunter", "2791"],
                ["3", "movefan", "2655"],
                ["4", "you", "2410"],
              ].map(([r, n, pts]) => (
                <li
                  key={n}
                  className="flex justify-between border-t py-2.5"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: n === "you" ? ISSUE.accent : ISSUE.ink }}
                >
                  <span>{r}. {n}</span>
                  <span className="tabular-nums">{pts}</span>
                </li>
              ))}
            </ul>
            <p className="font-mono text-[8px] leading-relaxed" style={{ color: ISSUE.muted }}>
              Issue 24 · Movement verified · $48,250 distributed
            </p>
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/design-preview/concept-duotone-issue.png" alt="Duotone Issue concept" className="mx-4 mb-6 w-[calc(100%-2rem)] border border-white/10 sm:mx-6 sm:w-[calc(100%-3rem)]" />
    </section>
  );
}
