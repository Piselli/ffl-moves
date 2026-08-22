"use client";

import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { Form8Mark } from "@/components/Form8Mark";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import { cn } from "@/lib/utils";
import type { LabLeaderboardRow, LabSquadPlayer } from "./mockData";
import type { YouXiVariantId } from "./youXiVariants";
import { playerPositionLabel } from "./xiBreakdownHelpers";
import { clubShort } from "./squadCardKit";

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function MiniPlayer({
  player,
  bust = 40,
  showPos = false,
}: {
  player: LabSquadPlayer;
  bust?: number;
  showPos?: boolean;
}) {
  const kit = player.teamId ? pl2627HomeKit(player.teamId) : null;
  const pos = player.isStarter === false ? "SUB" : playerPositionLabel(player);
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5">
      <div className="relative">
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
          size={bust}
        />
        <span className="absolute -bottom-0.5 -right-0.5 rounded-[4px] bg-white px-1 py-px font-display text-[10px] font-black tabular-nums leading-none text-black shadow-sm">
          {player.pts}
        </span>
      </div>
      <p className="max-w-full truncate text-center text-[9px] font-bold uppercase tracking-wide text-white">
        {surname(player.name)}
      </p>
      {showPos ? (
        <p className="truncate text-[7px] font-semibold uppercase tracking-wider text-white/40">
          {pos} · {clubShort(player)}
        </p>
      ) : null}
    </div>
  );
}

function ShareHeader({
  manager,
  gameweek,
  accent = false,
}: {
  manager: LabLeaderboardRow;
  gameweek: number;
  accent?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Form8Mark className="h-4 w-4 text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
            form8
          </span>
        </div>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
          Gameweek {gameweek}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "font-display text-[28px] font-black leading-none tabular-nums",
            accent ? "text-[#00F948]" : "text-white",
          )}
        >
          #{manager.rank}
        </p>
        <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-white">
          {manager.finalPoints}
          <span className="ml-1 text-[10px] font-medium text-white/40">pts</span>
        </p>
      </div>
    </div>
  );
}

function SquadGrid({
  players,
  bust,
  cols = 7,
}: {
  players: readonly LabSquadPlayer[];
  bust: number;
  cols?: number;
}) {
  return (
    <div
      className="grid min-h-0 flex-1 gap-x-1.5 gap-y-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {players.map((p) => (
        <MiniPlayer key={p.name} player={p} bust={bust} />
      ))}
    </div>
  );
}

/** X share — pitch-like 2×7 with brand header (Form8 share language). */
function SharePitch({
  manager,
  gameweek,
  top,
  bottom,
}: {
  manager: LabLeaderboardRow;
  gameweek: number;
  top: readonly LabSquadPlayer[];
  bottom: readonly LabSquadPlayer[];
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-[14px] border border-white/15 bg-[#0D0F12] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,249,72,0.08)_0%,transparent_50%)]" />
      <ShareHeader manager={manager} gameweek={gameweek} accent />
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 rounded-[10px] border border-white/10 bg-black/40 p-2">
        <SquadGrid players={top} bust={48} />
        <div className="h-px shrink-0 bg-white/[0.08]" />
        <SquadGrid players={bottom} bust={48} />
      </div>
      <p className="shrink-0 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
        form8.xyz
      </p>
    </div>
  );
}

/** X share — big result number + denser squad poster. */
function SharePoster({
  manager,
  gameweek,
  players,
}: {
  manager: LabLeaderboardRow;
  gameweek: number;
  players: readonly LabSquadPlayer[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-white/[0.18] bg-[#0a0a0a] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.5)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Form8Mark className="h-4 w-4 text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
            form8 · GW {gameweek}
          </span>
        </div>
        <span className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">
          Result
        </span>
      </div>

      <div className="flex shrink-0 items-end justify-between gap-3 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
            Rank
          </p>
          <p className="font-display text-[36px] font-black leading-none text-white">
            #{manager.rank}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
            Points
          </p>
          <p className="font-display text-[36px] font-black leading-none tabular-nums text-white">
            {manager.finalPoints}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[10px] border border-white/10 bg-[#101218] p-2">
        <SquadGrid players={players} bust={46} cols={7} />
      </div>

      <p className="mt-1.5 shrink-0 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">
        Share your XI · form8.xyz
      </p>
    </div>
  );
}

/** X share — broadcast strip: signal header + lineup rows. */
function ShareBroadcast({
  manager,
  gameweek,
  players,
}: {
  manager: LabLeaderboardRow;
  gameweek: number;
  players: readonly LabSquadPlayer[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-white/12 bg-[#0c0e12] shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00F948] shadow-[0_0_8px_rgba(0,249,72,0.6)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
            form8 live · GW {gameweek}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[18px] font-black text-white">
            #{manager.rank}
          </span>
          <span className="text-[14px] font-semibold tabular-nums text-white/80">
            {manager.finalPoints} pts
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-1.5">
        {players.map((p) => {
          const kit = p.teamId ? pl2627HomeKit(p.teamId) : null;
          const pos = p.isStarter === false ? "SUB" : playerPositionLabel(p);
          return (
            <div
              key={p.name}
              className="flex items-center gap-2 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-1.5 py-1"
            >
              <PitchChipCutout
                player={{
                  name: p.name,
                  team: kit?.club ?? null,
                  teamId: p.teamId,
                  photo: p.photo,
                  fplPhotoCode: p.fplPhotoCode,
                  apiId: p.apiId,
                }}
                name={p.name}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold uppercase leading-tight text-white">
                  {surname(p.name)}
                </p>
                <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-white/40">
                  {pos} · {clubShort(p)}
                </p>
              </div>
              <span className="shrink-0 font-display text-[16px] font-black tabular-nums text-white">
                {p.pts}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-3 py-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
          Your result
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
          form8.xyz
        </span>
      </div>
    </div>
  );
}

export function YouShareResultCard({
  variant,
  manager,
  gameweek,
  top,
  bottom,
}: {
  variant: YouXiVariantId;
  manager: LabLeaderboardRow;
  gameweek: number;
  top: readonly LabSquadPlayer[];
  bottom: readonly LabSquadPlayer[];
}) {
  const all = [...top, ...bottom];
  void all;
  void variant;

  return (
    <SharePitch
      manager={manager}
      gameweek={gameweek}
      top={top}
      bottom={bottom}
    />
  );
}
