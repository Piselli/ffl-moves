"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion, motion } from "framer-motion";
import { Form8Lockup } from "@/components/Form8Mark";
import { cn } from "@/lib/utils";

/** Same room as desktop locker — atmosphere without the 3D tablet. */
const GATE_ROOM_SRC =
  "/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.webp";

type DeadlineParts = {
  h: number;
  m: number;
  s: number;
  remainingMs: number;
  expired: boolean;
};

function useCountdown(target: string | null): DeadlineParts | null {
  const [parts, setParts] = useState<DeadlineParts | null>(null);
  useEffect(() => {
    if (!target) {
      setParts(null);
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ h: 0, m: 0, s: 0, remainingMs: 0, expired: true });
        return;
      }
      setParts({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        remainingMs: diff,
        expired: false,
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return parts;
}

function formatClock(parts: DeadlineParts): string {
  const hh = String(parts.h).padStart(2, "0");
  const mm = String(parts.m).padStart(2, "0");
  if (parts.remainingMs < 60 * 60 * 1000) {
    const ss = String(parts.s).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}h ${mm}m`;
}

export type MatchdayGateCopy = {
  buildTeam: string;
  trustLine: string;
  /** Live countdown, e.g. "04h 12m left" / "04h 12m" */
  closesIn: (label: string) => string;
  /** Single word when locked — no explanation box. */
  closedLabel: string;
  /** Live status word when registration is open. */
  openLabel: string;
  poolFallback: string;
  poolLabel: string;
  managersLabel: (n: number) => string;
  managersFallback: string;
  gwLabel: (id: number | string) => string;
};

type Props = {
  gwId: number | null;
  prizeLabel: string;
  entries: number | null;
  deadlineIso: string | null;
  loading?: boolean;
  copy: MatchdayGateCopy;
  onEnter: () => void;
};

/**
 * Mobile IG entry — Matchday Gate V2 · Offer Stack.
 * Prize + managers = one offer. Game Week · Open/Closed = whisper under.
 */
export function MatchdayGate({
  gwId,
  prizeLabel,
  entries,
  deadlineIso,
  loading = false,
  copy,
  onEnter,
}: Props) {
  const reduce = Boolean(useReducedMotion());
  const parts = useCountdown(deadlineIso);
  const isClosed = !loading && (Boolean(parts?.expired) || !deadlineIso);
  const isOpen = !loading && Boolean(deadlineIso && parts && !parts.expired);
  const urgent =
    isOpen && parts != null && parts.remainingMs < 2 * 60 * 60 * 1000;

  const statusBit = loading
    ? null
    : isClosed
      ? copy.closedLabel
      : isOpen && parts
        ? urgent
          ? copy.closesIn(formatClock(parts))
          : copy.openLabel
        : null;

  const gwLine = [
    gwId != null ? copy.gwLabel(gwId) : null,
    statusBit,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <motion.div
      className="absolute inset-0 z-[70] flex flex-col overflow-hidden bg-[#0a0908] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={GATE_ROOM_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/82 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_40%_at_50%_100%,rgba(0,249,72,0.1),transparent_55%)]" />
      </div>

      <div className="relative flex items-center pt-1">
        <Form8Lockup
          priority
          className="h-7 gap-2"
          markClassName="h-7"
          wordmarkClassName="text-[1.15rem] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center pb-4">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {copy.poolLabel}
          </p>
          <p
            className={cn(
              "mt-1.5 font-display text-[clamp(3.5rem,17vw,5.25rem)] font-black leading-[0.88] tracking-tight text-[#00f948]",
              "drop-shadow-[0_0_48px_rgba(0,249,72,0.28)]",
              loading && "animate-pulse text-white/30",
            )}
          >
            {loading ? copy.poolFallback : prizeLabel}
          </p>

          {/* Social proof glued to the offer */}
          <p
            className={cn(
              "mt-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-white/65",
              loading && "text-white/30",
            )}
          >
            {!loading && entries != null ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f948] shadow-[0_0_8px_rgba(0,249,72,0.65)]"
                aria-hidden
              />
            ) : null}
            {loading || entries == null
              ? copy.managersFallback
              : copy.managersLabel(entries)}
          </p>

          {gwLine ? (
            <p
              className={cn(
                "mt-4 text-[11px] font-medium uppercase tracking-[0.14em]",
                urgent ? "text-[#00f948]/85" : "text-white/38",
              )}
            >
              {gwLine}
            </p>
          ) : null}
        </motion.div>
      </div>

      <div className="relative flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onEnter}
          className="flex h-12 w-full items-center justify-center rounded-xl font-display text-[15px] font-bold uppercase tracking-[0.08em] text-white transition active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(180deg, #3BE07A 0%, #17C255 46%, #0E9B41 100%)",
            textShadow: "0 1px 1px rgba(0,0,0,0.35)",
            boxShadow: [
              "inset 0 1.5px 0 rgba(255,255,255,0.55)",
              "inset 0 -2px 4px rgba(0,40,14,0.45)",
              "0 4px 10px rgba(0,0,0,0.35)",
              "0 12px 28px rgba(10,120,50,0.35)",
            ].join(", "),
          }}
        >
          {copy.buildTeam}
        </button>
        <p className="text-center text-[10px] leading-snug text-white/35">
          {copy.trustLine}
        </p>
      </div>
    </motion.div>
  );
}
