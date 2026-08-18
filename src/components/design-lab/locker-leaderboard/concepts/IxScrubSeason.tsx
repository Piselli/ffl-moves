"use client";

import { useMemo, useRef, useState } from "react";
import {
  LayoutGroup,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import {
  LAB_LEADERBOARD,
  LAB_PREV_LEADERBOARD,
  type LabLeaderboardRow,
} from "../mockData";
import { cn } from "@/lib/utils";
import { CounterUp } from "./vibeKit";
import { ConceptChrome, GhostBtn, useRtSurfaceStyle } from "./rtKit";

type Frame = {
  gw: number;
  rows: LabLeaderboardRow[];
};

function buildFrames(): Frame[] {
  const base = LAB_LEADERBOARD.rows;
  const prev = LAB_PREV_LEADERBOARD.rows;
  const sort = (rows: LabLeaderboardRow[]) =>
    [...rows].sort((a, b) => a.rank - b.rank || b.finalPoints - a.finalPoints);

  const midA = sort(
    base.map((r, i) => {
      const p = prev[i] ?? r;
      return {
        ...r,
        rank: Math.max(1, Math.round((r.rank + p.rank) / 2)),
        finalPoints: Math.round((r.finalPoints + p.finalPoints) / 2),
        gwDelta: p.rank - r.rank,
      };
    }),
  );
  const midB = sort(
    base.map((r, i) => {
      const shift = ((i * 3) % 5) - 2;
      return {
        ...r,
        rank: Math.max(1, r.rank + shift),
        finalPoints: Math.max(8, r.finalPoints - shift * 2),
        gwDelta: -shift,
      };
    }),
  );

  const g0 = LAB_PREV_LEADERBOARD.gameweek - 1;
  return [
    { gw: g0, rows: midB },
    { gw: LAB_PREV_LEADERBOARD.gameweek, rows: sort(prev) },
    { gw: LAB_LEADERBOARD.gameweek - 1, rows: midA },
    { gw: LAB_LEADERBOARD.gameweek, rows: sort(base) },
  ];
}

/**
 * 3 · Scrub the season
 * Physical GW dial. Drag → ranks reorder in space with spring layout.
 */
export function IxScrubSeason() {
  const style = useRtSurfaceStyle();
  const frames = useMemo(() => buildFrames(), []);
  const [index, setIndex] = useState(frames.length - 1);
  const [trail, setTrail] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  const glow = useMotionValue(0);
  const wash = useTransform(
    glow,
    [0, 1],
    [
      "radial-gradient(ellipse 50% 40% at 50% 20%, rgba(255,255,255,0.04), transparent 60%)",
      "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(255,255,255,0.16), transparent 55%)",
    ],
  );

  const frame = frames[index] ?? frames[frames.length - 1];
  const you = frame.rows.find((r) => r.isYou);

  const goTo = (i: number, velocity = 0) => {
    const clamped = Math.max(0, Math.min(frames.length - 1, i));
    setIndex(clamped);
    indexRef.current = clamped;
    const burst = Math.min(1, Math.abs(velocity) / 1200 + 0.35);
    glow.set(burst);
    animate(glow, 0, { duration: 0.9, ease: "easeOut" });
    setTrail(Math.abs(velocity) > 500);
    window.setTimeout(() => setTrail(false), 800);
  };

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#070708] text-white"
      style={style}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: wash }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 56px",
        }}
      />

      <ResultsPlaceNav />
      <ConceptChrome
        title="3 · Scrub the season"
        hook="Drag the dial — ranks fly to new slots. Hard scrub = comet trail on you."
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-44 pt-36 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
              Timeline
            </p>
            <p className="font-display text-4xl font-black tabular-nums">
              GW {frame.gw}
            </p>
          </div>
          {you ? (
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                You
              </p>
              <p className="font-display text-2xl font-black tabular-nums">
                #{you.rank}{" "}
                <span className="text-white/50">
                  <CounterUp value={you.finalPoints} />
                </span>
              </p>
            </div>
          ) : null}
        </div>

        <LayoutGroup>
          <div
            className="relative"
            style={{ height: Math.max(frame.rows.length, 1) * 52 }}
          >
            {frame.rows.map((row, visualIndex) => (
              <motion.div
                key={row.owner}
                layout
                layoutId={`scrub-${row.owner}`}
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: trail ? 16 : 28,
                  mass: trail ? 0.65 : 1,
                }}
                className={cn(
                  "absolute inset-x-0 flex items-center gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-md",
                  row.isYou
                    ? "z-10 border-white/40 bg-white/15 shadow-[0_0_32px_rgba(255,255,255,0.12)]"
                    : "border-white/10 bg-black/50",
                )}
                style={{ top: visualIndex * 52 }}
              >
                <span className="w-10 font-display text-lg font-black tabular-nums text-white/45">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-sm font-black uppercase">
                  {row.nickname}
                </span>
                {row.gwDelta != null && row.gwDelta !== 0 ? (
                  <span
                    className={cn(
                      "text-[11px] font-bold tabular-nums",
                      row.gwDelta > 0 ? "text-white/80" : "text-white/35",
                    )}
                  >
                    {row.gwDelta > 0 ? "↑" : "↓"}
                    {Math.abs(row.gwDelta)}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/20">—</span>
                )}
                <span className="font-display text-base font-black tabular-nums">
                  {row.finalPoints}
                </span>
              </motion.div>
            ))}
          </div>
        </LayoutGroup>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-28 sm:px-6">
        <div className="mx-auto max-w-lg rounded-2xl border border-white/15 bg-black/85 p-4 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <p className="mb-3 text-center font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Scrub dial · drag horizontally
          </p>
          <div
            className="relative mx-auto flex h-24 w-full max-w-sm cursor-grab items-center justify-center active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              let lastX = e.clientX;
              let acc = 0;
              let live = indexRef.current;

              const move = (ev: PointerEvent) => {
                const dx = ev.clientX - lastX;
                lastX = ev.clientX;
                acc += dx;
                while (acc > 40) {
                  acc -= 40;
                  live = Math.min(frames.length - 1, live + 1);
                  goTo(live, Math.abs(dx) * 55);
                }
                while (acc < -40) {
                  acc += 40;
                  live = Math.max(0, live - 1);
                  goTo(live, Math.abs(dx) * 55);
                }
                glow.set(Math.min(1, Math.abs(dx) / 30));
              };
              const up = (ev: PointerEvent) => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                try {
                  e.currentTarget.releasePointerCapture(ev.pointerId);
                } catch {
                  /* ignore */
                }
                animate(glow, 0, { duration: 0.7 });
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
          >
            <div className="absolute inset-x-0 h-px bg-white/15" />
            {frames.map((f, i) => (
              <button
                key={`${f.gw}-${i}`}
                type="button"
                onClick={() => goTo(i, 220)}
                className={cn(
                  "relative z-10 mx-2 flex h-14 w-14 flex-col items-center justify-center rounded-full border transition",
                  i === index
                    ? "scale-110 border-white bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.25)]"
                    : "border-white/20 bg-black/60 text-white/60 hover:border-white/40",
                )}
              >
                <span className="text-[8px] font-bold uppercase tracking-[0.12em]">
                  GW
                </span>
                <span className="font-display text-lg font-black tabular-nums">
                  {f.gw}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <GhostBtn onClick={() => goTo(Math.max(0, index - 1), 450)}>
              ← Prev
            </GhostBtn>
            <GhostBtn
              onClick={() => goTo(Math.min(frames.length - 1, index + 1), 450)}
            >
              Next →
            </GhostBtn>
            <GhostBtn
              onClick={() => {
                setTrail(true);
                glow.set(1);
                animate(glow, 0, { duration: 1 });
                window.setTimeout(() => setTrail(false), 900);
              }}
            >
              Pulse you
            </GhostBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
