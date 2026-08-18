"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  LOCKER_PALETTE,
  paletteToCssVars,
} from "@/components/design-lab/locker-hero/lockerPalettes";
import {
  getTypeface,
  typefaceToCssVars,
} from "@/components/design-lab/locker-hero/lockerTypefaces";
import { cn } from "@/lib/utils";

/** Homepage tablet materials + Onest — apply on concept roots. */
export function useObsidianSurfaceStyle(): CSSProperties {
  const typeface = getTypeface();
  return {
    color: "var(--lt-ink)",
    fontFamily: "var(--lt-font-ui)",
    ...paletteToCssVars(LOCKER_PALETTE),
    ...typefaceToCssVars(typeface),
  } as CSSProperties;
}

export function WarmSlateVoid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 20%, rgba(42,38,34,0.9) 0%, transparent 55%), linear-gradient(180deg, #1a1816 0%, #0e0d0c 55%, #080706 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** TripleD Native Tabs — sliding pill. */
export function SlidingTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <LayoutGroup id="lb-tabs">
      <div className="relative flex rounded-full bg-white/[0.06] p-1">
        {tabs.map((t) => {
          const on = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                "relative z-10 flex-1 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                on ? "text-black" : "text-white/50 hover:text-white/80",
              )}
            >
              {on ? (
                <motion.span
                  layoutId="lb-tab-pill"
                  className="absolute inset-0 rounded-full bg-white"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/** TripleD Counter Up. */
export function CounterUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const dur = 420;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last displayed
  }, [value, reduce]);

  return (
    <span className={cn("tabular-nums", className)}>{display}</span>
  );
}

/** TripleD Native Dialog — spring + blur. */
export function ClaimDialog({
  open,
  title,
  body,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/75 p-6 shadow-2xl backdrop-blur-xl"
          >
            <p className="font-display text-lg font-black uppercase tracking-tight text-white">
              {title}
            </p>
            <p className="mt-2 text-sm text-white/55">{body}</p>
            {error ? (
              <p className="mt-2 text-xs text-amber-200/80">{error}</p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/20 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition hover:border-white/35 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 rounded-xl bg-white py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? "…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** TripleD Glass Wallet strip language. */
export function WalletStrip({
  poolLabel,
  symbol,
  youRank,
  youPts,
  canClaim,
  claimed,
  onFindMe,
  onClaim,
  claiming,
}: {
  poolLabel: string;
  symbol: string;
  youRank?: number;
  youPts?: number;
  canClaim?: boolean;
  claimed?: boolean;
  onFindMe?: () => void;
  onClaim?: () => void;
  claiming?: boolean;
}) {
  return (
    <GlassPanel className="!rounded-2xl">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
            Prize pool
          </p>
          <p className="font-display text-2xl font-black tabular-nums text-white">
            {poolLabel}
            <span className="ml-1 text-xs text-white/35">{symbol}</span>
          </p>
        </div>
        {youRank != null ? (
          <button
            type="button"
            onClick={onFindMe}
            className="text-left transition hover:opacity-80 active:scale-[0.98]"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
              You
            </p>
            <p className="font-display text-xl font-black tabular-nums text-[color:var(--lt-accent)]">
              #{youRank}{" "}
              <span className="text-white">
                <CounterUp value={youPts ?? 0} />
              </span>
            </p>
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {onFindMe ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onFindMe}
              className="rounded-xl border border-white/20 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 hover:border-white/35 hover:text-white"
            >
              Find me
            </motion.button>
          ) : null}
          {canClaim ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onClaim}
              disabled={claiming}
              className="rounded-xl bg-[color:var(--lt-accent)] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[0_0_28px_var(--lt-accent-shadow)] disabled:opacity-50"
            >
              {claiming ? "Claiming…" : "Claim"}
            </motion.button>
          ) : (
            <span className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
              {claimed ? "Claimed" : "No claim"}
            </span>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

export function StatusBadge({
  children,
  tone = "quiet",
}: {
  children: ReactNode;
  tone?: "quiet" | "live" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
        tone === "live" &&
          "border-[color:var(--lt-accent)]/40 bg-[color:var(--lt-accent)]/10 text-[color:var(--lt-accent)]",
        tone === "warn" && "border-amber-400/30 bg-amber-400/10 text-amber-200/80",
        tone === "quiet" && "border-white/15 bg-white/[0.04] text-white/45",
      )}
    >
      {tone === "live" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--lt-accent)]" />
      ) : null}
      {children}
    </span>
  );
}
