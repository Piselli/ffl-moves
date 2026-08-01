"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

function DotChar({ char, lit }: { char: string; lit: boolean }) {
  if (char === " ") return <span className="inline-block w-[0.55em]" />;
  return (
    <span
      className={`inline-block font-mono text-[clamp(10px,2.5vw,14px)] font-bold leading-none tracking-[0.08em] ${
        lit ? "text-amber-400" : "text-amber-950/30"
      }`}
      style={{ textShadow: lit ? "0 0 8px rgba(251,191,36,0.6)" : "none" }}
    >
      {char}
    </span>
  );
}

function DotLine({ text, flicker = false }: { text: string; flicker?: boolean }) {
  const [on, setOn] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!flicker || reduce) return;
    const t = setInterval(() => setOn((v) => !v), 80);
    const stop = setTimeout(() => {
      clearInterval(t);
      setOn(true);
    }, 400);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [flicker, reduce]);

  return (
    <p className="whitespace-pre">
      {text.split("").map((c, i) => (
        <DotChar key={`${text}-${i}`} char={c} lit={on} />
      ))}
    </p>
  );
}

/** Stadium LED dot-matrix scoreboard — retro hardware as UI. */
export function ScoreboardDirection() {
  const reduce = useReducedMotion();
  const [home, setHome] = useState(2847);
  const [away, setAway] = useState(2791);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setHome((h) => h + Math.floor(Math.random() * 3));
    }, 3500);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <section className="overflow-hidden rounded-sm border border-amber-900/30 bg-black">
      <div className="border-b border-amber-900/20 px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-600/60">
          Direction C · LED Scoreboard
        </p>
        <h3 className="mt-1 text-lg font-medium text-amber-100">Stadium Matrix</h3>
        <p className="mt-1 max-w-2xl text-sm text-amber-100/35">
          UI rendered as physical LED hardware. Amber phosphor, flicker on update, no modern app chrome at all.
        </p>
      </div>

      <div className="relative flex min-h-[440px] flex-col items-center justify-center bg-[#050403] p-6 sm:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(251,191,36,0.8) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />

        <div className="w-full max-w-lg rounded-sm border-4 border-neutral-800 bg-[#0a0908] p-6 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)]">
          <DotLine text="GW 24  LIVE" flicker />
          <div className="my-6 border-y border-amber-900/40 py-6">
            <DotLine text="TOP MANAGER" />
            <motion.div key={home} className="mt-3">
              <DotLine text={`${home} PTS`} flicker={!reduce} />
            </motion.div>
            <p className="mt-4 opacity-70">
              <DotLine text="VS" />
            </p>
            <p className="mt-2">
              <DotLine text={`${away} PTS  #2`} />
            </p>
          </div>
          <DotLine text="POOL $48,250" />
          <p className="mt-4">
            <DotLine text="ENTRIES 0847" />
          </p>
        </div>

        <button
          type="button"
          className="mt-8 border-2 border-amber-700/50 bg-amber-950/40 px-8 py-3 font-mono text-xs uppercase tracking-[0.2em] text-amber-400 transition-colors hover:border-amber-500/60 hover:text-amber-300 active:scale-[0.98]"
        >
          Submit squad
        </button>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Physical LED hardware"
          title="Phosphor flicker"
          items={[
            { label: "score update", detail: "On new points: all chars flicker 80ms interval for 400ms then hold. Mimics old stadium board relay click." },
            { label: "glow", detail: "text-shadow 0 0 8px amber on lit chars only. Never on container — light comes from dots." },
            { label: "mesh overlay", detail: "3px dot grid at 4% opacity = LED surface texture." },
            { label: "why unique", detail: "Opposite of glassmorphism and cards. Feels like object in stadium, not website." },
          ]}
        />
      </div>
    </section>
  );
}
