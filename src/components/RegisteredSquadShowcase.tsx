"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FplPhotoAvatar } from "@/components/FplPhotoAvatar";
import { initialsFromDisplayName } from "@/lib/avatar-fallback";
import type { Player, TeamResult } from "@/lib/types";
import type { ChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { cn } from "@/lib/utils";

/**
 * Vertical pitch view: own goal at bottom (SVG y→105). `topPct` is from the top of the pitch box:
 * low % = opponent half / attack, high % = own half / defence.
 * Slot indices: on-chain / FormationGrid — 0 GK, 1–4 DEF, 5–7 MID, 8–10 FWD.
 * Anchor = visual centre of chip (−translate ½).
 *
 * Pitch proportions match markings + SVG viewBox: **playing length : goal-line width = 105 : 68**
 * (FIFA-ish metres). The on-screen box is portrait ⇒ CSS **width : height = 68 : 105** via `aspect-[68/105]`.
 */
const PITCH_SLOT_LAYOUT: readonly { formationIndex: number; leftPct: number; topPct: number }[] = [
  { formationIndex: 8, leftPct: 22, topPct: 18 },
  { formationIndex: 9, leftPct: 50, topPct: 18 },
  { formationIndex: 10, leftPct: 78, topPct: 18 },
  { formationIndex: 5, leftPct: 26, topPct: 43 },
  { formationIndex: 6, leftPct: 50, topPct: 43 },
  { formationIndex: 7, leftPct: 74, topPct: 43 },
  { formationIndex: 1, leftPct: 12, topPct: 67 },
  { formationIndex: 2, leftPct: 37, topPct: 67 },
  { formationIndex: 3, leftPct: 63, topPct: 67 },
  { formationIndex: 4, leftPct: 88, topPct: 67 },
  { formationIndex: 0, leftPct: 50, topPct: 90 },
] as const;

/** Tiered styling for the points pill — aligned with GwRecapSection / recap demo cards */
function pillStyle(pts: number) {
  if (pts >= 12)
    return {
      border: "border-[#00f948]/60",
      text: "text-[#00f948]",
      glow: "shadow-[0_0_8px_rgba(0,249,72,0.35)]",
    };
  if (pts >= 7)
    return {
      border: "border-amber-400/55",
      text: "text-amber-400",
      glow: "shadow-[0_0_6px_rgba(251,191,36,0.3)]",
    };
  if (pts >= 3)
    return {
      border: "border-white/25",
      text: "text-white/85",
      glow: "shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
    };
  return {
    border: "border-white/10",
    text: "text-white/40",
    glow: "shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
  };
}

function statFor(player: Player, gameweekStats: Record<string, Record<string, unknown>>) {
  return gameweekStats[player.id] ?? gameweekStats[player.id.toString()] ?? null;
}

/** Grass + markings; viewBox matches FIFA-style length:width ≈ 105:68 (here height:width = 105:68) */
function PitchFieldTexture() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#256d42] via-[#1d5736] to-[#163628]" />
      <div
        className="absolute inset-0 opacity-[0.26]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.065) 0px, rgba(255,255,255,0.065) 28px, transparent 28px, transparent 56px)",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 68 105"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="0.55" strokeLinecap="round">
          <rect x="1.25" y="1.25" width="65.5" height="102.5" rx="0.6" />
          <line x1="1.25" y1="52.5" x2="66.75" y2="52.5" />
          <circle cx="34" cy="52.5" r="9.5" />
          <circle cx="34" cy="52.5" r="0.7" fill="rgba(255,255,255,0.5)" stroke="none" />
          {/* Penalty / goal areas — attacking goal at bottom (y → 105) */}
          <rect x="14.5" y="88" width="39" height="16.25" />
          <rect x="24.5" y="98.5" width="19" height="5.25" />
          <circle cx="34" cy="94" r="0.65" fill="rgba(255,255,255,0.45)" stroke="none" />
          <path d="M 23 88 A 11 11 0 0 1 45 88" />
          <rect x="14.5" y="0.75" width="39" height="16.25" />
          <rect x="24.5" y="1.25" width="19" height="5.25" />
          <circle cx="34" cy="11" r="0.65" fill="rgba(255,255,255,0.45)" stroke="none" />
          <path d="M 23 17.25 A 11 11 0 0 0 45 17.25" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
    </div>
  );
}

