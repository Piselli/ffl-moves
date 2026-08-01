"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AnimationSpec } from "./AnimationSpec";

/** Rauno / Emil — micro-interaction craft patterns in isolation. */
export function MotionCraftDirection() {
  const reduce = useReducedMotion();
  const [toastOpen, setToastOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const tabs = ["Squad", "Fixtures", "Rank"];

  return (
    <section className="overflow-hidden rounded-sm border border-white/[0.08] bg-[#0c0c0e]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
          Direction 05 · Rauno / Emil
        </p>
        <h3 className="mt-1 text-lg font-medium text-white/90">Motion Craft Kit</h3>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Invisible details that compound. Each pattern has one job — try them below.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {/* Popover origin */}
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Popover origin</p>
          <p className="mt-2 text-xs text-white/45">Scales from trigger, not center</p>
          <div className="relative mt-6 flex justify-center">
            <button
              type="button"
              className="rounded-sm border border-white/15 px-4 py-2 text-xs text-white/70"
            >
              Trigger
            </button>
            <motion.div
              className="absolute top-full mt-2 w-40 origin-top rounded-sm border border-white/10 bg-[#161618] p-3 text-xs text-white/70 shadow-xl"
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              style={{ transformOrigin: "top center" }}
            >
              Points breakdown
            </motion.div>
          </div>
        </div>

        {/* Tab clip-path color */}
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Tab color wipe</p>
          <p className="mt-2 text-xs text-white/45">clip-path inset transition (Emil)</p>
          <div className="relative mt-6 flex rounded-sm border border-white/[0.08] p-0.5">
            {tabs.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className="relative flex-1 py-2 text-xs font-medium text-white/50"
              >
                {tab === i && (
                  <motion.div
                    layoutId="craft-tab-bg"
                    className="absolute inset-0 rounded-[3px] bg-white"
                    transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                  />
                )}
                <span className={`relative z-10 ${tab === i ? "text-black" : ""}`}>{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toast spatial consistency */}
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Toast enter/exit</p>
          <p className="mt-2 text-xs text-white/45">Same direction in and out</p>
          <button
            type="button"
            onClick={() => {
              setToastOpen(true);
              setTimeout(() => setToastOpen(false), 2400);
            }}
            className="mt-6 w-full rounded-sm bg-white/[0.08] py-2 text-xs text-white active:scale-[0.97]"
          >
            Show toast
          </button>
          <AnimatePresence>
            {toastOpen && (
              <motion.div
                className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-white/10 bg-[#1a1a1e] px-4 py-3 text-sm text-white shadow-2xl"
                initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                Squad saved · verified onchain
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Button press + blur transition */}
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-5 sm:col-span-2 lg:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Press + blur state</p>
          <p className="mt-2 text-xs text-white/45">blur(2px) masks imperfect crossfade</p>
          <PressBlurDemo reduce={reduce} />
        </div>

        {/* Stagger list */}
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-5 sm:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Stagger reveal</p>
          <p className="mt-2 text-xs text-white/45">50ms between rows, never block interaction</p>
          <ul className="mt-4 space-y-1">
            {["Salah · 14 pts", "Haaland · 12 pts", "Palmer · 9 pts", "Saka · 8 pts"].map((row, i) => (
              <motion.li
                key={row}
                className="rounded-sm border border-white/[0.04] px-3 py-2 font-mono text-xs tabular-nums text-white/70"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {row}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <AnimationSpec
          reference="Rauno + Emil + Sonner"
          title="Craft rules for MoveMatch"
          items={[
            {
              label: "never scale(0)",
              detail: "Toasts/modals enter from scale 0.97 + opacity 0. Nothing appears from a point.",
            },
            {
              label: "ease-out for enter",
              detail: "UI elements entering use [0.23, 1, 0.32, 1]. Never ease-in on dropdowns/toasts.",
            },
            {
              label: "under 300ms UI",
              detail: "Tooltips 125ms, toasts 220ms, tabs 350ms spring. Keyboard actions: 0ms.",
            },
            {
              label: "layoutId tabs",
              detail: "Shared layout animation for active pill — smoother than animating background-color.",
            },
            {
              label: "blur on state swap",
              detail: "When label changes on button press, content blurs 2px for 200ms during swap.",
            },
          ]}
        />
      </div>
    </section>
  );
}

function PressBlurDemo({ reduce }: { reduce: boolean | null }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = () => {
    if (pending || done) return;
    setPending(true);
    setTimeout(() => {
      setPending(false);
      setDone(true);
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="mt-6 flex w-full items-center justify-center rounded-sm bg-[#00f948] py-3 text-sm font-semibold text-black transition-transform duration-150 active:scale-[0.97] disabled:opacity-80"
    >
      <motion.span
        animate={{
          filter: pending && !reduce ? "blur(2px)" : "blur(0px)",
          opacity: pending ? 0.7 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {done ? "Registered ✓" : pending ? "Signing…" : "Register squad"}
      </motion.span>
    </button>
  );
}
