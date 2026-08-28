"use client";

import { Form8Lockup } from "@/components/Form8Mark";
import { SharePitchBoard } from "@/components/share/SharePitchBoard";
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

const INSET_X = 26;
const INSET_Y = 20;
const GAP = 18;
const SHEET_W = 340;
const BENCH_H = 72;

/**
 * B — Team sheet hero
 * Dense text XI + subs (kit tick, no faces) · pitch for formation (photos once).
 */
export function ShareCardTeamSheet({
  starters,
  bench = [],
  tourLabel,
  managerLabel,
  lockedLabel,
  siteUrl = "movematch.xyz",
  formationId,
  className,
}: SquadShareCardProps & { bench?: Player[] }) {
  const typeface = getTypeface();
  const formation = shareFormationLabel(formationId);
  const benchThree = bench.slice(0, 3);
  const hasBench = benchThree.length > 0;
  const xiOrdered = orderedStarters(starters, formationId);

  const colH = SQUAD_SHARE_CARD_HEIGHT - INSET_Y * 2;
  const pitchOuterH = hasBench ? colH - BENCH_H - 8 : colH;
  const pitchW = Math.round(pitchOuterH * PITCH_ASPECT);

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
        {/* LEFT — identity + text sheet */}
        <aside
          className="flex min-w-0 shrink-0 flex-col"
          style={{ width: SHEET_W, height: colH }}
        >
          <div className="flex items-start justify-between gap-3">
            <Form8Lockup
              markClassName="h-[20px]"
              wordmarkClassName="text-[12px] tracking-[0.1em] text-white/85"
              priority
            />
            <ShareCardLockedPill label={lockedLabel} />
          </div>

          <div className="mt-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/34">
              My squad
            </p>
            <p
              className="mt-1 truncate text-[32px] font-extrabold leading-none tracking-[-0.03em] text-white"
              style={{
                fontFamily: typeface.display,
                letterSpacing: typeface.displayTracking,
              }}
            >
              {managerLabel}
            </p>
            <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {tourLabel}
              <span className="mx-2 text-white/18">/</span>
              <span className="font-mono text-white/55">{formation}</span>
            </p>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-white/10 pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
                Starting XI
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/28">
                {xiOrdered.length} players
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-between">
              {xiOrdered.map((player, i) => (
                <SheetRow
                  key={`${player.id}-${i}`}
                  player={player}
                  pos={
                    formationId
                      ? slotPosition(
                          starterIndexOf(starters, player),
                          formationId,
                        )
                      : player.position
                  }
                />
              ))}
            </div>

            {hasBench ? (
              <div className="mt-2 shrink-0 border-t border-white/10 pt-2">
                <p className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/32">
                  Subs
                </p>
                <div className="flex flex-col gap-0.5">
                  {benchThree.map((player) => (
                    <SheetRow key={player.id} player={player} pos="SUB" />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/20">
            {siteUrl}
          </p>
        </aside>

        {/* RIGHT — pitch only (photos live here) */}
        <div
          className="flex min-w-0 flex-1 items-stretch justify-end"
          style={{ height: colH }}
        >
          <div
            className="flex flex-col"
            style={{ width: pitchW, height: colH }}
          >
            <div
              className="relative overflow-hidden rounded-[16px]"
              style={{
                width: pitchW,
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
                safeInset
                className="h-full w-full rounded-[16px]"
                style={{ boxShadow: "none" }}
              />
            </div>

            {hasBench ? (
              <div
                className="mt-2 flex items-center justify-center gap-3 rounded-[12px] px-3"
                style={{
                  height: BENCH_H,
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                <p className="shrink-0 text-[8px] font-bold uppercase tracking-[0.22em] text-white/34">
                  Bench
                </p>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  {benchThree.map((p) => (
                    <span
                      key={p.id}
                      className="truncate text-[11px] font-bold uppercase tracking-[0.04em] text-white/70"
                    >
                      {sharePlayerSurname(p)}
                    </span>
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

function SheetRow({ player, pos }: { player: Player; pos: string }) {
  const kit = player.teamId
    ? shareClubFooterColors(player.teamId)
    : { bg: "#444", fg: "#fff" };

  return (
    <div className="flex items-baseline gap-2 py-[1px]">
      <span
        className="mt-[0.35em] h-2.5 w-[3px] shrink-0 rounded-full self-center"
        style={{ background: kit.bg }}
        aria-hidden
      />
      <span className="w-7 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-white/32">
        {pos}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold uppercase leading-tight tracking-[0.02em] text-white">
        {sharePlayerSurname(player)}
      </span>
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-white/36">
        {shareClubShort(player)}
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
