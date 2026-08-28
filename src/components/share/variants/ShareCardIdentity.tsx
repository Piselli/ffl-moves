"use client";

import { Form8Lockup } from "@/components/Form8Mark";
import { SharePitchBoard } from "@/components/share/SharePitchBoard";
import {
  ShareCardLockedPill,
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import { shareFormationLabel } from "@/components/share/ShareSquadListVariants";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  PITCH_ASPECT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";
import type { Player } from "@/lib/types";

/**
 * C — Identity poster (Wrapped-lite)
 * Huge manager name + Locked · pitch as secondary plaque · minimal meta.
 */
export function ShareCardIdentity({
  starters,
  tourLabel,
  managerLabel,
  lockedLabel,
  siteUrl = "movematch.xyz",
  formationId,
  className,
}: SquadShareCardProps & { bench?: Player[] }) {
  const typeface = getTypeface();
  const formation = shareFormationLabel(formationId);
  const pitchH = 420;
  const pitchW = Math.round(pitchH * PITCH_ASPECT);

  return (
    <ShareCardShell className={className}>
      <div className="relative flex h-full w-full">
        {/* Atmosphere — soft brand wash, no rainbow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 90% at 18% 55%, rgba(0,249,72,0.07) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-[1] flex w-[58%] flex-col justify-between px-10 py-9">
          <Form8Lockup
            markClassName="h-[24px]"
            wordmarkClassName="text-[14px] tracking-[0.12em] text-white/80"
            priority
          />

          <div className="max-w-[560px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/38">
              My squad
            </p>
            <p
              className="mt-3 text-[72px] font-extrabold uppercase leading-[0.88] tracking-[-0.04em] text-white"
              style={{
                fontFamily: typeface.display,
                letterSpacing: typeface.displayTracking,
              }}
            >
              {managerLabel}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ShareCardLockedPill label={lockedLabel} />
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {tourLabel}
              </span>
              <span className="font-mono text-[12px] font-semibold tracking-[0.1em] text-white/50">
                {formation}
              </span>
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/24">
            {siteUrl}
          </p>
        </div>

        <div className="relative z-[1] flex w-[42%] items-center justify-center border-l border-white/[0.07] bg-[#060708]/55 pr-8">
          <div
            className="relative overflow-hidden rounded-[18px]"
            style={{
              width: pitchW,
              height: pitchH,
              boxShadow: [
                "inset 0 0 0 1px rgba(255,255,255,0.12)",
                "0 20px 48px rgba(0,0,0,0.6)",
              ].join(", "),
            }}
          >
            <SharePitchBoard
              starters={starters}
              formationId={formationId}
              mode="chips"
              compact
              safeInset
              className="h-full w-full rounded-[18px]"
              style={{ boxShadow: "none" }}
            />
          </div>
        </div>
      </div>
    </ShareCardShell>
  );
}
