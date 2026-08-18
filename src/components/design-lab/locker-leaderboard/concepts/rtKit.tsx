"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LabLeaderboardRow, LabSquadPlayer } from "../mockData";
import { CounterUp, useObsidianSurfaceStyle } from "./vibeKit";

/** Accent unlocked — white flashlight for CTAs; soft live mark optional. */
export const RT_LIVE = "rgba(255,255,255,0.92)";

export function useRtSurfaceStyle(): CSSProperties {
  const base = useObsidianSurfaceStyle();
  return {
    ...base,
    ["--lt-accent" as string]: "#ffffff",
    ["--lt-accent-on" as string]: "#000000",
    ["--lt-accent-shadow" as string]: "rgba(255,255,255,0.28)",
    ["--lt-accent-soft" as string]: "rgba(255,255,255,0.12)",
  } as CSSProperties;
}

export function XiStrip({
  players,
  className,
}: {
  players: readonly LabSquadPlayer[] | readonly string[] | undefined;
  className?: string;
}) {
  if (!players?.length) {
    return (
      <p className={cn("text-[11px] text-white/35", className)}>No XI loaded</p>
    );
  }
  const names =
    typeof players[0] === "string"
      ? (players as readonly string[])
      : (players as readonly LabSquadPlayer[]).map((p) => p.name);
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {names.map((n) => (
        <span
          key={n}
          className="rounded-md border border-white/12 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70"
        >
          {n}
        </span>
      ))}
    </div>
  );
}

export function RankRowMeta({
  row,
  pts,
}: {
  row: LabLeaderboardRow;
  pts?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <span className="w-8 shrink-0 font-display text-sm font-black tabular-nums text-white/45">
        {row.rank}
      </span>
      <span className="truncate font-display text-sm font-black uppercase tracking-wide text-white">
        {row.nickname}
        {row.isYou ? (
          <span className="ml-2 text-[9px] font-bold tracking-[0.16em] text-white/50">
            YOU
          </span>
        ) : null}
      </span>
      {pts ? (
        <span className="ml-auto font-display text-base font-black tabular-nums text-white">
          <CounterUp value={row.finalPoints} />
        </span>
      ) : null}
    </div>
  );
}

/** Soft cursor spotlight for void canvases (TripleD Dynamic Spotlight grammar). */
export function CursorSpotlight({
  active = true,
  color = "rgba(255,255,255,0.14)",
  size = 420,
}: {
  active?: boolean;
  color?: string;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    if (!active || reduce) return;
    const el = ref.current?.parentElement;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setPos({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [active, reduce]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500"
      style={{
        opacity: active ? 1 : 0.35,
        background: `radial-gradient(${size}px circle at ${pos.x}% ${pos.y}%, ${color} 0%, transparent 55%)`,
      }}
    />
  );
}

export function ConceptChrome({
  title,
  hook,
  children,
  className,
}: {
  title: string;
  hook: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-[60] px-4 pt-[4.75rem] sm:px-6",
        className,
      )}
    >
      <div className="pointer-events-none mx-auto max-w-5xl">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
          {title}
        </p>
        <p className="mt-1 max-w-md text-[12px] leading-snug text-white/45">
          {hook}
        </p>
        {children}
      </div>
    </div>
  );
}

export function WhiteCta({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[0_0_28px_rgba(255,255,255,0.22)] transition hover:brightness-110 disabled:opacity-45",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function GhostBtn({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border border-white/20 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 transition hover:border-white/35 hover:text-white active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function scrollOwnerIntoView(owner: string) {
  const el = document.getElementById(`rt-row-${owner}`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
