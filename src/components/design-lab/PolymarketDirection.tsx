"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

const EVENTS = [
  {
    id: "wc-final",
    title: "World Cup Final",
    subtitle: "USA · México · Canada 2026",
    prob: 34,
    trend: +2,
    img: "stadium night",
    hot: true,
  },
  {
    id: "gw24-cap",
    title: "GW 24 Captain Pick",
    subtitle: "Salah vs Haaland",
    prob: 61,
    trend: -4,
    img: "pitch aerial",
    hot: false,
  },
  {
    id: "bracket-qf",
    title: "Bracket: QF slot 3",
    subtitle: "Brazil to reach semis",
    prob: 48,
    trend: +7,
    img: "crowd",
    hot: false,
  },
  {
    id: "apl-top10",
    title: "Top 10 finish",
    subtitle: "Your season rank",
    prob: 72,
    trend: +1,
    img: "trophy",
    hot: false,
  },
];

/** Polymarket — event cards as navigation, probability as headline. */
export function PolymarketDirection() {
  const reduce = useReducedMotion();
  const [probs, setProbs] = useState(() => EVENTS.map((e) => e.prob));

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setProbs((prev) =>
        prev.map((p, i) => {
          const delta = EVENTS[i].trend > 0 ? 1 : -1;
          return Math.max(5, Math.min(95, p + delta * (Math.random() > 0.5 ? 1 : 0)));
        }),
      );
    }, 2800);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <section className="overflow-hidden rounded-sm border border-white/[0.08] bg-[#111113]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Direction 03 · Polymarket
        </p>
        <h3 className="mt-1 text-lg font-medium text-white/90">Event Feed</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Scroll events like news. Big probability % = the headline. Crypto invisible until you act.
        </p>
      </div>

      {/* Category rail */}
      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-3 sm:px-6 [scrollbar-width:none]">
        {["Featured", "World Cup", "APL", "Bracket", "Your picks"].map((cat, i) => (
          <button
            key={cat}
            type="button"
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              i === 0
                ? "bg-white text-black"
                : "bg-white/[0.06] text-white/55 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto p-4 sm:p-6 [scrollbar-width:none]">
        {EVENTS.map((event, i) => (
          <motion.article
            key={event.id}
            className={`relative w-[min(280px,78vw)] shrink-0 overflow-hidden rounded-xl border bg-[#1a1a1e] ${
              event.hot ? "border-white/20" : "border-white/[0.08]"
            }`}
            whileHover={reduce ? undefined : { y: -2 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Thumbnail placeholder */}
            <div className="relative h-32 bg-gradient-to-br from-neutral-800 to-neutral-900">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
              {event.hot && (
                <span className="absolute left-3 top-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-sm">
                  Live
                </span>
              )}
            </div>

            <div className="p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">{event.subtitle}</p>
              <h4 className="mt-1 text-base font-semibold leading-snug text-white">{event.title}</h4>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <motion.p
                    key={probs[i]}
                    initial={reduce ? false : { opacity: 0.5, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="text-4xl font-semibold tabular-nums tracking-tight text-white"
                  >
                    {probs[i]}%
                  </motion.p>
                  <p className="mt-0.5 text-xs text-white/40">implied outcome</p>
                </div>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    event.trend > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {event.trend > 0 ? "+" : ""}
                  {event.trend}%
                </span>
              </div>

              {/* Outcome bar */}
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-white/70"
                  animate={{ width: `${probs[i]}%` }}
                  transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
                />
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-white/[0.08] py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.14] active:scale-[0.98]"
              >
                Enter prediction
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="border-t border-white/[0.06] p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/design-lab/design-lab-polymarket-hero.png"
          alt="Polymarket direction concept"
          className="w-full rounded-sm border border-white/[0.06]"
        />
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Polymarket + Avark"
          title="Event card probability motion"
          items={[
            {
              label: "prob counter",
              detail:
                "Every 2.8s % ticks ±1 toward trend direction. Number fades (opacity 0.5) + slides up 4px, settles 350ms ease-out. Like live odds, not slot machine.",
            },
            {
              label: "outcome bar",
              detail:
                "Width animates with same tick, 500ms ease-in-out. Bar and number stay in sync — spatial consistency (Emil).",
            },
            {
              label: "card hover",
              detail: "translateY -2px only. No scale, no shadow bloom. Polymarket cards lift subtly, not pop.",
            },
            {
              label: "enter prediction",
              detail:
                "On click (future): card does NOT flip like casino. Instead — bottom sheet slides up with wallet already abstracted. Invisible web3.",
            },
            {
              label: "category pills",
              detail: "Horizontal scroll, no marquee. Active pill = solid white fill. No gradient pills.",
            },
          ]}
        />
      </div>
    </section>
  );
}
