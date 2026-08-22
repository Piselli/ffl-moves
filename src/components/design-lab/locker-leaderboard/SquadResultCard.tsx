"use client";

import { motion } from "framer-motion";
import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import { PlayerPointsBreakdownTooltip } from "@/components/PlayerPointsBreakdownTooltip";
import { cn } from "@/lib/utils";
import type { YouXiVariantId } from "./youXiVariants";
import type { LabSquadPlayer } from "./mockData";
import {
  cardBreakdownEntries,
  playerPositionLabel,
  scoringPlayerFromLab,
} from "./xiBreakdownHelpers";
import { clubFooterColors, clubShort } from "./squadCardKit";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Bust size — larger than homepage pitch chips; full head via PitchChipCutout. */
const BUST = 70;

type Entry = { label: string; points: number };

const SHELL: Record<"slate" | "crystal" | "obsidian", string> = {
  slate:
    "rounded-[12px] border border-white/[0.2] bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(0,0,0,0.4)]",
  crystal:
    "rounded-[12px] border border-white/30 bg-black/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_24px_rgba(0,0,0,0.4)] backdrop-blur-md",
  obsidian:
    "rounded-[12px] border border-white/14 bg-[#0c0e12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(0,0,0,0.45)]",
};

function shellFor(_variant: YouXiVariantId): keyof typeof SHELL {
  return "obsidian";
}

function playerSurname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function shortLabel(label: string): string {
  return label
    .replace(/Played 60\+ mins/gi, "60'")
    .replace(/Played 90'?/gi, "90'")
    .replace(/Clean sheet/gi, "CS")
    .replace(/FPL bonus/gi, "Bon")
    .replace(/Subbed on · /i, "On ")
    .replace(/2× Goal/gi, "2G")
    .replace(/Goal/gi, "G")
    .replace(/Assist/gi, "A")
    .replace(/saves?/gi, "Sv");
}

function Bust({ player }: { player: LabSquadPlayer }) {
  const kit = player.teamId ? pl2627HomeKit(player.teamId) : null;
  return (
    <div className="flex min-h-0 w-full flex-1 items-end justify-center overflow-visible pb-0 pt-1">
      <PitchChipCutout
        player={{
          name: player.name,
          team: kit?.club ?? null,
          teamId: player.teamId,
          photo: player.photo,
          fplPhotoCode: player.fplPhotoCode,
          apiId: player.apiId,
        }}
        name={player.name}
        size={BUST}
      />
    </div>
  );
}

function Dock({
  player,
  entries,
  isSub,
}: {
  player: LabSquadPlayer;
  entries: Entry[];
  isSub: boolean;
}) {
  const surname = playerSurname(player.name);
  const pos = isSub ? "SUB" : playerPositionLabel(player);
  const club = clubShort(player);
  const footer =
    player.teamId != null
      ? clubFooterColors(player.teamId)
      : { bg: "#2a2d33", fg: "#fff" };

  const why = entries
    .slice(0, 2)
    .map((e) => {
      const lab = shortLabel(e.label);
      return e.points ? `${lab}+${e.points}` : lab;
    })
    .join(" · ");

  return (
    <div className="relative z-[2] w-full shrink-0">
      {/* Name */}
      <div className="flex h-[16px] items-center justify-center overflow-hidden rounded-t-[4px] bg-white px-1">
        <span className="truncate text-center text-[10px] font-black uppercase leading-none tracking-wide text-[#0a0a0a]">
          {surname}
        </span>
      </div>

      {/* Pos · club | pts */}
      <div className="flex h-[16px] items-stretch">
        <div
          className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-1"
          style={{ background: footer.bg, color: footer.fg }}
        >
          <span className="truncate text-center text-[8px] font-bold uppercase leading-none tracking-[0.06em]">
            {pos} · {club}
          </span>
        </div>
        <div className="flex min-w-[28px] shrink-0 items-center justify-center bg-[#14161c] px-1">
          <span className="font-display text-[14px] font-black tabular-nums leading-none text-white">
            {player.pts}
          </span>
        </div>
      </div>

      {/* Scoring — one readable line */}
      <div
        className="flex h-[14px] items-center overflow-hidden rounded-b-[4px] bg-white/[0.1] px-1"
        title={why || "—"}
      >
        <span className="truncate text-[8px] font-semibold leading-none text-white/85">
          {why || "—"}
        </span>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  entries,
  isSub,
  variant,
}: {
  player: LabSquadPlayer;
  entries: Entry[];
  isSub: boolean;
  variant: YouXiVariantId;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden p-1",
        SHELL[shellFor(variant)],
        isSub && "opacity-[0.88]",
      )}
    >
      <Bust player={player} />
      <Dock player={player} entries={entries} isSub={isSub} />
    </div>
  );
}

export function SquadResultCard({
  player,
  gains,
  variant,
  reduce,
  delay,
}: {
  player: LabSquadPlayer;
  gains: Record<string, string>;
  variant: YouXiVariantId;
  reduce: boolean;
  delay: number;
}) {
  const entries = cardBreakdownEntries(player, gains);
  const isSub = player.isStarter === false;

  const card = (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : delay, duration: 0.2, ease: EASE }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className="h-full min-h-0"
    >
      <PlayerCard
        player={player}
        entries={entries}
        isSub={isSub}
        variant={variant}
      />
    </motion.div>
  );

  if (!player.stats) return card;

  return (
    <PlayerPointsBreakdownTooltip
      scoringPlayer={scoringPlayerFromLab(player)}
      stats={player.stats}
      total={player.pts}
      subNote={player.subNote}
      className="h-full min-h-0"
    >
      {card}
    </PlayerPointsBreakdownTooltip>
  );
}
