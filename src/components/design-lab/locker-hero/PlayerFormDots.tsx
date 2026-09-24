"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { PlayerFormPayload, PlayerFormStatus } from "@/lib/fplPlayerForm";
import { GlassPanel } from "./GlassPanel";

const SS_KEY = "ffl_player_form_v1";
const SS_TTL_MS = 10 * 60 * 1000;

let memoryCache: PlayerFormPayload | null = null;

function readSession(): PlayerFormPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      at?: number;
      payload?: PlayerFormPayload;
    };
    if (!parsed?.payload || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > SS_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeSession(payload: PlayerFormPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SS_KEY,
      JSON.stringify({ at: Date.now(), payload }),
    );
  } catch {
    /* quota */
  }
}

export type PlayerFormCopy = {
  legend: string;
  newestHint: string;
  start: string;
  sub: string;
  out: string;
  gwLine: (gw: number, status: string) => string;
};

/** Shared fetch — one request for the whole pick tablet. */
export function usePlayerForm(): {
  byPlayer: Record<string, PlayerFormStatus[]>;
  gameweeks: number[];
} {
  const seed = memoryCache ?? readSession();
  const [byPlayer, setByPlayer] = useState<Record<string, PlayerFormStatus[]>>(
    () => seed?.byPlayer ?? {},
  );
  const [gameweeks, setGameweeks] = useState<number[]>(
    () => seed?.gameweeks ?? [],
  );

  useEffect(() => {
    let cancelled = false;
    const cached = memoryCache ?? readSession();
    if (cached?.byPlayer && Object.keys(cached.byPlayer).length) {
      memoryCache = cached;
      setByPlayer(cached.byPlayer);
      setGameweeks(cached.gameweeks ?? []);
    }

    fetch("/api/fpl-form")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PlayerFormPayload | null) => {
        if (cancelled || !data?.byPlayer) return;
        memoryCache = data;
        writeSession(data);
        setByPlayer(data.byPlayer);
        setGameweeks(data.gameweeks ?? []);
      })
      .catch(() => {
        /* keep seed / empty */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { byPlayer, gameweeks };
}

const DOT: Record<PlayerFormStatus, string> = {
  start: "bg-[#00f948]",
  sub: "bg-amber-400",
  out: "bg-[#ef4444]/85",
};

const DEFAULT_COPY: PlayerFormCopy = {
  legend: "Green started · amber sub · red out",
  newestHint: "Oldest left → newest right",
  start: "Started",
  sub: "Sub",
  out: "Did not play",
  gwLine: (gw, status) => `GW ${gw} · ${status}`,
};

function statusLabel(
  status: PlayerFormStatus,
  copy: PlayerFormCopy,
): string {
  if (status === "start") return copy.start;
  if (status === "sub") return copy.sub;
  return copy.out;
}

export function PlayerFormDots({
  statuses,
  gameweeks,
  copy = DEFAULT_COPY,
  className,
}: {
  statuses?: readonly PlayerFormStatus[] | null;
  /** Finished GWs, oldest → newest (same order as statuses). */
  gameweeks?: readonly number[];
  copy?: PlayerFormCopy;
  className?: string;
}) {
  const tipId = useId();
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!statuses?.length) return null;

  const aria = `${copy.newestHint}. ${statuses
    .map((s, i) => {
      const gw = gameweeks?.[i];
      const label = statusLabel(s, copy);
      return gw != null ? copy.gwLine(gw, label) : label;
    })
    .join(", ")}`;

  const openTip = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const width = 220;
    const left = Math.min(
      Math.max(8, r.left),
      window.innerWidth - width - 8,
    );
    setTipPos({ left, top: r.bottom + 6 });
  };

  const tip =
    mounted && tipPos
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className="pointer-events-none fixed z-[200] w-[min(14.5rem,calc(100vw-1rem))]"
            style={{ left: tipPos.left, top: tipPos.top }}
          >
            <div className="rounded-xl bg-[#080a0e] p-px shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)]">
              <GlassPanel crystal className="!rounded-[11px] px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                  {copy.newestHint}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {statuses.map((s, i) => {
                    const gw = gameweeks?.[i];
                    const label = statusLabel(s, copy);
                    const newest = i === statuses.length - 1;
                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex items-center gap-2 text-[11px] font-semibold",
                          newest ? "text-white" : "text-white/75",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            DOT[s],
                          )}
                        />
                        <span className="tabular-nums">
                          {gw != null ? copy.gwLine(gw, label) : label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 border-t border-white/10 pt-1.5 text-[10px] font-medium leading-snug text-white/50">
                  {copy.legend}
                </p>
              </GlassPanel>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <span
      className={cn(
        "relative mt-1 inline-flex items-center gap-[3px]",
        className,
      )}
      aria-label={aria}
      aria-describedby={tipPos ? tipId : undefined}
      onPointerEnter={(e) => openTip(e.currentTarget)}
      onPointerLeave={() => setTipPos(null)}
      onFocus={(e) => openTip(e.currentTarget)}
      onBlur={() => setTipPos(null)}
    >
      {statuses.map((s, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            DOT[s],
            i === statuses.length - 1 && "h-[7px] w-[7px] ring-1 ring-white/25",
          )}
        />
      ))}
      {tip}
    </span>
  );
}
