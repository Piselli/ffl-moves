"use client";

import { Form8Lockup } from "@/components/Form8Mark";
import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { SharePitchChip } from "@/components/share/SharePitchChip";
import { SharePitchBoard } from "@/components/share/SharePitchBoard";
import {
  ShareCardLockedPill,
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import { shareFormationLabel } from "@/components/share/ShareSquadListVariants";
import {
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  formationLanes,
  slotPosition,
  type FormationId,
} from "@/lib/formation";
import {
  PITCH_ASPECT,
  SQUAD_SHARE_CARD_HEIGHT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";
import type { Player } from "@/lib/types";

const INSET_X = 28;
const INSET_Y = 20;
const GAP = 16;
const LIST_W = 252;
const PITCH_PAD = 6;
const BENCH_H = 96;
const ROW_CUTOUT = 34;

export type SharePlaqueListSide = "left" | "right";

/**
 * Site-native share card:
 * identity rail (pills, no fake boxes) · night-turf pitch + bench ·
 * broadcast cutout rows (from YouShareResultCard language).
 */
export function ShareCardPlaque({
  starters,
  bench = [],
  tourLabel,
  managerLabel,
  lockedLabel,
  siteUrl = "movematch.xyz",
  formationId,
  className,
}: SquadShareCardProps & {
  bench?: Player[];
  captainIndex?: number;
  listSide?: SharePlaqueListSide;
}) {
  const typeface = getTypeface();
  const formation = shareFormationLabel(formationId);
  const benchThree = bench.slice(0, 3);
  const hasBench = benchThree.length > 0;

  const colH = SQUAD_SHARE_CARD_HEIGHT - INSET_Y * 2;
  const pitchOuterH = hasBench ? colH - BENCH_H - 10 : colH;
  const pitchH = pitchOuterH - PITCH_PAD * 2;
  const pitchW = Math.round(pitchH * PITCH_ASPECT);
  const pitchOuterW = pitchW + PITCH_PAD * 2;

  const xiOrdered = orderedStarters(starters, formationId);

  return (
    <ShareCardShell className={className}>
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
        {/* LEFT — site header language, no AI boxes */}
        <aside
          className="flex min-w-0 flex-1 flex-col"
          style={{ height: colH }}
        >
          <Form8Lockup
            markClassName="h-[22px]"
            wordmarkClassName="text-[13px] tracking-[0.1em] text-white/85"
            priority
          />

          <div className="mt-9 max-w-[280px]">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/34">
              My squad
            </p>
            <p
              className="mt-1.5 truncate text-[36px] font-extrabold leading-none tracking-[-0.03em] text-white"
              style={{
                fontFamily: typeface.display,
                letterSpacing: typeface.displayTracking,
              }}
            >
              {managerLabel}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ShareCardLockedPill label={lockedLabel} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {tourLabel}
                <span className="mx-2 text-white/18">/</span>
                <span className="font-mono tracking-[0.08em] text-white/58">
                  {formation}
                </span>
              </p>
            </div>
          </div>

          <p className="mt-auto font-mono text-[9px] uppercase tracking-[0.2em] text-white/22">
            {siteUrl}
          </p>
        </aside>

        {/* CENTER + RIGHT */}
        <div
          className="flex shrink-0 items-stretch"
          style={{ gap: GAP, height: colH }}
        >
          <div
            className="flex shrink-0 flex-col"
            style={{ width: pitchOuterW, height: colH }}
          >
            <div
              className="relative overflow-hidden rounded-[16px]"
              style={{
                width: pitchOuterW,
                height: pitchOuterH,
                boxShadow: [
                  "inset 0 0 0 1px rgba(255,255,255,0.12)",
                  "0 16px 40px rgba(0,0,0,0.55)",
                ].join(", "),
              }}
            >
              <SharePitchBoard
                starters={starters}
                formationId={formationId}
                mode="chips"
                compact
                noVignette={false}
                className="h-full w-full rounded-[16px]"
                style={{ boxShadow: "none" }}
              />
            </div>

            {hasBench ? (
              <div
                className="mt-2.5 flex flex-col justify-center rounded-[14px] px-2.5"
                style={{
                  height: BENCH_H,
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                <p className="mb-1 text-center text-[8px] font-bold uppercase tracking-[0.26em] text-white/34">
                  {benchThree.length} substitutes
                </p>
                <div className="flex items-end justify-center gap-2 pb-0.5">
                  {benchThree.map((p) => (
                    <SharePitchChip key={p.id} player={p} compact />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT — broadcast cutout rows (site UI) */}
          <div
            className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[14px] border border-white/12 bg-[#0c0e12]"
            style={{
              width: LIST_W,
              height: colH,
              boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00F948] shadow-[0_0_8px_rgba(0,249,72,0.6)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  Starting XI
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                {tourLabel}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-between gap-px px-2 py-1.5">
              {xiOrdered.map((player, i) => (
                <BroadcastRow
                  key={`${player.id}-${i}`}
                  player={player}
                  formationId={formationId}
                  starterIndex={starterIndexOf(starters, player, formationId, i)}
                />
              ))}
            </div>

            {hasBench ? (
              <div className="shrink-0 border-t border-white/10 px-2 pb-2 pt-1">
                <p className="mb-1 px-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/32">
                  Subs
                </p>
                <div className="flex flex-col gap-px">
                  {benchThree.map((player) => (
                    <BroadcastRow key={player.id} player={player} sub />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ShareCardShell>
  );
}

function BroadcastRow({
  player,
  formationId,
  starterIndex,
  sub = false,
}: {
  player: Player;
  formationId?: FormationId;
  starterIndex?: number;
  sub?: boolean;
}) {
  const pos = sub
    ? "SUB"
    : starterIndex != null && formationId
      ? slotPosition(starterIndex, formationId)
      : player.position;

  return (
    <div className="flex items-center gap-2 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">
      <PitchChipCutout
        player={{
          name: player.name,
          webName: player.webName,
          team: player.team,
          teamId: player.teamId,
          photo: player.photo,
          fplPhotoCode: player.fplPhotoCode,
          apiId: player.apiId,
        }}
        name={player.name}
        size={ROW_CUTOUT}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold uppercase leading-tight text-white">
          {sharePlayerSurname(player)}
        </p>
        <p className="truncate text-[8px] font-semibold uppercase tracking-wider text-white/40">
          {pos} · {shareClubShort(player)}
        </p>
      </div>
    </div>
  );
}

function orderedStarters(starters: Player[], formationId?: FormationId) {
  if (!formationId) return starters;
  return [...formationLanes(formationId)]
    .reverse()
    .flatMap(({ slice }) => starters.slice(slice[0], slice[1]));
}

/** Map ordered display row back to formation slot index for POS label. */
function starterIndexOf(
  starters: Player[],
  player: Player,
  formationId: FormationId | undefined,
  fallback: number,
): number {
  const idx = starters.findIndex((s) => s.id === player.id);
  return idx >= 0 ? idx : fallback;
}
