"use client";

import { Form8Lockup } from "@/components/Form8Mark";
import {
  ShareHalfPitchBoard,
  HALF_PITCH_ASPECT,
} from "@/components/share/ShareHalfPitchBoard";
import {
  ShareCardLockedPill,
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import { shareFormationLabel } from "@/components/share/ShareSquadListVariants";
import {
  shareClubFooterColors,
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import type { PitchStyleId } from "@/components/design-lab/locker-hero/pitchStyles";
import {
  formationLanes,
  slotPosition,
  type FormationId,
} from "@/lib/formation";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

const INSET_X = 24;
const INSET_Y = 18;
const GAP = 14;
const LEFT_W = 240;
const LIST_W = 260;

/** Obsidian tablet panel — matches locker `--lt-panel` / ring. */
const TABLET_PANEL = {
  background: "#000000",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 1px rgba(255,255,255,0.55), 0 12px 32px rgba(0,0,0,0.55)",
} as const;

export type HalfPitchListStyle = "kit" | "glass";
export type HalfPitchSide = "center" | "right";

/**
 * Half-pitch share card (tablet black canvas):
 * left meta (no boxes) · pitch + list (swappable) · XI/subs tablet panels.
 */
export function ShareCardHalfPitch({
  starters,
  bench = [],
  tourLabel,
  managerLabel,
  lockedLabel,
  siteUrl = "movematch.xyz",
  formationId,
  className,
  listStyle = "kit",
  pitchSide = "center",
  pitchStyleId = "night-turf",
}: SquadShareCardProps & {
  bench?: Player[];
  listStyle?: HalfPitchListStyle;
  /** center = pitch mid · right = pitch on the right (list mid) */
  pitchSide?: HalfPitchSide;
  pitchStyleId?: PitchStyleId;
}) {
  const typeface = getTypeface();
  const formation = shareFormationLabel(formationId);
  const benchThree = bench.slice(0, 3);
  const hasBench = benchThree.length > 0;
  const xiOrdered = orderedStarters(starters, formationId);

  const colH = SQUAD_SHARE_CARD_HEIGHT - INSET_Y * 2;
  const maxPitchW = 1200 - INSET_X * 2 - LEFT_W - LIST_W - GAP * 2;
  const pitchH = colH;
  const pitchW = Math.min(Math.round(pitchH * HALF_PITCH_ASPECT), maxPitchW);

  const pitchNode = (
    <div
      className="flex min-w-0 flex-1 items-stretch justify-center"
      style={{ height: colH }}
    >
      <div
        className="relative overflow-hidden rounded-[16px]"
        style={{
          width: pitchW,
          height: pitchH,
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.18), 0 16px 40px rgba(0,0,0,0.65)",
        }}
      >
        <ShareHalfPitchBoard
          starters={starters}
          formationId={formationId}
          chipSize="lg"
          pitchStyleId={pitchStyleId}
          className="h-full w-full rounded-[16px]"
          style={{ boxShadow: "none" }}
        />
      </div>
    </div>
  );

  const listNode = (
    <aside
      className="flex shrink-0 flex-col gap-2.5"
      style={{ width: LIST_W, height: colH }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]"
        style={TABLET_PANEL}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/20 px-3 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
            Starting XI
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
            {tourLabel}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-between px-2.5 py-2">
          {xiOrdered.map((player, i) => {
            const pos = formationId
              ? slotPosition(starterIndexOf(starters, player), formationId)
              : player.position;
            return (
              <ListRow
                key={`${player.id}-${i}`}
                player={player}
                pos={pos}
                tone={listStyle}
              />
            );
          })}
        </div>
      </div>

      {hasBench ? (
        <div
          className="shrink-0 overflow-hidden rounded-[16px]"
          style={TABLET_PANEL}
        >
          <div className="border-b border-white/20 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
              Substitutes
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-2.5 py-2">
            {benchThree.map((player) => (
              <ListRow
                key={player.id}
                player={player}
                pos="SUB"
                tone={listStyle}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );

  return (
    <ShareCardShell className={className} surface="tablet">
      <div
        className="relative flex h-full w-full items-stretch"
        style={{
          paddingLeft: INSET_X,
          paddingRight: INSET_X,
          paddingTop: INSET_Y,
          paddingBottom: INSET_Y,
          gap: GAP,
        }}
      >
        {/* LEFT — evenly spaced meta, no plaques */}
        <aside
          className="flex shrink-0 flex-col justify-between"
          style={{ width: LEFT_W, height: colH }}
        >
          <Form8Lockup
            markClassName="h-[20px]"
            wordmarkClassName="text-[12px] tracking-[0.1em] text-white/85"
            priority
          />

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/34">
              My squad
            </p>
            <p
              className="mt-1.5 truncate text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white"
              style={{
                fontFamily: typeface.display,
                letterSpacing: typeface.displayTracking,
              }}
            >
              {managerLabel}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ShareCardLockedPill label={lockedLabel} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                {tourLabel}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/32">
              Formation
            </p>
            <p
              className="mt-1.5 text-[28px] font-extrabold leading-none tracking-[-0.02em] text-white"
              style={{ fontFamily: typeface.display }}
            >
              {formation}
            </p>
          </div>

          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/32">
              Status
            </p>
            <p className="mt-1.5 text-[15px] font-bold leading-tight text-white/88">
              Squad locked
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/38">
              {tourLabel}
            </p>
          </div>

          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/22">
            {siteUrl}
          </p>
        </aside>

        {pitchSide === "right" ? (
          <>
            {listNode}
            {pitchNode}
          </>
        ) : (
          <>
            {pitchNode}
            {listNode}
          </>
        )}
      </div>
    </ShareCardShell>
  );
}

function ListRow({
  player,
  pos,
  tone,
}: {
  player: Player;
  pos: string;
  tone: HalfPitchListStyle;
}) {
  const kit = player.teamId
    ? shareClubFooterColors(player.teamId)
    : { bg: "#444", fg: "#fff" };
  const surname = sharePlayerSurname(player);
  const club = shareClubShort(player);

  if (tone === "glass") {
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
        className={cn(
          "shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
        )}
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
