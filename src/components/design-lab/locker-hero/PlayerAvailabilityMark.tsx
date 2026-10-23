"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type {
  AvailabilityKind,
  PlayerAvailability,
  TourInjuriesPayload,
} from "@/lib/playerAvailability";
import { GlassPanel } from "./GlassPanel";

const SS_KEY = "ffl_tour_injuries_v1";
const SS_TTL_MS = 12 * 60 * 1000;

let memoryGw: number | null = null;
let memoryPayload: TourInjuriesPayload | null = null;

function readSession(gw: number): TourInjuriesPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SS_KEY}:${gw}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; payload?: TourInjuriesPayload };
    if (!parsed?.payload || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > SS_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeSession(gw: number, payload: TourInjuriesPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${SS_KEY}:${gw}`,
      JSON.stringify({ at: Date.now(), payload }),
    );
  } catch {
    /* quota */
  }
}

/** One fetch per open tour for the whole pick list. */
export function useTourInjuries(gameweekId: number | null | undefined): {
  byApiId: Record<string, PlayerAvailability>;
} {
  const gw =
    gameweekId != null && Number.isFinite(gameweekId) && gameweekId >= 1
      ? gameweekId
      : null;

  const seed =
    gw != null && memoryGw === gw && memoryPayload
      ? memoryPayload
      : gw != null
        ? readSession(gw)
        : null;

  const [byApiId, setByApiId] = useState<Record<string, PlayerAvailability>>(
    () => seed?.byApiId ?? {},
  );

  useEffect(() => {
    if (gw == null) {
      setByApiId({});
      return;
    }
    let cancelled = false;

    const cached =
      memoryGw === gw && memoryPayload ? memoryPayload : readSession(gw);
    if (cached?.byApiId) {
      memoryGw = gw;
      memoryPayload = cached;
      setByApiId(cached.byApiId);
    }

    fetch(`/api/tour-injuries?gw=${gw}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TourInjuriesPayload | null) => {
        if (cancelled || !data?.byApiId) return;
        memoryGw = gw;
        memoryPayload = data;
        writeSession(gw, data);
        setByApiId(data.byApiId);
      })
      .catch(() => {
        /* keep seed */
      });

    return () => {
      cancelled = true;
    };
  }, [gw]);

  return { byApiId };
}

export type AvailabilityMarkCopy = {
  outTitle: string;
  doubtTitle: string;
  suspendedTitle: string;
  reasonFallback: string;
};

const DEFAULT_COPY: AvailabilityMarkCopy = {
  outTitle: "Out",
  doubtTitle: "Doubtful",
  suspendedTitle: "Suspended",
  reasonFallback: "Unavailable this tour",
};

function kindTitle(kind: AvailabilityKind, copy: AvailabilityMarkCopy): string {
  if (kind === "out") return copy.outTitle;
  if (kind === "suspended") return copy.suspendedTitle;
  return copy.doubtTitle;
}

/**
 * Medical / Red Cross — filled equal arms (Geneva proportions),
 * not a stroke “+” add glyph.
 * Arm thickness ≈ 1/3 of span; overall stays ~14px beside the surname.
 */
function MedicalPlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6.15 1.75h3.7v4.4h4.4v3.7h-4.4v4.4h-3.7v-4.4H1.75v-3.7h4.4V1.75z"
      />
    </svg>
  );
}

function SuspendedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="4.6" y="2.2" width="6.8" height="11.6" rx="1" fill="currentColor" />
      <rect
        x="5.55"
        y="3.6"
        width="4.9"
        height="1.1"
        rx="0.25"
        fill="rgba(0,0,0,0.28)"
      />
    </svg>
  );
}

function MarkGlyph({
  kind,
  className,
}: {
  kind: AvailabilityKind;
  className?: string;
}) {
  if (kind === "out") {
    return <MedicalPlusIcon className={cn("h-[14px] w-[14px]", className)} />;
  }
  if (kind === "suspended") {
    return (
      <SuspendedIcon className={cn("h-[14px] w-[14px] text-[#ef4444]", className)} />
    );
  }
  // Warm amber type — color for notice, no circle/badge chrome.
  return (
    <span
      className={cn(
        "inline-flex h-[14px] min-w-[0.5em] items-center justify-center",
        "text-[14px] font-semibold leading-none",
        className,
      )}
      aria-hidden
    >
      ?
    </span>
  );
}

/**
 * Mark beside the surname — hover / tap opens a glass tip.
 * Stops propagation so the parent pick row does not fire.
 */
export function PlayerAvailabilityMark({
  availability,
  copy = DEFAULT_COPY,
  className,
}: {
  availability: PlayerAvailability;
  copy?: AvailabilityMarkCopy;
  className?: string;
}) {
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: Event) => {
      const t = e.target as Node | null;
      if (rootRef.current?.contains(t)) return;
      setPinned(false);
      setTipPos(null);
    };
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
  }, [pinned]);

  const title = kindTitle(availability.kind, copy);
  const reason =
    availability.reason?.trim() ||
    availability.type?.trim() ||
    copy.reasonFallback;
  const aria = `${title}: ${reason}`;

  const placeTip = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const width = 200;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - width / 2),
      window.innerWidth - width - 8,
    );
    const below = r.bottom + 8;
    const top =
      below + 96 > window.innerHeight ? Math.max(8, r.top - 92) : below;
    setTipPos({ left, top });
  };

  const onEnter = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.pointerType === "touch") return;
    placeTip(e.currentTarget);
  };

  const onLeave = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.pointerType === "touch") return;
    if (!pinned) setTipPos(null);
  };

  const onActivate = (e: ReactPointerEvent<HTMLSpanElement> | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    if (pinned) {
      setPinned(false);
      setTipPos(null);
      return;
    }
    setPinned(true);
    placeTip(el);
  };

  // Soft rose for out · warm amber for doubt (notice without neon / badge chrome)
  const kindColor =
    availability.kind === "doubt"
      ? "text-[#d4a017]"
      : availability.kind === "suspended"
        ? "text-[#ef4444]"
        : "text-[#e85d6c]";

  const tip =
    mounted && tipPos
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className="pointer-events-none fixed z-[220] w-[min(12.5rem,calc(100vw-1rem))]"
            style={{ left: tipPos.left, top: tipPos.top }}
          >
            <div className="rounded-xl bg-[#080a0e] p-px shadow-[0_14px_36px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)]">
              <GlassPanel crystal className="!rounded-[11px] px-3 py-2.5">
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45"
                  style={{ fontFamily: "var(--lt-font-display, inherit)" }}
                >
                  {title}
                </p>
                <p className="mt-1 text-[13px] font-semibold leading-snug text-white/92">
                  {reason}
                </p>
              </GlassPanel>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <span
      ref={rootRef}
      className={cn(
        "relative ml-1.5 inline-flex shrink-0 items-center justify-center self-center",
        "h-[14px] leading-none",
        "transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "hover:opacity-100 active:scale-[0.96]",
        "opacity-90",
        kindColor,
        className,
      )}
      aria-label={aria}
      aria-describedby={tipPos ? tipId : undefined}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onClick={onActivate}
    >
      <MarkGlyph kind={availability.kind} />
      {tip}
    </span>
  );
}
