"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FplPhotoAvatar } from "./FplPhotoAvatar";
import { initialsFromDisplayName } from "@/lib/avatar-fallback";
import { useNickname } from "@/hooks/useNickname";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import recapJson from "@/data/gw-recap.json";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface RecapPlayer {
  id: number; name: string; webName: string; team: string;
  position: "GK" | "DEF" | "MID" | "FWD"; positionId: number;
  fplPhotoCode: number; photo: string; points: number;
  goals?: number; assists?: number; cleanSheet?: boolean; isStarter?: boolean;
}
interface GwRecap {
  gwId: number; generatedAt: string;
  optimalSquad: {
    totalPoints: number;
    players: RecapPlayer[];
    bench?: RecapPlayer[];
  };
  winnerSquad: {
    owner: string; displayName: string; finalPoints: number;
    basePoints?: number; ratingBonus?: number; rank: number;
    players: RecapPlayer[]; bench?: RecapPlayer[];
  };
}

const POS_ORDER = ["FWD", "MID", "DEF", "GK"] as const;

// Border + glow for the points pill (single tier ramp — same logic for both panels)
function pillStyle(pts: number) {
  if (pts >= 12)
    return {
      border: "border-[#00f948]/55",
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

// ─── Single player card (FPL-style: pts pill overlays bottom of photo) ────────
function RecapCard({
  player, delay = 0, dim = false, borderClass, shared = false, sharedTitle,
}: {
  player: RecapPlayer;
  delay?: number;
  dim?: boolean;
  borderClass: string;
  /** True when this exact player is also in the OTHER squad (shared pick) */
  shared?: boolean;
  sharedTitle?: string;
}) {
  const photo = 56;
  const maxW  = 64;
  const pill  = pillStyle(player.points);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay }}
      className={`flex flex-col items-center gap-1 group ${dim ? "opacity-70 hover:opacity-100 transition-opacity" : ""}`}
      style={{ minWidth: maxW }}
    >
      {/* Photo + overlaid points pill (FPL-style) */}
      <div className="relative" style={{ width: photo, height: photo }}>
        <div className={`rounded-xl overflow-hidden border bg-white/[0.04]
                         group-hover:brightness-110 transition-all duration-200 ${borderClass}`}
             style={{ width: photo, height: photo }}>
          <FplPhotoAvatar
            fplPhotoCode={player.fplPhotoCode || null}
            photoUrl={player.photo || null}
            alt={player.name}
            size={photo}
            teamName={player.team}
            initials={initialsFromDisplayName(player.webName || player.name)}
            className="w-full h-full"
          />
        </div>

        {/* Shared-pick indicator — tiny green dot, top-right */}
        {shared && (
          <span
            title={sharedTitle}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00f948]
                       ring-2 ring-[#0D0F12] shadow-[0_0_6px_rgba(0,249,72,0.7)]"
            aria-label={sharedTitle}
          />
        )}

        {/* Points pill — overlaps bottom-center of the photo */}
        <span
          className={`absolute left-1/2 -translate-x-1/2 -bottom-[7px]
                      min-w-[22px] px-1.5 py-[1px] rounded-md
                      bg-[#0D0F12]/95 backdrop-blur-sm border ${pill.border} ${pill.glow}
                      font-display font-black tabular-nums leading-none text-center
                      ${pill.text}`}
          style={{ fontSize: 11.5 }}
        >
          {player.points}
        </span>
      </div>

      {/* Name (slightly more breathing room because pill cuts into top of this region) */}
      <p className="text-center font-semibold text-white/55 leading-tight truncate mt-1.5"
         style={{ fontSize: 9.5, maxWidth: maxW + 6 }}>
        {player.webName || player.name.split(" ").pop()}
      </p>

      {/* Micro stats */}
      <div className="flex gap-1 h-[10px] items-center">
        {(player.goals ?? 0) > 0 &&
          <span style={{ fontSize: 8 }} className="text-[#00f948] font-black leading-none">⚽{player.goals}</span>}
        {(player.assists ?? 0) > 0 &&
          <span style={{ fontSize: 8 }} className="text-sky-400 font-black leading-none">A{player.assists}</span>}
        {player.cleanSheet &&
          <span style={{ fontSize: 8 }} className="text-amber-400 font-black leading-none">CS</span>}
      </div>
    </motion.div>
  );
}

