"use client";

import { SharePitchBoard } from "@/components/share/SharePitchBoard";
import {
  ShareCardBrandRow,
  ShareCardLockedPill,
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import {
  ShareSquadTextCrawl,
  shareFormationLabel,
} from "@/components/share/ShareSquadTextList";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  PITCH_ASPECT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";

const TOP_H = 64;
const BOTTOM_H = 76;
const PITCH_W = 340;

/**
 * Variant C — Broadcast
 * Matchday crawl: pitch centre, XI as typographic strip below (TeamCreator / TV pattern).
 */
export function ShareCardBroadcast({
  starters,
  tourLabel,
  managerLabel,
  headline,
  lockedLabel,
  siteUrl = "movematch.xyz",
  formationId,
  className,
}: SquadShareCardProps) {
  const typeface = getTypeface();
  const bodyH = 630 - TOP_H - BOTTOM_H;
  const pitchH = Math.min(bodyH - 16, PITCH_W / PITCH_ASPECT);

  return (
    <ShareCardShell className={className}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between border-b border-white/[0.08] px-8"
        style={{ height: TOP_H, background: "#070809" }}
      >
        <ShareCardBrandRow siteUrl={siteUrl} />
        <div className="flex items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">
            {managerLabel}
            <span className="mx-2 text-white/18">·</span>
            {tourLabel}
          </p>
          <ShareCardLockedPill label={lockedLabel} />
        </div>
      </div>

      {/* Pitch centre */}
      <div
        className="flex flex-col items-center justify-center px-8"
        style={{ height: bodyH }}
      >
        <p
          className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/32"
          style={{ fontFamily: typeface.display }}
        >
          {headline}
          <span className="mx-2 text-white/16">·</span>
          {shareFormationLabel(formationId)}
        </p>
        <div
          className="relative overflow-hidden rounded-[14px]"
          style={{
            width: PITCH_W,
            height: pitchH,
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.55)",
          }}
        >
          <SharePitchBoard
            starters={starters}
            formationId={formationId}
            mode="chips"
            noVignette
            compact
            className="h-full w-full rounded-[14px]"
          />
        </div>
      </div>

      {/* Broadcast crawl */}
      <div
        className="flex flex-col justify-center border-t border-white/[0.08] px-8"
        style={{ height: BOTTOM_H, background: "#08090a" }}
      >
        <ShareSquadTextCrawl
          starters={starters}
          formationId={formationId}
        />
      </div>
    </ShareCardShell>
  );
}
