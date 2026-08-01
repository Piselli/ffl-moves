"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  LabLeaderboardRow,
  LabLeaderboardSnapshot,
  LabSquadPlayer,
} from "./mockData";
import { LAB_LEADERBOARD } from "./mockData";

/** Formation lanes for 3-4-3: FWD top → GK bottom. */
const LANES: { key: string; slice: [number, number] }[] = [
  { key: "fwd", slice: [8, 11] },
  { key: "mid", slice: [4, 8] },
  { key: "def", slice: [1, 4] },
  { key: "gk", slice: [0, 1] },
];

type SelectionOpts = {
  onClaim?: () => void | Promise<void>;
  loadXi?: (owner: string) => Promise<LabSquadPlayer[] | null>;
  claiming?: boolean;
};

export function useTeamSheetSelection(
  snapshot: LabLeaderboardSnapshot = LAB_LEADERBOARD,
  opts: SelectionOpts = {},
) {
  const data = snapshot;
  const you = data.rows.find((r) => r.isYou);
  const initial = you?.owner ?? data.rows[0]?.owner ?? "";
  const [openOwner, setOpenOwner] = useState(initial);
  const [landKey, setLandKey] = useState(0);
  const [claimPulse, setClaimPulse] = useState(false);
  const [loadingXi, setLoadingXi] = useState(false);
  const [xiByOwner, setXiByOwner] = useState<Record<string, LabSquadPlayer[]>>(
    {},
  );
  const loadXiRef = useRef(opts.loadXi);
  const onClaimRef = useRef(opts.onClaim);
  loadXiRef.current = opts.loadXi;
  onClaimRef.current = opts.onClaim;

  // Reset selection when board gameweek changes (not on every rows rememo)
  useEffect(() => {
    const nextYou = data.rows.find((r) => r.isYou);
    const next = nextYou?.owner ?? data.rows[0]?.owner ?? "";
    setOpenOwner(next);
    setLandKey((k) => k + 1);
    setXiByOwner({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: GW identity only
  }, [data.gameweek]);

  const baseOpen =
    data.rows.find((r) => r.owner === openOwner) ?? you ?? data.rows[0];
  const open: LabLeaderboardRow | undefined = baseOpen
    ? {
        ...baseOpen,
        xi: xiByOwner[baseOpen.owner] ?? baseOpen.xi,
      }
    : undefined;

  const select = (owner: string) => {
    setOpenOwner(owner);
    setLandKey((k) => k + 1);
    const loadXi = loadXiRef.current;
    if (loadXi && !xiByOwner[owner]) {
      setLoadingXi(true);
      void loadXi(owner).then((xi) => {
        if (xi?.length) {
          setXiByOwner((prev) => ({ ...prev, [owner]: xi }));
        }
        setLoadingXi(false);
      });
    }
  };

  // Prefetch XI for initial open
  useEffect(() => {
    const loadXi = loadXiRef.current;
    if (!openOwner || !loadXi) return;
    if (xiByOwner[openOwner]) return;
    let cancelled = false;
    setLoadingXi(true);
    void loadXi(openOwner).then((xi) => {
      if (cancelled) return;
      if (xi?.length) {
        setXiByOwner((prev) => ({ ...prev, [openOwner]: xi }));
      }
      setLoadingXi(false);
    });
    return () => {
      cancelled = true;
    };
  }, [openOwner, data.gameweek, xiByOwner]);

  const findMe = () => {
    if (!you) return;
    select(you.owner);
  };

  const pulseClaim = () => {
    setClaimPulse(true);
    window.setTimeout(() => setClaimPulse(false), 900);
    void onClaimRef.current?.();
  };

  return {
    data,
    you,
    open,
    openOwner,
    select,
    findMe,
    landKey,
    claimPulse,
    pulseClaim,
    loadingXi,
  };
}

export function GwDelta({ delta }: { delta?: number }) {
  if (delta == null || delta === 0) {
    return <span className="tabular-nums text-white/30">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-display text-sm font-black tabular-nums",
        up ? "text-[#00f948]" : "text-[#ff5a5a]",
      )}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {Math.abs(delta)}
    </span>
  );
}