function ShowcaseCard({
  player,
  stats,
  points,
  showScores,
  delay,
  dim = false,
  compact = false,
  pitchTile = false,
}: {
  player: Player;
  stats: Record<string, unknown> | null | undefined;
  points: number;
  showScores: boolean;
  delay: number;
  dim?: boolean;
  /** Smaller chip on bench / tight rows */
  compact?: boolean;
  /** Starting XI on grass — larger than bench compact */
  pitchTile?: boolean;
}) {
  const photo = compact ? (pitchTile ? 54 : 48) : 56;
  const maxW = compact ? (pitchTile ? 74 : 66) : 64;
  const pill = pillStyle(points);

  const goals = stats ? Number(stats.goals ?? 0) : 0;
  const assists = stats ? Number(stats.assists ?? 0) : 0;
  const cs = stats ? Boolean(stats.clean_sheet ?? stats.cleanSheet) : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay }}
      className={cn(
        "flex flex-col items-center gap-0 group",
        dim ? "opacity-75 hover:opacity-100 transition-opacity" : "",
      )}
      style={{ minWidth: maxW, maxWidth: compact ? maxW + 6 : undefined }}
    >
      <div
        className="relative transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
        style={{ width: photo, height: photo }}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border bg-[#0D0F12]/45 backdrop-blur-[2px]",
            "border-[#00f948]/35 group-hover:brightness-110 transition-all duration-200",
            compact ? "rounded-md" : "rounded-xl",
          )}
          style={{ width: photo, height: photo }}
        >
          <FplPhotoAvatar
            fplPhotoCode={player.fplPhotoCode ?? null}
            photoUrl={player.photo ?? null}
            alt={player.name}
            size={photo}
            teamName={player.team}
            initials={initialsFromDisplayName(player.webName || player.name)}
            className="h-full w-full"
          />
        </div>

        {showScores && (
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              compact ? (pitchTile ? "-bottom-[6px]" : "-bottom-[5px]") : "-bottom-[7px]",
              "min-w-[20px] px-1 py-[1px] rounded-md",
              "border bg-[#0D0F12]/95 font-display font-black tabular-nums leading-none backdrop-blur-sm",
              pill.border,
              pill.glow,
              pill.text,
            )}
            style={{ fontSize: compact ? (pitchTile ? 12 : 11) : 11.5 }}
          >
            {points}
          </span>
        )}
      </div>

      <p
        className={cn(
          "truncate text-center font-semibold leading-tight text-white/78 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
          compact
            ? pitchTile
              ? "mt-1 text-[9.5px] leading-tight"
              : "mt-0.5 text-[8.5px] leading-none"
            : "mt-1.5 text-[9.5px]",
        )}
        style={{ maxWidth: maxW + (compact ? 10 : 8) }}
      >
        {player.webName || player.name.split(" ").pop()}
      </p>

      <div className={cn("flex min-h-0 items-center justify-center gap-0.5", compact ? (pitchTile ? "h-[9px]" : "h-[8px]") : "h-[9px]")}>
        {showScores && stats && goals > 0 && (
          <span
            className={cn(
              "font-black leading-none text-[#00f948]",
              compact ? (pitchTile ? "text-[8px]" : "text-[7.5px]") : "text-[8px]",
            )}
          >
            ⚽{goals}
          </span>
        )}
        {showScores && stats && assists > 0 && (
          <span className={cn("font-black leading-none text-sky-300", compact ? (pitchTile ? "text-[8px]" : "text-[7.5px]") : "text-[8px]")}>A{assists}</span>
        )}
        {showScores && stats && cs && (
          <span className={cn("font-black leading-none text-amber-300", compact ? (pitchTile ? "text-[8px]" : "text-[7.5px]") : "text-[8px]")}>CS</span>
        )}
      </div>
    </motion.div>
  );
}

function BenchSidebarPanel({
  bench,
  delayBase,
  benchAbbrev,
  benchTitle,
  gameweekStats,
  showScores,
  getPoints,
}: {
  bench: Player[];
  delayBase: number;
  benchAbbrev: string;
  benchTitle: string;
  gameweekStats: Record<string, Record<string, unknown>>;
  showScores: boolean;
  getPoints: (player: Player) => number;
}) {
  if (!bench.length) return null;
  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-[#0a0e12]/95 px-3 pb-2 pt-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
        <span className="text-white/45">{benchAbbrev}</span>
        <span className="mx-1.5 text-white/15">·</span>
        <span className="normal-case tracking-normal text-white/28">{benchTitle}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-2">
        {bench.map((p, i) => (
          <ShowcaseCard
            key={p.id}
            player={p}
            stats={statFor(p, gameweekStats)}
            points={getPoints(p)}
            showScores={showScores}
            delay={delayBase + i * 0.04}
            dim
            compact
          />
        ))}
      </div>
    </div>
  );
}

