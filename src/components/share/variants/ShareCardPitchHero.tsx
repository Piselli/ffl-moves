"use client";

import { Form8Lockup } from "@/components/Form8Mark";
import { SharePitchChip } from "@/components/share/SharePitchChip";
import { SharePitchBoard } from "@/components/share/SharePitchBoard";
import {
  ShareCardLockedPill,
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import { shareFormationLabel } from "@/components/share/ShareSquadListVariants";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  PITCH_ASPECT,
  SQUAD_SHARE_CARD_HEIGHT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";
import type { Player } from "@/lib/types";

const INSET_X = 28;
const INSET_Y = 22;
const GAP = 20;
const LEFT_W = 268;
const BENCH_H = 92;

/**
 * A — Pitch hero
 * Identity chrome left · large night-turf + bench · no XI list (no photo dupe).
 */
export function ShareCardPitchHero({
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

  const colH = SQUAD_SHARE_CARD_HEIGHT - INSET_Y * 2;
  const pitchOuterH = hasBench ? colH - BENCH_H - 10 : colH;
  const pitchH = pitchOuterH;
  const pitchW = Math.round(pitchH * PITCH_ASPECT);

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
        <aside
          className="flex shrink-0 flex-col"
          style={{ width: LEFT_W, height: colH }}
        >
          <Form8Lockup
            markClassName="h-[22px]"
            wordmarkClassName="text-[13px] tracking-[0.1em] text-white/85"
            priority
          />

          <div className="mt-10">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/34">
              My squad
            </p>
            <p
              className="mt-2 truncate text-[40px] font-extrabold leading-none tracking-[-0.03em] text-white"
              style={{
                fontFamily: typeface.display,
                letterSpacing: typeface.displayTracking,
              }}
            >
              {managerLabel}
            </p>
            <div className="mt-5">
              <ShareCardLockedPill label={lockedLabel} />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">
              {tourLabel}
              <span className="mx-2 text-white/18">/</span>
              <span className="font-mono tracking-[0.08em] text-white/58">
                {formation}
              </span>
            </p>
          </div>

          <p className="mt-auto font-mono text-[9px] uppercase tracking-[0.2em] text-white/22">
            {siteUrl}
          </p>
        </aside>

        <div
          className="flex min-w-0 flex-1 items-stretch justify-center"
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
                <div className="flex items-end justify-center gap-2.5 pb-0.5">
                  {benchThree.map((p) => (
                    <SharePitchChip key={p.id} player={p} compact />
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
