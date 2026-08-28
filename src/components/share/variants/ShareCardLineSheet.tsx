"use client";

import { SharePitchBoard } from "@/components/share/SharePitchBoard";
import {
  ShareCardBrandRow,
  ShareCardLockedPill,
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import {
  ShareSquadTextListGrouped,
  shareFormationLabel,
} from "@/components/share/ShareSquadTextList";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  PITCH_ASPECT,
  SQUAD_SHARE_CARD_HEIGHT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";

const BODY_H = SQUAD_SHARE_CARD_HEIGHT;
const LEFT_W = 560;
const PITCH_W = 368;

/**
 * Variant A — Line Sheet
 * Text XI is primary (FPL Graphic Maker / team-sheet pattern).
 * Pitch is decorative atmosphere — tactical dots, no busts at thumbnail size.
 */
export function ShareCardLineSheet({
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
  const pitchH = Math.min(BODY_H - 48, PITCH_W / PITCH_ASPECT);

  return (
    <ShareCardShell className={className}>
      <div className="flex h-full">
        {/* Identity + readable XI */}
        <div
          className="flex shrink-0 flex-col justify-between px-10 py-9"
          style={{ width: LEFT_W }}
        >
          <ShareCardBrandRow />

          <div className="min-w-0 py-3">
            <p
              className="text-[42px] font-extrabold uppercase leading-[0.92] tracking-[-0.03em] text-white"
              style={{
                fontFamily: typeface.display,
                letterSpacing: typeface.displayTracking,
              }}
            >
              {headline}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-white/82">
                {managerLabel}
              </p>
              <span className="text-white/18">|</span>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                {tourLabel}
              </p>
              <span className="text-white/18">|</span>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/32">
                {shareFormationLabel(formationId)}
              </p>
            </div>
            <div className="mt-4">
              <ShareCardLockedPill label={lockedLabel} />
            </div>
          </div>

          <ShareSquadTextListGrouped
            starters={starters}
            formationId={formationId}
            dense
            className="max-h-[250px] overflow-hidden"
          />

          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/22">
            {siteUrl}
          </p>
        </div>

        {/* Hard split · portrait pitch panel */}
        <div
          className="relative flex flex-1 items-center justify-center border-l border-white/[0.08] bg-[#070809]"
        >
          <div
            className="relative overflow-hidden rounded-[14px]"
            style={{
              width: PITCH_W,
              height: pitchH,
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.12), 0 20px 48px rgba(0,0,0,0.55)",
            }}
          >
            <SharePitchBoard
              starters={starters}
              formationId={formationId}
              mode="dots"
              noVignette
              compact
              className="h-full w-full rounded-[14px]"
            />
          </div>
        </div>
      </div>
    </ShareCardShell>
  );
}