function pointsToneClass(p: number) {
  if (p >= 7) return "text-[#00f948]";
  if (p >= 4) return "text-amber-400";
  if (p > 0) return "text-white/75";
  if (p < 0) return "text-rose-400";
  return "text-white/35";
}

export function RegisteredSquadShowcase({
  starters,
  bench,
  gameweekStats,
  showScores,
  getPoints,
  posAbbrev,
  benchAbbrev,
  startersHeading,
  benchSectionLabel,
  statsPendingHint,
  scoresSidebarTitle,
  playerColLabel,
  pointsColLabel,
  xiTotalLabel,
  officialTotalHint,
  publishedTourTotal,
  officialResolved,
  interimBreakdown,
  chainAlignedCopy,
}: {
  starters: Player[];
  bench: Player[];
  gameweekStats: Record<string, Record<string, unknown>>;
  showScores: boolean;
  getPoints: (player: Player) => number;
  posAbbrev: Record<"GK" | "DEF" | "MID" | "FWD", string>;
  benchAbbrev: string;
  startersHeading: string;
  benchSectionLabel: string;
  statsPendingHint?: string | null;
  scoresSidebarTitle: string;
  playerColLabel: string;
  pointsColLabel: string;
  xiTotalLabel: string;
  officialTotalHint: string;
  /** Canonical points from chain when `get_team_result` exists */
  publishedTourTotal?: number | null;
  /** Published results: on-chain result + breakdown */
  officialResolved?: { teamResult: TeamResult; breakdown: ChainAlignedXiBreakdown } | null;
  /** Closed GW, no chain result yet — breakdown matches contract math (no title/guild) */
  interimBreakdown?: ChainAlignedXiBreakdown | null;
  chainAlignedCopy?: {
    multiplierFooter: (factorLabel: string) => string;
    viaSub: (name: string) => string;
  } | null;
}) {
  const xiSum = starters.reduce((acc, p) => acc + getPoints(p), 0);
  const activeBreakdown = officialResolved?.breakdown ?? interimBreakdown ?? null;

  const chainSlotsByIndex = useMemo(() => {
    if (!activeBreakdown) return null;
    const m = new Map<number, ChainAlignedXiBreakdown["slots"][number]>();
    for (const row of activeBreakdown.slots) {
      m.set(row.slotIndex, row);
    }
    return m;
  }, [activeBreakdown]);

  const useChainAligned = Boolean(showScores && activeBreakdown && chainAlignedCopy);

  const headlineTotal =
    publishedTourTotal != null && Number.isFinite(publishedTourTotal)
      ? publishedTourTotal
      : interimBreakdown != null
        ? interimBreakdown.preMultiplier
        : xiSum;

  const totalHintLabel =
    publishedTourTotal != null && Number.isFinite(publishedTourTotal)
      ? officialTotalHint
      : xiTotalLabel;

  const accent = "#00f948";
  const baseShadow = [
    `0 0 0 1px ${accent}3a`,
    `0 0 16px ${accent}28`,
    `0 0 36px ${accent}12`,
    `0 14px 28px rgba(0,0,0,0.45)`,
  ].join(", ");

  const pitchDelay = 0.03;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mb-5 w-full max-w-[min(100%,56rem)] rounded-2xl bg-[#0D0F12] isolate md:w-max md:max-w-[min(100%,56rem)]"
      style={{
        border: `1px solid ${accent}26`,
        boxShadow: baseShadow,
      }}
    >
      <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2.5 sm:px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{startersHeading}</p>
        {statsPendingHint ? (
          <p className="max-w-[55%] text-right text-[10px] text-white/28 italic sm:max-w-none">{statsPendingHint}</p>
        ) : null}
      </div>

      {/* md: first column auto-width = pitch only (no 1fr gutters); plaque md:w-max hugs content */}
      <div className="grid w-full min-w-0 grid-cols-1 md:mx-auto md:w-max md:max-w-full md:grid-cols-[auto_288px] md:items-start">
        <div className="flex flex-col items-center border-white/[0.08] px-2 py-2 sm:px-3 sm:py-3 md:border-r md:border-white/[0.08] md:px-2 md:py-3 md:pr-2.5">
          <div
            className={cn(
              "relative mx-auto overflow-hidden rounded-xl border border-white/15 shadow-inner bg-[#1e5639]",
              "aspect-[68/105]",
              "w-[min(100%,272px)] sm:w-[min(100%,300px)] md:w-[336px]",
            )}
          >
            <PitchFieldTexture />
            {PITCH_SLOT_LAYOUT.map(({ formationIndex, leftPct, topPct }, i) => {
              const player = starters[formationIndex];
              if (!player) return null;
              const chainSlot = chainSlotsByIndex?.get(formationIndex);
              const pitchPts =
                useChainAligned && chainSlot
                  ? chainSlot.registeredDisplayBase
                  : getPoints(player);
              return (
                <div
                  key={`slot-${formationIndex}`}
                  className="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <ShowcaseCard
                    player={player}
                    stats={statFor(player, gameweekStats)}
                    points={pitchPts}
                    showScores={showScores}
                    delay={pitchDelay + i * 0.035}
                    compact
                    pitchTile
                  />
                </div>
              );
            })}
          </div>
        </div>

        <aside
          aria-label={scoresSidebarTitle}
          className="relative z-[1] flex min-h-0 min-w-0 flex-col border-t-2 border-white/[0.12] bg-[#080a0c]/95 pt-1 md:border-l md:border-t-0 md:border-white/[0.06] md:pt-0.5"
        >
          <div className="shrink-0 border-b border-white/[0.06] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">{scoresSidebarTitle}</p>
              <p
                className="shrink-0 font-display text-[1.75rem] font-black tabular-nums leading-none text-[#00f948] sm:text-[1.95rem]"
                aria-label={`${totalHintLabel}: ${showScores ? headlineTotal : "—"}`}
              >
                {showScores ? headlineTotal : "—"}
              </p>
            </div>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">{totalHintLabel}</p>
          </div>

          <div className="shrink-0 px-3 pb-2 pt-2">
            <div className="mb-1.5 grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-white/[0.06] pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/32">
              <span aria-hidden className="block shrink-0 text-right font-mono text-[10px] tabular-nums opacity-0 select-none">
                FWD
              </span>
              <span className="min-w-0 truncate">{playerColLabel}</span>
              <span className="shrink-0 text-right">{pointsColLabel}</span>
            </div>
            <ul className="space-y-0.5 py-0.5">
              {starters.map((p, idx) => {
                const chainSlot = chainSlotsByIndex?.get(idx);
                const pts =
                  useChainAligned && chainSlot
                    ? chainSlot.registeredDisplayBase
                    : getPoints(p);
                const subNote =
                  useChainAligned && chainSlot?.substituted && chainAlignedCopy
                    ? chainAlignedCopy.viaSub(chainSlot.effectivePlayer.webName || chainSlot.effectivePlayer.name)
                    : null;
                return (
                  <li
                    key={`xi-${p.id}-${idx}`}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0 py-1 text-[12px] leading-snug"
                  >
                    <span className="shrink-0 text-right font-mono text-[10px] tabular-nums text-white/30">
                      {posAbbrev[p.position] ?? p.position}
                    </span>
                    <span className="min-w-0 text-white/80">
                      <span className="block truncate">{p.webName || p.name}</span>
                      {subNote ? (
                        <span className="block truncate text-[9px] font-medium tabular-nums text-[#00f948]/55">{subNote}</span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "w-9 shrink-0 text-right font-display text-[13px] font-bold tabular-nums",
                        showScores ? pointsToneClass(pts) : "text-white/25",
                      )}
                    >
                      {showScores ? pts : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
            {officialResolved && chainAlignedCopy
              ? (() => {
                  const mult =
                    10000 +
                    officialResolved.teamResult.titleMultiplier +
                    officialResolved.teamResult.guildMultiplier;
                  if (mult === 10000) return null;
                  const factor =
                    mult % 100 === 0 ? String(mult / 10000) : (mult / 10000).toFixed(3).replace(/\.?0+$/, "");
                  return (
                    <div className="mt-3 border-t border-white/[0.06] pt-2 text-[10px] text-white/38">
                      <p className="text-[9px] leading-snug text-white/32">
                        {chainAlignedCopy.multiplierFooter(`×${factor}`)}
                      </p>
                    </div>
                  );
                })()
              : null}
          </div>

          <BenchSidebarPanel
            bench={bench}
            delayBase={pitchDelay + PITCH_SLOT_LAYOUT.length * 0.035}
            benchAbbrev={benchAbbrev}
            benchTitle={benchSectionLabel}
            gameweekStats={gameweekStats}
            showScores={showScores}
            getPoints={getPoints}
          />
        </aside>
      </div>
    </motion.div>
  );
}
