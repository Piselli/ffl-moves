"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  computeFantasyPointsBreakdown,
  type PointsBreakdownLineKind,
} from "@/lib/scoring";
import { GK_SAVE_BATCH } from "@/lib/scoring-rules";
import { cn } from "@/lib/utils";
import type { LabLeaderboardRow, LabSquadPlayer } from "./mockData";
import { SquadCardPortrait } from "./SquadCardPortrait";
import { clubFooterColors, clubShort } from "./squadCardKit";
import type { YouXiVariantId } from "./youXiVariants";
import { resolveYouXiVariantId } from "./youXiVariants";
import {
  groupSquadFifaRows,
  playerPositionLabel,
  scoringPlayerFromLab,
  type SquadFormationGroups,
} from "./xiBreakdownHelpers";

const EASE = [0.22, 1, 0.36, 1] as const;
const ROW_COLS = 7;

/** Grid plate language — Stack only (lab still maps legacy ids here). */
type PlateId = "stack";

type PlateSelect = {
  selectedName: string | null;
  onHover: (player: LabSquadPlayer) => void;
  onHoverEnd: () => void;
  onToggle: (player: LabSquadPlayer) => void;
};

/** Naming-sheet rim — claim / board language. */
const SLATE_SHELL =
  "rounded-[12px] border border-white/[0.2] bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.42)]";