// ─── One formation row ────────────────────────────────────────────────────────
function FormRow({
  pos, posLabel, players, delay, borderClass, sharedIds, sharedTitle,
}: {
  pos: string;
  posLabel: string;
  players: RecapPlayer[];
  delay: number;
  borderClass: string;
  sharedIds: Set<number>;
  sharedTitle: string;
}) {
  if (!players.length) return null;
  return (
    <div className="flex items-end gap-2.5">
      <span className="shrink-0 w-[28px] pb-3 text-right
                       text-[8.5px] font-bold tracking-[0.18em] text-white/22 uppercase">
        {posLabel}
      </span>
      <div className="flex flex-1 justify-center items-end gap-2 sm:gap-2.5">
        {players.map((p, i) => (
          <RecapCard
            key={p.id}
            player={p}
            delay={delay + i * 0.045}
            borderClass={borderClass}
            shared={sharedIds.has(p.id)}
            sharedTitle={sharedTitle}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Bench row ────────────────────────────────────────────────────────────────
function BenchRow({
  bench, delay, borderClass, label, sharedIds, sharedTitle,
}: {
  bench: RecapPlayer[];
  delay: number;
  borderClass: string;
  label: string;
  sharedIds: Set<number>;
  sharedTitle: string;
}) {
  if (!bench || bench.length === 0) return null;
  return (
    <div className="px-3 sm:px-3.5 pb-2.5 sm:pb-3">
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }} className="pt-2">
        <div className="flex items-end gap-2.5">
          <span className="shrink-0 w-[28px] pb-3 text-right
                           text-[8.5px] font-bold tracking-[0.18em] text-white/22 uppercase">
            {label}
          </span>
          <div className="flex flex-1 justify-center items-end gap-2 sm:gap-2.5">
            {bench.map((p, i) => (
              <RecapCard
                key={p.id}
                player={p}
                delay={delay + i * 0.04}
                dim
                borderClass={borderClass}
                shared={sharedIds.has(p.id)}
                sharedTitle={sharedTitle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Full squad panel ─────────────────────────────────────────────────────────
function SquadPanel({
  variant, label, totalPoints, pointsLabel, subtext,
  players, bench, delay, posAbbrev, benchLabel, sharedIds, sharedTitle,
}: {
  variant: "optimal" | "winner";
  label: string;
  totalPoints: number;
  pointsLabel: string;
  subtext?: string;
  players: RecapPlayer[];
  bench?: RecapPlayer[];
  delay: number;
  posAbbrev: Record<string, string>;
  benchLabel: string;
  sharedIds: Set<number>;
  sharedTitle: string;
}) {
  const isOptimal = variant === "optimal";
  const accent      = isOptimal ? "#00f948" : "#fbbf24";
  const accentCls   = isOptimal ? "text-[#00f948]" : "text-amber-400";
  const badgeCls    = isOptimal
    ? "bg-[#00f948]/10 border-[#00f948]/25 text-[#00f948]"
    : "bg-amber-400/10 border-amber-400/25 text-amber-400";
  // ONE accent border colour for every card in the panel — no per-position rainbow
  const cardBorder  = isOptimal
    ? "border-[#00f948]/30"
    : "border-amber-400/30";

  const byPos: Record<string, RecapPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) {
    const k = p.position in byPos ? p.position : "MID";
    byPos[k].push(p);
  }

  let rowDelay = delay + 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl flex flex-col overflow-hidden w-full"
      style={{
        background: "linear-gradient(175deg, rgba(255,255,255,0.024) 0%, rgba(0,0,0,0) 55%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: `inset 0 1px 0 ${accent}1e, 0 0 0 1px ${accent}0f, 0 20px 48px rgba(0,0,0,0.45)`,
      }}
    >
      {/* ── Header (compact) ── */}
      <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 pt-3 pb-2.5"
           style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`self-start inline-flex items-center gap-1.5 px-2 py-[3px]
                            rounded-full border text-[9.5px] font-bold uppercase tracking-[0.13em]
                            ${badgeCls}`}>
            {label}
          </span>
          <p className="text-[9.5px] text-white/22 uppercase tracking-[0.13em] font-mono truncate max-w-[200px] leading-tight">
            {subtext ?? "\u00A0"}
          </p>
        </div>
        <div className="text-right shrink-0 pl-3">
          <p className={`text-[1.6rem] sm:text-[1.85rem] font-display font-black tabular-nums leading-none ${accentCls}`}>
            {totalPoints}
          </p>
          <p className="text-[8px] text-white/22 uppercase tracking-[0.18em] mt-0.5">{pointsLabel}</p>
        </div>
      </div>

      {/* ── Formation rows ── */}
      <div className="flex flex-col gap-1 px-3 sm:px-3.5 py-2.5">
        {POS_ORDER.map(pos => {
          const d = rowDelay;
          rowDelay += (byPos[pos]?.length ?? 0) * 0.045 + 0.04;
          return (
            <FormRow
              key={pos}
              pos={pos}
              posLabel={posAbbrev[pos] ?? pos}
              players={byPos[pos] ?? []}
              delay={d}
              borderClass={cardBorder}
              sharedIds={sharedIds}
              sharedTitle={sharedTitle}
            />
          );
        })}
      </div>

      <BenchRow
        bench={bench ?? []}
        delay={rowDelay}
        borderClass={cardBorder}
        label={benchLabel}
        sharedIds={sharedIds}
        sharedTitle={sharedTitle}
      />
    </motion.div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function GwRecapSection() {
  const m = useSiteMessages();
  const { getNickname } = useNickname();

  const raw = recapJson as unknown as Partial<GwRecap> & { gwId?: number };

  // Hooks must run unconditionally — compute shared IDs before any early return.
  const sharedIds = useMemo(() => {
    const set = new Set<number>();
    if (!raw?.optimalSquad?.players || !raw?.winnerSquad?.players) return set;
    const optimalAll = [
      ...raw.optimalSquad.players,
      ...(raw.optimalSquad.bench ?? []),
    ];
    const winnerAll = new Set<number>([
      ...raw.winnerSquad.players.map((p) => p.id),
      ...(raw.winnerSquad.bench ?? []).map((p) => p.id),
    ]);
    for (const p of optimalAll) if (winnerAll.has(p.id)) set.add(p.id);
    return set;
  }, [raw]);

  if (!raw?.gwId || raw.gwId === 0 || !raw.optimalSquad || !raw.winnerSquad) return null;
  const recap = raw as GwRecap;

  const optimalPts = recap.optimalSquad.totalPoints;
  const winnerPts  = recap.winnerSquad.finalPoints;

  // Resolve winner display: nickname from local storage if user set one, else short address
  const winnerSubtext = getNickname(recap.winnerSquad.owner);

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-5 sm:mb-7"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                        bg-white/[0.04] border border-white/8
                        text-white/35 text-[10px] font-bold uppercase tracking-widest mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f948] shadow-[0_0_6px_#00f948]" />
          {m.recap.badge.replace("{gw}", String(recap.gwId))}
        </div>
        <h3 className="text-[28px] sm:text-4xl lg:text-[44px] font-display font-black
                       text-white uppercase tracking-tight leading-[1.05]">
          {m.recap.title1}{" "}
          <span className="text-[#00f948]">{m.recap.title2}</span>
        </h3>
        <p className="mt-3 text-white/45 text-sm sm:text-[15px] max-w-2xl mx-auto leading-relaxed">
          {m.recap.desc}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl lg:max-w-4xl mx-auto">
        <SquadPanel
          variant="optimal"
          label={`${m.recap.optimalLabel} · GW${recap.gwId}`}
          totalPoints={optimalPts}
          pointsLabel={m.recap.pointsBase}
          subtext={m.recap.optimalSubtext}
          players={recap.optimalSquad.players}
          bench={recap.optimalSquad.bench}
          delay={0}
          posAbbrev={m.positionAbbrev}
          benchLabel={m.recap.benchAbbrev}
          sharedIds={sharedIds}
          sharedTitle={m.recap.sharedPlayer}
        />
        <SquadPanel
          variant="winner"
          label={`${m.recap.winnerLabel} · GW${recap.gwId}`}
          totalPoints={winnerPts}
          pointsLabel={m.recap.pointsFinal}
          subtext={winnerSubtext}
          players={recap.winnerSquad.players}
          bench={recap.winnerSquad.bench}
          delay={0.06}
          posAbbrev={m.positionAbbrev}
          benchLabel={m.recap.benchAbbrev}
          sharedIds={sharedIds}
          sharedTitle={m.recap.sharedPlayer}
        />
      </div>
    </div>
  );
}