export function TeamSheetTable({
  rows,
  openOwner,
  onSelect,
  condensed = false,
  scrollToYou = false,
  className,
}: {
  rows: readonly LabLeaderboardRow[];
  openOwner: string;
  onSelect: (owner: string) => void;
  condensed?: boolean;
  scrollToYou?: boolean;
  className?: string;
}) {
  const youRef = useRef<HTMLButtonElement>(null);
  const list = condensed ? condensedRows(rows) : rows;

  useEffect(() => {
    if (!scrollToYou) return;
    youRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToYou, openOwner]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="grid grid-cols-[2.75rem_1fr_3rem_3.25rem] gap-2 border-b border-white/10 px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 sm:px-4">
        <span>Pos</span>
        <span>Manager</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Prize</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.map((item, i) => {
          if (item === "gap") {
            return (
              <div
                key={`gap-${i}`}
                className="flex justify-center py-1.5 text-white/25"
                aria-hidden
              >
                ···
              </div>
            );
          }
          const row = item;
          const on = openOwner === row.owner;
          return (
            <button
              key={row.owner}
              ref={row.isYou ? youRef : undefined}
              type="button"
              onClick={() => onSelect(row.owner)}
              className={cn(
                "grid w-full grid-cols-[2.75rem_1fr_3rem_3.25rem] items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 text-left transition sm:px-4",
                on && "bg-[#00f948]/12 ring-1 ring-inset ring-[#00f948]/45",
                !on && row.isYou && "bg-[#00f948]/[0.05]",
                !on && !row.isYou && "hover:bg-white/[0.04]",
              )}
            >
              <span
                className={cn(
                  "font-display text-base font-black tabular-nums sm:text-lg",
                  row.rank <= 3 || on || row.isYou
                    ? "text-[#00f948]"
                    : "text-white/40",
                )}
              >
                {String(row.rank).padStart(3, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "truncate font-display text-sm font-black uppercase tracking-tight sm:text-base",
                    row.isYou && "text-[#00f948]",
                  )}
                >
                  {row.nickname}
                </span>
              </span>
              <span className="text-right font-display text-sm font-black tabular-nums sm:text-base">
                {row.finalPoints}
              </span>
              <span className="text-right font-display text-sm font-black tabular-nums text-[#00f948]/90 sm:text-base">
                {row.prizeAmount > 0 ? row.prizeAmount : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function condensedRows(
  rows: readonly LabLeaderboardRow[],
): Array<LabLeaderboardRow | "gap"> {
  const top = rows.filter((r) => r.rank <= 5);
  const you = rows.find((r) => r.isYou);
  const near = rows.filter(
    (r) => you && !r.isYou && Math.abs(r.rank - you.rank) <= 3 && r.rank > 5,
  );
  const last = rows.filter((r) => r.rank >= 999);
  const out: Array<LabLeaderboardRow | "gap"> = [...top];
  if (you && you.rank > 5) {
    out.push("gap");
    const seen = new Set(top.map((r) => r.owner));
    for (const r of near) {
      if (!seen.has(r.owner)) {
        out.push(r);
        seen.add(r.owner);
      }
    }
    if (!seen.has(you.owner)) out.push(you);
  }
  if (last.length) {
    out.push("gap");
    out.push(...last);
  }
  return out;
}

export function TeamSheetPitch({
  manager,
  landKey,
  label,
  loadingXi,
  className,
}: {
  manager?: LabLeaderboardRow;
  landKey: number;
  label?: string;
  loadingXi?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const players = manager?.xi ?? [];

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between px-3 pb-2 sm:px-4">
        <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
          {label ??
            (manager?.isYou ? "Your team" : manager?.nickname ?? "Team")}
        </p>
        {manager ? (
          <p className="font-display text-xs font-black tabular-nums text-[#00f948]">
            {manager.finalPoints} pts
          </p>
        ) : null}
      </div>

      <div className="relative mx-3 mb-3 min-h-[18rem] flex-1 overflow-hidden rounded-md border border-white/10 bg-[#0d1510] sm:mx-4 sm:mb-4">
        <div
          aria-hidden
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse at center, #14301c 0%, #0a120e 70%), repeating-linear-gradient(90deg, transparent 0 12%, rgba(255,255,255,0.03) 12% 12.5%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-[8%] rounded-sm border border-white/15"
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-white/15"
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
        />

        {loadingXi && players.length === 0 ? (
          <div className="relative z-10 flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00f948]/50 border-t-transparent" />
          </div>
        ) : players.length === 0 ? (
          <div className="relative z-10 flex h-full items-center justify-center px-4">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">
              Select a manager to see XI
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex h-full flex-col justify-between px-2 py-4 sm:px-4 sm:py-5">
            {LANES.map((lane) => {
              const slice = players.slice(lane.slice[0], lane.slice[1]);
              return (
                <div
                  key={`${lane.key}-${landKey}`}
                  className="flex items-end justify-around gap-1"
                >
                  {slice.map((p, i) => (
                    <PitchPlayer
                      key={`${landKey}-${p.name}-${i}`}
                      player={p}
                      delay={reduceMotion ? 0 : lane.slice[0] * 35 + i * 45}
                      reduceMotion={!!reduceMotion}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PitchPlayer({
  player,
  delay,
  reduceMotion,
}: {
  player: LabSquadPlayer;
  delay: number;
  reduceMotion: boolean;
}) {
  const [show, setShow] = useState(reduceMotion);
  const src = player.photo || player.cast;

  useEffect(() => {
    if (reduceMotion) {
      setShow(true);
      return;
    }
    setShow(false);
    const t = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(t);
  }, [delay, reduceMotion, player.name]);

  return (
    <div
      className={cn(
        "flex w-[4.5rem] flex-col items-center transition duration-300 ease-out sm:w-[5rem]",
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/25 bg-[#1a221c] sm:h-11 sm:w-11">
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            className="object-cover object-top"
            sizes="44px"
            unoptimized={src.startsWith("http") || src.includes("/api/")}
          />
        ) : (
          <span className="flex h-full items-center justify-center font-display text-[10px] font-black text-white/40">
            {player.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <p className="mt-1 max-w-full truncate text-center font-display text-[9px] font-bold uppercase tracking-wide text-white/85 sm:text-[10px]">
        {player.name}
      </p>
      <p className="font-display text-[10px] font-black tabular-nums text-[#00f948]">
        {player.pts} pts
      </p>
    </div>
  );
}

export function ClaimFascia({
  data,
  you,
  claimPulse,
  onClaim,
  onFindMe,
  claiming,
  claimError,
  className,
}: {
  data: LabLeaderboardSnapshot;
  you?: LabLeaderboardRow;
  claimPulse?: boolean;
  onClaim?: () => void;
  onFindMe?: () => void;
  claiming?: boolean;
  claimError?: string | null;
  className?: string;
}) {
  const canClaim = you && you.prizeAmount > 0 && !you.claimed;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 border border-white/12 bg-[#0c0e12]/95 px-4 py-3 backdrop-blur-md sm:gap-6 sm:px-5",
        claimPulse && "ring-2 ring-[#00f948]/70",
        className,
      )}
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
          Prize pool
        </p>
        <p className="font-display text-2xl font-black tabular-nums sm:text-3xl">
          {data.prizePoolLabel}
          <span className="ml-1 text-xs text-white/35">{data.prizeSymbol}</span>
        </p>
      </div>
      {you ? (
        <>
          <button
            type="button"
            onClick={onFindMe}
            className="text-left transition hover:opacity-80"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              You
            </p>
            <p className="font-display text-xl font-black tabular-nums text-[#00f948] sm:text-2xl">
              #{String(you.rank).padStart(3, "0")}
              <span className="ml-2 text-base">
                <GwDelta delta={you.gwDelta} />
              </span>
            </p>
          </button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              Points
            </p>
            <p className="font-display text-xl font-black tabular-nums sm:text-2xl">
              {you.finalPoints}
              <span className="ml-1 text-xs text-white/35">pts</span>
            </p>
          </div>
        </>
      ) : null}
      <div className="ml-auto flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {onFindMe ? (
            <button
              type="button"
              onClick={onFindMe}
              className="rounded-md border border-white/15 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              Find me
            </button>
          ) : null}
          {canClaim ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              className={cn(
                "rounded-md bg-[#00f948] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60",
                claimPulse &&
                  "scale-[1.03] shadow-[0_0_28px_rgba(0,249,72,0.45)]",
              )}
            >
              {claiming ? "Claiming…" : "Claim reward"}
            </button>
          ) : (
            <span className="rounded-md border border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
              {you?.claimed ? "Claimed" : "No claim"}
            </span>
          )}
        </div>
        {claimError ? (
          <p className="max-w-[16rem] text-right text-[9px] text-red-400/90">
            {claimError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