function asPlateId(_id: YouXiVariantId): PlateId {
  return "stack";
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

/** Popup pts — empty / pending → dash. Sized for 2 digits (rare haul ~30+). */
function formatDetailPts(player: LabSquadPlayer): string {
  if (player.stats == null && player.pts === 0) return "—";
  return String(player.pts);
}

function usePlayerMeta(player: LabSquadPlayer) {
  const isSub = player.isStarter === false;
  const kit = player.teamId ? pl2627HomeKit(player.teamId) : null;
  const pos = isSub ? "SUB" : playerPositionLabel(player);
  const club = clubShort(player);
  const footer =
    player.teamId != null
      ? clubFooterColors(player.teamId)
      : { bg: "#2a2d33", fg: "#fff" };
  return {
    isSub,
    kit,
    pos,
    club,
    footer,
    sur: surname(player.name),
  };
}

/** Transparent cutout — feet flush on dock; more bust now that why-strip is gone. */
function Bust({
  player,
  kit,
}: {
  player: LabSquadPlayer;
  kit: ReturnType<typeof pl2627HomeKit> | null;
}) {
  return (
    <div className="relative z-[2] min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-x-[-4%] bottom-0 top-[4%] flex items-end justify-center">
        <SquadCardPortrait
          player={player}
          teamName={kit?.club ?? null}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

function plateShell(
  selected: boolean,
  base: string,
  isSub: boolean,
): string {
  return cn(
    "relative flex h-full min-h-0 w-full flex-col overflow-hidden p-1",
    base,
    isSub && "opacity-[0.88]",
    selected && "ring-2 ring-white/55 ring-offset-1 ring-offset-black/50",
  );
}

function PlateButton({
  player,
  select,
  reduce,
  delay,
  children,
}: {
  player: LabSquadPlayer;
  select: PlateSelect;
  reduce: boolean;
  delay: number;
  children: ReactNode;
}) {
  const on = select.selectedName === player.name;
  return (
    <motion.button
      type="button"
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : delay, duration: 0.22, ease: EASE }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className="h-full min-h-0 w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      aria-pressed={on}
      aria-label={`${player.name}, ${player.pts} points`}
      onMouseEnter={() => select.onHover(player)}
      onMouseLeave={() => select.onHoverEnd()}
      onFocus={() => select.onHover(player)}
      onBlur={() => select.onHoverEnd()}
      onClick={() => select.onToggle(player)}
    >
      {children}
    </motion.button>
  );
}

/* ─── Name Stack ─── */
function PlateStack({
  player,
  reduce,
  delay,
  select,
}: {
  player: LabSquadPlayer;
  reduce: boolean;
  delay: number;
  select: PlateSelect;
}) {
  const m = usePlayerMeta(player);
  const on = select.selectedName === player.name;
  return (
    <PlateButton player={player} select={select} reduce={reduce} delay={delay}>
      <div className={plateShell(on, SLATE_SHELL, m.isSub)}>
        <div className="relative z-[2] flex h-[18px] shrink-0 items-center justify-center rounded-t-[8px] bg-white px-1">
          <span className="truncate text-[11px] font-black uppercase leading-none tracking-wide text-[#0a0a0a]">
            {m.sur}
          </span>
        </div>
        <Bust player={player} kit={m.kit} />
        <div className="relative z-[3] flex h-[22px] w-full shrink-0 items-stretch overflow-hidden rounded-b-[5px]">
          <div
            className="flex min-w-0 flex-1 items-center px-1.5"
            style={{ background: m.footer.bg, color: m.footer.fg }}
          >
            <span className="truncate text-[10px] font-bold uppercase leading-none">
              {m.pos} · {m.club}
            </span>
          </div>
          <div className="flex min-w-[36px] items-center justify-center bg-white px-1">
            <span className="font-display text-[18px] font-black tabular-nums leading-none text-[#0a0a0a]">
              {player.pts}
            </span>
          </div>
        </div>
      </div>
    </PlateButton>
  );
}

function PlayerPlate({
  plate,
  player,
  reduce,
  delay,
  select,
}: {
  plate: PlateId;
  player: LabSquadPlayer;
  reduce: boolean;
  delay: number;
  select: PlateSelect;
}) {
  void plate;
  const props = { player, reduce, delay, select };
  return <PlateStack {...props} />;
}

function SquadRow({
  plate,
  players,
  reduce,
  delayBase,
  select,
}: {
  plate: PlateId;
  players: readonly LabSquadPlayer[];
  reduce: boolean;
  delayBase: number;
  select: PlateSelect;
}) {
  const slots: (LabSquadPlayer | null)[] = [
    ...players,
    ...Array(Math.max(0, ROW_COLS - players.length)).fill(null),
  ].slice(0, ROW_COLS);

  return (
    <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1.5">
      {slots.map((player, i) =>
        player ? (
          <PlayerPlate
            key={player.name}
            plate={plate}
            player={player}
            reduce={reduce}
            delay={delayBase + i * 0.02}
            select={select}
          />
        ) : (
          <div
            key={`empty-${i}`}
            aria-hidden
            className="rounded-[12px] border border-dashed border-white/[0.06]"
          />
        ),
      )}
    </div>
  );
}

const DETAIL_BOX =
  "pointer-events-auto absolute inset-x-2 bottom-1 z-30 mx-auto h-[236px] w-[min(100%,34rem)]";

/**
 * Force LoginModal / DepositModal glass tokens.
 * Tablet overwrites `--lt-glass-*` with brighter frost — reset so plaques match site modals.
 */
const MODAL_GLASS_VARS = {
  ["--lt-glass-bg" as string]: "rgba(0,0,0,0.75)",
  ["--lt-glass-blur" as string]: "24px",
  ["--lt-glass-ring" as string]: "rgba(255,255,255,0.20)",
  ["--lt-glass-shadow" as string]:
    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -12px 28px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.45)",
  ["--lt-glass-sheen" as string]:
    "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 28%)",
} as const;

/** Universal checklist — every scoring slot, dash when not earned. */
const DETAIL_KINDS: readonly PointsBreakdownLineKind[] = [
  "minutesPartial",
  "minutes60",
  "goal",
  "assist",
  "hattrick",
  "cleanSheet",
  "savesBatch",
  "penSave",
  "concededGoal",
  "fplBonus",
  "rating90",
  "rating80",
  "rating75",
  "lowRating",
  "yellowCard",
  "redCard",
  "ownGoal",
  "penMiss",
] as const;

type DetailLine = {
  key: string;
  label: string;
  points: number | null;
};

function detailChecklist(
  player: LabSquadPlayer,
  gains: Record<string, string>,
  savesEvery: string,
): DetailLine[] {
  const scored = player.stats
    ? computeFantasyPointsBreakdown(scoringPlayerFromLab(player), player.stats)
    : [];
  const byKind = new Map<PointsBreakdownLineKind, (typeof scored)[number]>();
  for (const line of scored) byKind.set(line.kind, line);

  return DETAIL_KINDS.map((kind) => {
    const hit = byKind.get(kind);
    let label = gains[kind] ?? kind;
    if (kind === "savesBatch") {
      label = savesEvery.replace("{n}", String(GK_SAVE_BATCH));
    }
    if (hit?.count != null && hit.count > 1) {
      label = `${label} ×${hit.count}`;
    }
    return {
      key: kind,
      label,
      points: hit ? hit.points : null,
    };
  });
}

function formatLinePts(points: number | null): string {
  if (points == null) return "—";
  if (points > 0) return `+${points}`;
  return String(points);
}

function DetailScoreColumns({ rows }: { rows: DetailLine[] }) {
  const mid = Math.ceil(rows.length / 2);
  const cols = [rows.slice(0, mid), rows.slice(mid)] as const;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-0">
      {cols.map((col, ci) => (
        <ul
          key={ci}
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col justify-between py-0.5",
            ci === 0 ? "pr-3" : "border-l border-white/10 pl-3",
          )}
        >
          {col.map((row) => {
            const empty = row.points == null;
            return (
              <li
                key={row.key}
                className="flex items-center justify-between gap-2 leading-none"
              >
                <span className="min-w-0 truncate text-[10px] font-semibold text-white/82">
                  {row.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-display text-[11px] font-black tabular-nums",
                    empty
                      ? "text-white/28"
                      : row.points! > 0
                        ? "text-white"
                        : row.points! < 0
                          ? "text-rose-400"
                          : "text-white/40",
                  )}
                >
                  {formatLinePts(row.points)}
                </span>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

/**
 * Stack-language haul under the bust — club dock + white pts cell
 * (same chrome as PlateStack cards, not a floating badge).
 */
function PlayerHeroLogin({
  player,
  pts,
  empty,
}: {
  player: LabSquadPlayer;
  pts: string;
  empty: boolean;
}) {
  const m = usePlayerMeta(player);
  return (
    <div className="relative flex w-[148px] shrink-0 flex-col self-stretch overflow-hidden rounded-xl border border-white/20 bg-black/40">
      <div className="relative z-[1] flex min-h-0 flex-1 items-end justify-center px-1 pb-0 pt-2">
        <SquadCardPortrait
          player={player}
          teamName={m.kit?.club ?? null}
          className="h-full w-full min-h-[120px]"
        />
      </div>
      <div className="relative z-[2] flex h-[40px] w-full shrink-0 items-stretch overflow-hidden">
        <div
          className="flex min-w-0 flex-1 items-center px-2"
          style={{ background: m.footer.bg, color: m.footer.fg }}
        >
          <span className="truncate text-[14px] font-black uppercase leading-none tracking-wide">
            {m.pos} · {m.club}
          </span>
        </div>
        <div
          className={cn(
            "flex min-w-[52px] items-center justify-center px-2",
            empty ? "bg-white/55" : "bg-white",
          )}
        >
          <span
            className={cn(
              "font-display text-[24px] font-black tabular-nums leading-none tracking-tight",
              empty ? "text-black/35" : "text-[#0a0a0a]",
            )}
          >
            {pts}
          </span>
        </div>
      </div>
    </div>
  );
}

function DetailLayout({
  player,
  gains,
}: {
  player: LabSquadPlayer;
  gains: Record<string, string>;
}) {
  const m = useSiteMessages();
  const rows = detailChecklist(player, gains, m.home.scoringSavesEvery);
  const pts = formatDetailPts(player);
  const empty = pts === "—";

  return (
    <div className="relative z-10 flex h-full min-h-0 gap-3">
      <PlayerHeroLogin player={player} pts={pts} empty={empty} />
      <DetailScoreColumns rows={rows} />
    </div>
  );
}

type DetailProps = {
  player: LabSquadPlayer;
  gains: Record<string, string>;
  reduce: boolean;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

/** Same shell as LoginModal: GlassPanel crystal + modal glass tokens. */
function DetailLoginShell({
  player,
  gains,
  reduce,
  onPointerEnter,
  onPointerLeave,
}: DetailProps) {
  return (
    <motion.div
      role="dialog"
      aria-label={`${player.name} points breakdown`}
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={DETAIL_BOX}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <GlassPanel
        crystal
        className="h-full w-full !rounded-2xl p-3.5"
        style={MODAL_GLASS_VARS}
      >
        <DetailLayout player={player} gains={gains} />
      </GlassPanel>
    </motion.div>
  );
}

function PlayerDetailPlate({
  player,
  gains,
  reduce,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  player: LabSquadPlayer;
  gains: Record<string, string>;
  reduce: boolean;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <DetailLoginShell
      player={player}
      gains={gains}
      reduce={reduce}
      onClose={onClose}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    />
  );
}

/**
 * Crystal Result — one screen · 2×7 · plate skins.
 * Clean cards; scoring why lives in the detail plate (tap / hover).
 */
export function CrystalResultShare({
  manager,
  gameweek,
  groups,
  gains,
  plateId = "crystal-stack",
  counter = true,
}: {
  manager: LabLeaderboardRow;
  gameweek: number;
  groups: SquadFormationGroups;
  gains: Record<string, string>;
  plateId?: YouXiVariantId;
  counter?: boolean;
}) {
  const reduce = Boolean(useReducedMotion());
  const resolved = resolveYouXiVariantId(plateId);
  const plate = asPlateId(resolved);
  const { top, bottom } = groupSquadFifaRows(groups);

  void manager;
  void gameweek;
  void counter;

  const [focus, setFocus] = useState<{
    player: LabSquadPlayer;
    pinned: boolean;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const overDetailRef = useRef(false);
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverClearTimer.current) {
      clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
  }, []);

  const onHover = useCallback(
    (player: LabSquadPlayer) => {
      clearHoverTimer();
      setFocus((cur) => {
        if (cur?.pinned) return cur;
        return { player, pinned: false };
      });
    },
    [clearHoverTimer],
  );

  const onHoverEnd = useCallback(() => {
    clearHoverTimer();
    hoverClearTimer.current = setTimeout(() => {
      if (overDetailRef.current) return;
      setFocus((cur) => (cur?.pinned ? cur : null));
    }, 120);
  }, [clearHoverTimer]);

  const onToggle = useCallback(
    (player: LabSquadPlayer) => {
      clearHoverTimer();
      setFocus((cur) => {
        if (cur?.player.name === player.name && cur.pinned) return null;
        return { player, pinned: true };
      });
    },
    [clearHoverTimer],
  );

  const clear = useCallback(() => {
    clearHoverTimer();
    overDetailRef.current = false;
    setFocus(null);
  }, [clearHoverTimer]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  useEffect(() => {
    if (!focus?.pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    const onPointer = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      clear();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [focus?.pinned, clear]);

  const selected = focus?.player ?? null;
  const select: PlateSelect = {
    selectedName: selected?.name ?? null,
    onHover,
    onHoverEnd,
    onToggle,
  };

  return (
    <motion.div
      ref={rootRef}
      className="relative flex h-full min-h-0 flex-col gap-1.5 overflow-hidden px-0.5"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 34 }
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-1.5">
        <SquadRow
          plate={plate}
          players={top}
          reduce={reduce}
          delayBase={0}
          select={select}
        />
        <SquadRow
          plate={plate}
          players={bottom}
          reduce={reduce}
          delayBase={0.14}
          select={select}
        />

        <AnimatePresence>
          {selected ? (
            <PlayerDetailPlate
              key={selected.name}
              player={selected}
              gains={gains}
              reduce={reduce}
              onClose={clear}
              onPointerEnter={() => {
                overDetailRef.current = true;
                clearHoverTimer();
              }}
              onPointerLeave={() => {
                overDetailRef.current = false;
                onHoverEnd();
              }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
