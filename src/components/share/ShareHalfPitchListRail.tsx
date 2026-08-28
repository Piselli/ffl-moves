"use client";

import {
  shareClubFooterColors,
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";
import {
  SHARE_SOFT_PANEL,
  SHARE_TABLET_PANEL,
} from "@/components/share/shareCardPanels";
import {
  formationLanes,
  slotPosition,
  type FormationId,
} from "@/lib/formation";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ShareListPanelStyle = "tablet" | "soft";
export type ShareListRowStyle = "kit" | "glass";

export function ShareHalfPitchListRail({
  starters,
  bench,
  tourLabel,
  formationId,
  height,
  width,
  panelStyle = "tablet",
  rowStyle = "kit",
  embedded = false,
}: {
  starters: Player[];
  bench: Player[];
  tourLabel: string;
  formationId?: FormationId;
  height: number;
  width: number;
  panelStyle?: ShareListPanelStyle;
  /** glass = minimal POS · name · club text */
  rowStyle?: ShareListRowStyle;
  /** Inside a parent soft plaque — no nested panel chrome */
  embedded?: boolean;
}) {
  const benchThree = bench.slice(0, 3);
  const hasBench = benchThree.length > 0;
  const xiOrdered = orderedStarters(starters, formationId);
  const panel =
    panelStyle === "tablet" ? SHARE_TABLET_PANEL : SHARE_SOFT_PANEL;
  const headerBorder =
    panelStyle === "tablet" ? "border-white/20" : "border-white/10";

  if (embedded) {
    return (
      <aside
        className="flex min-h-0 shrink-0 flex-col"
        style={{ width, height }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 px-1 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
              Starting XI
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/32">
              {tourLabel}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-between px-0.5 pb-2">
            {xiOrdered.map((player, i) => {
              const pos = formationId
                ? slotPosition(starterIndexOf(starters, player), formationId)
                : player.position;
              return (
                <KitRow
                  key={`${player.id}-${i}`}
                  player={player}
                  pos={pos}
                  rowStyle={rowStyle}
                />
              );
            })}
          </div>
        </div>

        {hasBench ? (
          <div className="shrink-0 pt-2">
            <div className="px-1 py-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                Substitutes
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-0.5 py-2">
              {benchThree.map((player) => (
                <KitRow
                  key={player.id}
                  player={player}
                  pos="SUB"
                  rowStyle={rowStyle}
                />
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      className="flex shrink-0 flex-col gap-2.5"
      style={{ width, height }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]"
        style={panel}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2",
            headerBorder,
          )}
        >
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.16em]",
              panelStyle === "tablet" ? "text-white/55" : "text-white/48",
            )}
          >
            Starting XI
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/32">
            {tourLabel}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between px-2.5 py-2">
          {xiOrdered.map((player, i) => {
            const pos = formationId
              ? slotPosition(starterIndexOf(starters, player), formationId)
              : player.position;
            return (
              <KitRow
                key={`${player.id}-${i}`}
                player={player}
                pos={pos}
                rowStyle={rowStyle}
              />
            );
          })}
        </div>
      </div>

      {hasBench ? (
        <div
          className="shrink-0 overflow-hidden rounded-[16px]"
          style={panel}
        >
          <div className={cn("border-b px-3 py-2", headerBorder)}>
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.16em]",
                panelStyle === "tablet" ? "text-white/55" : "text-white/48",
              )}
            >
              Substitutes
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-2.5 py-2">
            {benchThree.map((player) => (
              <KitRow
                key={player.id}
                player={player}
                pos="SUB"
                rowStyle={rowStyle}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function KitRow({
  player,
  pos,
  rowStyle,
}: {
  player: Player;
  pos: string;
  rowStyle: ShareListRowStyle;
}) {
  const surname = sharePlayerSurname(player);
  const club = shareClubShort(player);

  if (rowStyle === "glass") {
    return (
      <div className="flex items-baseline gap-2 py-[2px]">
        <span className="w-7 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-white/32">
          {pos}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em] text-white">
          {surname}
        </span>
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.12em] text-white/38">
          {club}
        </span>
      </div>
    );
  }

  const kit = player.teamId
    ? shareClubFooterColors(player.teamId)
    : { bg: "#444", fg: "#fff" };

  return (
    <div className="flex items-center gap-2 py-[2px]">
      <span
        className="h-2.5 w-[3px] shrink-0 rounded-full"
        style={{ background: kit.bg }}
        aria-hidden
      />
      <span className="w-7 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-white/32">
        {pos}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold uppercase tracking-[0.02em] text-white">
        {surname}
      </span>
      <span
        className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]"
        style={{ background: kit.bg, color: kit.fg }}
      >
        {club}
      </span>
    </div>
  );
}

function orderedStarters(starters: Player[], formationId?: FormationId) {
  if (!formationId) return starters;
  return [...formationLanes(formationId)]
    .reverse()
    .flatMap(({ slice }) => starters.slice(slice[0], slice[1]));
}

function starterIndexOf(starters: Player[], player: Player): number {
  const idx = starters.findIndex((s) => s.id === player.id);
  return idx >= 0 ? idx : 0;
}
