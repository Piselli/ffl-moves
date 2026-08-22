"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  DEFAULT_PITCH_STYLE,
  getPitchStyle,
  PITCH_STYLES,
  type PitchStyleId,
} from "@/components/design-lab/locker-hero/pitchStyles";
import { clubKitFor } from "@/components/design-lab/locker-hero/clubKitColors";
import { getPitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
import { fitPitchName } from "@/components/design-lab/locker-hero/pitchChipName";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import {
  DEFAULT_FORMATION,
  formationLanes,
  HORIZONTAL_PITCH_SLOT_LAYOUTS,
  PITCH_SLOT_LAYOUTS,
  type FormationId,
} from "@/lib/formation";
import { cn } from "@/lib/utils";
import type {
  LabLeaderboardRow,
  LabLeaderboardSnapshot,
  LabSquadPlayer,
} from "./mockData";
import { LAB_LEADERBOARD } from "./mockData";

/** Formation lanes FWD top → GK bottom — driven by scheme (4-3-3 / 3-4-3). */

type SelectionOpts = {
  onClaim?: () => void | Promise<void>;
  loadXi?: (
    owner: string,
  ) => Promise<{
    xi: LabSquadPlayer[];
    bench?: LabSquadPlayer[];
    formationId?: FormationId;
  } | null>;
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
  const [benchByOwner, setBenchByOwner] = useState<Record<string, LabSquadPlayer[]>>(
    {},
  );
  const [formationByOwner, setFormationByOwner] = useState<
    Record<string, FormationId>
  >({});
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
    setBenchByOwner({});
    setFormationByOwner({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: GW identity only
  }, [data.gameweek]);

  const baseOpen =
    data.rows.find((r) => r.owner === openOwner) ?? you ?? data.rows[0];
  const open: LabLeaderboardRow | undefined = baseOpen
    ? {
        ...baseOpen,
        xi: xiByOwner[baseOpen.owner] ?? baseOpen.xi,
        bench: benchByOwner[baseOpen.owner] ?? baseOpen.bench,
        formationId:
          formationByOwner[baseOpen.owner] ??
          baseOpen.formationId ??
          DEFAULT_FORMATION,
      }
    : undefined;

  const applyXi = (
    owner: string,
    payload: {
      xi: LabSquadPlayer[];
      bench?: LabSquadPlayer[];
      formationId?: FormationId;
    },
  ) => {
    setXiByOwner((prev) => ({ ...prev, [owner]: payload.xi }));
    if (payload.bench) {
      setBenchByOwner((prev) => ({ ...prev, [owner]: payload.bench! }));
    }
    if (payload.formationId) {
      setFormationByOwner((prev) => ({
        ...prev,
        [owner]: payload.formationId!,
      }));
    }
  };

  const select = (owner: string) => {
    setOpenOwner(owner);
    setLandKey((k) => k + 1);
    const loadXi = loadXiRef.current;
    if (loadXi && !xiByOwner[owner]) {
      setLoadingXi(true);
      void loadXi(owner).then((res) => {
        if (res?.xi?.length) applyXi(owner, res);
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
    void loadXi(openOwner).then((res) => {
      if (cancelled) return;
      if (res?.xi?.length) applyXi(openOwner, res);
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
  dense = false,
  stagger = false,
  selectPulse = false,
  layoutSelect = false,
  sectionLabel,
  className,
}: {
  rows: readonly LabLeaderboardRow[];
  openOwner: string;
  onSelect: (owner: string) => void;
  condensed?: boolean;
  scrollToYou?: boolean;
  dense?: boolean;
  stagger?: boolean;
  selectPulse?: boolean;
  /** motion.dev layout — highlight slides between rows */
  layoutSelect?: boolean;
  /** Section title aligned to the same gutter as Pos / Manager */
  sectionLabel?: string;
  className?: string;
}) {
  const youRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const reduceMotion = useReducedMotion();
  const list = condensed ? condensedRows(rows) : rows;
  const useLayout = layoutSelect && !reduceMotion;
  const padX = dense ? "px-2.5" : "px-3 sm:px-4";

  useEffect(() => {
    if (!scrollToYou) return;
    youRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToYou, openOwner]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sync = () => {
      const max = el.scrollHeight - el.clientHeight;
      setCanUp(el.scrollTop > 2);
      setCanDown(max > 4 && el.scrollTop < max - 2);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [list]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {sectionLabel ? (
        <p
          className={cn(
            "shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45",
            padX,
            dense ? "pb-2 pt-2.5" : "pb-2.5 pt-3",
          )}
        >
          {sectionLabel}
        </p>
      ) : null}
      <div
        className={cn(
          "grid shrink-0 grid-cols-[2.75rem_1fr_3rem_3.25rem] gap-2 border-b border-white/10 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40",
          padX,
          dense ? "pb-2.5" : "pb-3",
        )}
      >
        <span>Pos</span>
        <span>Manager</span>
        <span className="text-right">Pts</span>
        <span className="text-right">Prize</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <LayoutGroup id="rt-board-select">
          <div
            ref={scrollerRef}
            className="h-full min-h-0 overflow-y-auto overscroll-contain rt-scroll"
            data-lt-scroll
          >
            {list.map((item, i) => {
              if (item === "gap") {
                return (
                  <div
                    key={`gap-${i}`}
                    className="flex items-center justify-center gap-2 py-2 text-white/25"
                    aria-hidden
                  >
                    <span className="h-px w-6 bg-white/10" />
                    <span className="font-display text-[10px] tracking-[0.35em]">
                      ···
                    </span>
                    <span className="h-px w-6 bg-white/10" />
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
                  style={
                    stagger
                      ? {
                          animation: `rt-row-in 320ms cubic-bezier(0.22,1,0.36,1) both`,
                          animationDelay: `${Math.min(i, 12) * 28}ms`,
                        }
                      : undefined
                  }
                  className={cn(
                    "relative grid w-full grid-cols-[2.75rem_1fr_3rem_3.25rem] items-center gap-2 border-b border-white/[0.06] text-left transition",
                    dense ? "px-2.5 py-2" : "px-3 py-2.5 sm:px-4",
                    on && !useLayout && "bg-[#00f948]/12 ring-1 ring-inset ring-[#00f948]/45",
                    on &&
                      selectPulse &&
                      !useLayout &&
                      "animate-[rt-select-pulse_520ms_cubic-bezier(0.22,1,0.36,1)]",
                    !on && row.isYou && "bg-[#00f948]/[0.05]",
                    !on && !row.isYou && "hover:bg-white/[0.04]",
                  )}
                >
                  {on && useLayout ? (
                    <motion.span
                      layoutId="rt-row-highlight"
                      className="pointer-events-none absolute inset-0 bg-[#00f948]/14 ring-1 ring-inset ring-[#00f948]/50"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 36,
                        mass: 0.7,
                      }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative font-display font-black tabular-nums",
                      dense ? "text-sm" : "text-base sm:text-lg",
                      row.rank <= 3 || on || row.isYou
                        ? "text-[#00f948]"
                        : "text-white/40",
                    )}
                  >
                    {String(row.rank).padStart(3, "0")}
                  </span>
                  <span className="relative flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "truncate font-display font-black uppercase tracking-tight",
                        dense ? "text-xs" : "text-sm sm:text-base",
                        row.isYou && "text-[#00f948]",
                      )}
                    >
                      {row.nickname}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative text-right font-display font-black tabular-nums",
                      dense ? "text-xs" : "text-sm sm:text-base",
                    )}
                  >
                    {row.finalPoints}
                  </span>
                  <span
                    className={cn(
                      "relative text-right font-display font-black tabular-nums text-[#00f948]/90",
                      dense ? "text-xs" : "text-sm sm:text-base",
                    )}
                  >
                    {row.prizeAmount > 0 ? row.prizeAmount : "—"}
                  </span>
                </button>
              );
            })}
            {/* Peek padding so the last row isn't flush — implies more room to scroll */}
            <div className="h-3 shrink-0" aria-hidden />
          </div>
        </LayoutGroup>
        {/* Edge fades — Motion-style affordance that the list scrolls */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-200",
            canUp ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-black via-black/75 to-transparent transition-opacity duration-200",
            canDown ? "opacity-100" : "opacity-0",
          )}
        />
        {canDown ? (
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5"
          >
            <span className="h-1 w-1 rounded-full bg-white/35" />
            <span className="h-1 w-1 rounded-full bg-white/20" />
          </div>
        ) : null}
      </div>
      {stagger || selectPulse ? (
        <style>{`
          @keyframes rt-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
          @keyframes rt-select-pulse{0%{transform:scale(1)}40%{transform:scale(1.015)}100%{transform:scale(1)}}
        `}</style>
      ) : null}
    </div>
  );
}

function condensedRows(
  rows: readonly LabLeaderboardRow[],
): Array<LabLeaderboardRow | "gap"> {
  if (rows.length <= 12) return [...rows];

  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const topN = 8;
  const bottomN = 3;
  const top = sorted.slice(0, topN);
  const bottom = sorted.slice(-bottomN);
  const you = sorted.find((r) => r.isYou);

  const out: Array<LabLeaderboardRow | "gap"> = [...top];
  const seen = new Set(top.map((r) => r.owner));

  if (you && !seen.has(you.owner)) {
    const near = sorted.filter(
      (r) => Math.abs(r.rank - you.rank) <= 2 && !seen.has(r.owner),
    );
    // keep near ordered by rank
    near.sort((a, b) => a.rank - b.rank);
    if (near.length) {
      out.push("gap");
      for (const r of near) {
        out.push(r);
        seen.add(r.owner);
      }
    }
  }

  const tail = bottom.filter((r) => !seen.has(r.owner));
  if (tail.length) {
    out.push("gap");
    out.push(...tail);
  }

  return out;
}

function PitchChalkMarkings({
  chalk,
  fullMarkings,
  orientation,
}: {
  chalk: string;
  fullMarkings?: boolean;
  orientation: "portrait" | "horizontal";
}) {
  const border = { borderColor: chalk };
  const line = { background: chalk };
  const dot = { background: chalk };

  if (orientation === "horizontal") {
    return (
      <div
        className="pointer-events-none absolute inset-[5%] rounded-[2px] border-2"
        style={border}
      >
        <div
          className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2"
          style={line}
        />
        <div
          className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={border}
        />
        <div
          className="absolute left-0 top-1/2 h-[48%] w-[11%] -translate-y-1/2 border-y-2 border-r-2"
          style={border}
        />
        <div
          className="absolute right-0 top-1/2 h-[48%] w-[11%] -translate-y-1/2 border-y-2 border-l-2"
          style={border}
        />
        {fullMarkings ? (
          <>
            <div
              className="absolute left-0 top-1/2 h-[22%] w-[6%] -translate-y-1/2 border-y-2 border-r-2"
              style={border}
            />
            <div
              className="absolute right-0 top-1/2 h-[22%] w-[6%] -translate-y-1/2 border-y-2 border-l-2"
              style={border}
            />
            <div
              className="absolute left-[14%] top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={dot}
            />
            <div
              className="absolute right-[14%] top-1/2 h-1.5 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full"
              style={dot}
            />
            <div
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={dot}
            />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-[5%] rounded-[2px] border-2"
      style={border}
    >
      <div
        className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2"
        style={line}
      />
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={border}
      />
      <div
        className="absolute left-1/2 top-0 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-b-2"
        style={border}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-t-2"
        style={border}
      />
      {fullMarkings ? (
        <>
          <div
            className="absolute left-1/2 top-0 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-b-2"
            style={border}
          />
          <div
            className="absolute bottom-0 left-1/2 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-t-2"
            style={border}
          />
          <div
            className="absolute left-1/2 top-[14%] h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={dot}
          />
          <div
            className="absolute bottom-[14%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={dot}
          />
          <div
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={dot}
          />
        </>
      ) : null}
    </div>
  );
}

export function TeamSheetPitch({
  manager,
  landKey,
  label,
  loadingXi,
  pitchStyleId = DEFAULT_PITCH_STYLE,
  onPitchStyleChange,
  compact = false,
  showHeader = true,
  /**
   * Homepage-like pitch: fills the whole slot (no inset plate), no rim.
   * Corner labels sit on the turf in white.
   */
  fillPlate = false,
  plateClassName,
  title,
  pts,
  formationId = DEFAULT_FORMATION,
  orientation = "portrait",
  className,
}: {
  manager?: LabLeaderboardRow;
  landKey: number;
  label?: string;
  loadingXi?: boolean;
  pitchStyleId?: PitchStyleId;
  onPitchStyleChange?: (id: PitchStyleId) => void;
  compact?: boolean;
  showHeader?: boolean;
  fillPlate?: boolean;
  plateClassName?: string;
  title?: ReactNode;
  pts?: ReactNode;
  formationId?: FormationId;
  /** Landscape pitch: GK left, attack right — fits wide tablet panels. */
  orientation?: "portrait" | "horizontal";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const players = manager?.xi ?? [];
  const pitch = getPitchStyle(pitchStyleId);
  const scheme = manager?.formationId ?? formationId;
  const lanes = formationLanes(scheme);
  const isHorizontal = orientation === "horizontal";
  const pitchSlots = isHorizontal
    ? (HORIZONTAL_PITCH_SLOT_LAYOUTS[scheme] ?? HORIZONTAL_PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION])
    : (PITCH_SLOT_LAYOUTS[scheme] ?? PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION]);
  const chipCompact = compact || isHorizontal;
  const titleNode =
    title ??
    label ??
    (manager?.isYou ? "Your team" : manager?.nickname ?? "Team");
  const ptsNode =
    pts ??
    (manager ? (
      <>
        {manager.finalPoints} pts
      </>
    ) : null);

  return (
    <div
      className={cn(
        fillPlate ? "relative h-full min-h-0" : "flex h-full min-h-0 flex-col",
        className,
      )}
    >
      {!fillPlate && showHeader ? (
        <div className="flex items-center justify-between px-3 pb-2 sm:px-4">
          <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
            {titleNode}
          </p>
          {ptsNode ? (
            <p className="font-display text-xs font-black tabular-nums text-[#00f948]">
              {ptsNode}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "relative min-h-0 overflow-hidden",
          fillPlate
            ? cn("h-full", plateClassName ?? "rounded-[22px]")
            : cn(
                "mx-3 mb-3 rounded-2xl ring-1 sm:mx-4 sm:mb-4",
                pitch.ring,
                isHorizontal
                  ? "aspect-[105/68] w-full max-h-full shrink-0"
                  : "flex-1",
              ),
          compact && !isHorizontal ? "min-h-[12rem]" : !fillPlate && !isHorizontal && "min-h-[18rem]",
        )}
        style={{
          background: pitch.base,
          boxShadow: fillPlate ? undefined : pitch.shadow,
        }}
      >
        {pitch.image ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 scale-[1.02]"
            style={{
              backgroundImage: `url(${pitch.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: pitch.imageFilter,
            }}
          />
        ) : null}
        {pitch.stripes ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: pitch.stripes,
              opacity: pitch.stripesOpacity ?? 1,
            }}
          />
        ) : null}
        {(pitch.overlays ?? []).map((bg, i) => (
          <div
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: bg }}
          />
        ))}

        {onPitchStyleChange ? (
          <div
            className="absolute bottom-0.5 right-1 z-20 flex items-center gap-1 rounded-full bg-black/40 p-1 ring-1 ring-white/15 backdrop-blur-sm"
            role="group"
            aria-label="Pitch look"
          >
            {PITCH_STYLES.map((p) => {
              const active = p.id === pitchStyleId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPitchStyleChange(p.id)}
                  aria-pressed={active}
                  aria-label={p.name}
                  title={p.name}
                  className={cn(
                    "h-3 w-3 rounded-full transition",
                    active
                      ? "ring-2 ring-white ring-offset-1 ring-offset-black/50"
                      : "opacity-55 hover:opacity-90",
                  )}
                  style={{
                    background: p.image
                      ? `center / cover url(${p.image}), ${p.swatch}`
                      : p.swatch,
                  }}
                />
              );
            })}
          </div>
        ) : null}

        <PitchChalkMarkings
          chalk={pitch.chalk}
          fullMarkings={pitch.fullMarkings}
          orientation={orientation}
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
        ) : isHorizontal ? (
          <div className="relative z-10 h-full w-full">
            {pitchSlots.map(({ formationIndex, leftPct, topPct }, i) => {
              const player = players[formationIndex];
              if (!player) return null;
              return (
                <div
                  key={`${landKey}-${formationIndex}-${player.name}`}
                  className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <ResultsPitchChip
                    player={player}
                    delay={reduceMotion ? 0 : i * 35}
                    reduceMotion={!!reduceMotion}
                    compact={chipCompact}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={cn(
              "relative z-10 flex h-full flex-col justify-evenly px-0.5 py-2 sm:py-3",
            )}
          >
            {lanes.map((lane) => {
              const slice = players.slice(lane.slice[0], lane.slice[1]);
              return (
                <div
                  key={`${lane.key}-${landKey}`}
                  className="flex items-end justify-evenly"
                >
                  {slice.map((p, i) => (
                    <ResultsPitchChip
                      key={`${landKey}-${p.name}-${i}`}
                      player={p}
                      delay={reduceMotion ? 0 : lane.slice[0] * 30 + i * 40}
                      reduceMotion={!!reduceMotion}
                      compact={chipCompact}
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

/** Same plate language as homepage LockerTablet PitchPlayerChip. */
const PLATE_FONT_SIZE = 10.5;
const PLATE_TEXT_W = 70;
const PLATE_CHIP_W = 76;

function clubShort(player: LabSquadPlayer): string {
  const teamId = player.teamId ?? 0;
  const kit = teamId ? pl2627HomeKit(teamId) : null;
  if (kit?.short) return kit.short;
  return "—";
}

function clubFooterColors(teamId: number): { bg: string; fg: string } {
  const colors = clubKitFor(teamId);
  const primary = colors.primary;
  const n = primary.replace("#", "");
  const lum = (() => {
    if (n.length !== 6) return 0.4;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  })();
  if (lum > 0.72) {
    const sec = colors.secondary;
    const sn = sec.replace("#", "");
    const sl =
      sn.length === 6
        ? (0.299 * parseInt(sn.slice(0, 2), 16) +
            0.587 * parseInt(sn.slice(2, 4), 16) +
            0.114 * parseInt(sn.slice(4, 6), 16)) /
          255
        : 0.2;
    return { bg: sec, fg: sl > 0.55 ? "#111111" : "#FFFFFF" };
  }
  return { bg: primary, fg: "#FFFFFF" };
}

function ResultsPitchFitName({
  raw,
  widthPx,
  fontSize = PLATE_FONT_SIZE,
}: {
  raw: string;
  widthPx: number;
  fontSize?: number;
}) {
  const font = getPitchChipFont();
  const { label } = fitPitchName(raw, {
    widthPx,
    fontFamily: font.family,
    weight: font.weight,
    letterSpacing: font.tracking,
    fixedSize: fontSize,
    allowAbbreviate: false,
  });

  return (
    <span
      className="block text-center"
      style={{
        width: widthPx,
        maxWidth: widthPx,
        fontSize,
        lineHeight: 1.2,
        fontFamily: font.family,
        fontWeight: font.weight,
        letterSpacing: font.tracking,
        overflow: "visible",
        whiteSpace: "nowrap",
        color: "#0a0a0a",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
      }}
      title={raw}
    >
      {label}
    </span>
  );
}

function ResultsChipCutout({
  player,
  size,
}: {
  player: LabSquadPlayer;
  size: number;
}) {
  const kit = player.teamId ? pl2627HomeKit(player.teamId) : null;
  return (
    <PitchChipCutout
      player={{
        name: player.name,
        webName: player.name,
        team: kit?.club ?? null,
        teamId: player.teamId,
        photo: player.photo,
        fplPhotoCode: player.fplPhotoCode,
        apiId: player.apiId,
      }}
      name={player.name}
      size={size}
    />
  );
}

/** Homepage-identical pitch chip — cutout + white name + club footer. */
function ResultsPitchChip({
  player,
  delay,
  reduceMotion,
  compact,
}: {
  player: LabSquadPlayer;
  delay: number;
  reduceMotion: boolean;
  compact: boolean;
}) {
  const [show, setShow] = useState(reduceMotion);
  const typeface = getTypeface();
  const teamId = player.teamId ?? 0;
  const club = clubShort(player);
  const footer = teamId
    ? clubFooterColors(teamId)
    : { bg: "#3a3d42", fg: "#FFFFFF" };
  const plateW = compact ? 46 : PLATE_CHIP_W;
  const textW = compact ? 40 : PLATE_TEXT_W;
  const fontSize = compact ? 8.5 : PLATE_FONT_SIZE;
  const cutoutSize = compact ? 30 : 48;

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
    <span
      className={cn(
        "flex flex-col items-center transition duration-300 ease-out",
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <ResultsChipCutout player={player} size={cutoutSize} />
      <span
        className="flex flex-col overflow-hidden rounded-[3px]"
        style={{
          width: plateW,
          background: footer.bg,
          boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}
      >
        <span
          className={cn(
            "flex items-center justify-center bg-white px-[3px]",
            compact ? "h-[15px]" : "h-[18px]",
          )}
          style={{ marginBottom: -1 }}
        >
          <ResultsPitchFitName
            raw={player.name}
            widthPx={textW}
            fontSize={fontSize}
          />
        </span>
        <span
          className={cn(
            "relative z-[1] flex items-center justify-center px-[3px] text-center font-bold uppercase",
            compact ? "h-[10px] text-[7px]" : "h-[12px] text-[8px]",
          )}
          style={{
            background: footer.bg,
            color: footer.fg,
            fontFamily: typeface.ui,
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {club}
        </span>
      </span>
    </span>
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
  wallet = false,
  whiteClaim = false,
  counterPts = false,
  pressClaim = false,
  claimStyle,
  className,
  style,
}: {
  data: LabLeaderboardSnapshot;
  you?: LabLeaderboardRow;
  claimPulse?: boolean;
  onClaim?: () => void;
  onFindMe?: () => void;
  claiming?: boolean;
  claimError?: string | null;
  wallet?: boolean;
  whiteClaim?: boolean;
  counterPts?: boolean;
  pressClaim?: boolean;
  /** Homepage convex-green / other CTA fills */
  claimStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
}) {
  const canClaim = Boolean(you && you.prizeAmount > 0 && !you.claimed && onClaim);

  return (
    <div
      style={style}
      className={cn(
        "flex flex-wrap items-center gap-4 px-4 py-3 sm:gap-6 sm:px-5",
        wallet
          ? "rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.1] to-white/[0.02] shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          : !style &&
              "border border-white/12 bg-[#0c0e12]/95 backdrop-blur-md",
        claimPulse && "ring-2 ring-[#00f948]/70",
        className,
      )}
    >
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
          {wallet ? "Prize wallet" : "Prize pool"}
        </p>
        <p className="font-display text-2xl font-black tabular-nums sm:text-3xl">
          {data.prizePoolLabel}
          <span className="ml-1 text-xs text-white/40">{data.prizeSymbol}</span>
        </p>
      </div>
      {you ? (
        <>
          <button
            type="button"
            onClick={onFindMe}
            className="text-left transition hover:opacity-80"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
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
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
              Points
            </p>
            <p className="font-display text-xl font-black tabular-nums sm:text-2xl">
              {counterPts ? (
                <ClaimPts value={you.finalPoints} />
              ) : (
                you.finalPoints
              )}
              <span className="ml-1 text-xs text-white/40">pts</span>
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
              style={whiteClaim ? undefined : claimStyle}
              className={cn(
                "rounded-md px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] transition hover:brightness-110 disabled:opacity-60",
                pressClaim
                  ? "active:scale-[0.92] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : "active:scale-[0.98]",
                whiteClaim
                  ? "bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.28)]"
                  : !claimStyle && "bg-[#00f948] text-black",
                claimPulse &&
                  (whiteClaim
                    ? "scale-[1.03] shadow-[0_0_36px_rgba(255,255,255,0.4)]"
                    : "scale-[1.03] shadow-[0_0_28px_rgba(0,249,72,0.45)]"),
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
          <p className="max-w-[16rem] text-right text-[10px] text-amber-200/80">
            {claimError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ClaimPts({ value }: { value: number }) {
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
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 420);
      setDisplay(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return <span className="tabular-nums">{display}</span>;
}
