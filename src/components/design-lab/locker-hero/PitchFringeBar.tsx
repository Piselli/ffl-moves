"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { FormationPicker } from "@/components/FormationPicker";
import type { FormationId } from "@/lib/formation";
import { GlassPanel } from "./GlassPanel";
import { PitchStylePicker } from "./PitchStylePicker";
import type { PitchStyleId } from "./pitchStyles";
import type { LastGwPreview } from "./useLastGwPreview";

const DISPLAY: CSSProperties = {
  fontFamily: "var(--lt-font-display)",
  letterSpacing: "var(--lt-display-tracking)",
};

/** Matches FormationPicker / PitchStylePicker fringe chrome. */
const FRINGE_PLATE =
  "inline-flex items-center rounded-full border border-white/15 bg-black/45 backdrop-blur-sm";

/** Same backplate as PickHelpOverlay / Login modal. */
const HINT_BACKPLATE = "rounded-xl bg-[#080a0e] p-px shadow-[0_0_0_1px_rgba(255,255,255,0.08)]";

type Copy = {
  lastGwTooltip: string;
  lastGwLabel: (n: number) => string;
  lastGwSampleLabel: string;
  lastGwPartial: (picked: number) => string;
  lastGwPickCaptain: string;
};

type Props = {
  formationId: FormationId;
  onFormationChange?: (id: FormationId) => void;
  pitchStyleId: PitchStyleId;
  onPitchStyleChange?: (id: PitchStyleId) => void;
  lastGw: LastGwPreview;
  copy: Copy;
  needCaptain: boolean;
};

/**
 * Bottom grass fringe — formation (left) · last-GW (centre) · turf (right).
 */
export function PitchFringeBar({
  formationId,
  onFormationChange,
  pitchStyleId,
  onPitchStyleChange,
  lastGw,
  copy,
  needCaptain,
}: Props) {
  const showLastGw = lastGw.starterCount > 0;
  if (!onFormationChange && !onPitchStyleChange && !showLastGw) return null;

  const gwLabel =
    lastGw.source === "live" && lastGw.gwId != null
      ? copy.lastGwLabel(lastGw.gwId)
      : copy.lastGwSampleLabel;
  const hint = needCaptain
    ? copy.lastGwPickCaptain
    : lastGw.starterCount < 11
      ? copy.lastGwPartial(lastGw.starterCount)
      : null;
  const total = lastGw.ready ? lastGw.total : "—";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0.5 z-20 px-2 md:px-2.5">
      <div className="relative flex items-center justify-between">
        <div className="pointer-events-auto flex min-w-0 shrink-0 items-center">
          {onFormationChange ? (
            <FormationPicker
              value={formationId}
              onChange={onFormationChange}
              size="xs"
            />
          ) : null}
        </div>

        {showLastGw ? (
          <div className="group/score pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              tabIndex={0}
              aria-describedby="last-gw-hint"
              className={cn(
                FRINGE_PLATE,
                "max-w-[min(11rem,46vw)] items-center gap-1 px-2 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:max-w-[13rem] md:gap-1.5 md:px-2.5 md:py-1",
              )}
            >
              <span className="truncate text-[8px] font-semibold text-white/50 md:text-[9px]">
                {gwLabel}
              </span>
              <span className="text-[8px] text-white/25" aria-hidden>
                ·
              </span>
              <span
                className="shrink-0 text-[11px] font-black tabular-nums leading-none text-white md:text-[12px]"
                style={DISPLAY}
              >
                {total}
              </span>
              {hint ? (
                <>
                  <span className="hidden text-[8px] text-white/25 sm:inline" aria-hidden>
                    ·
                  </span>
                  <span className="hidden truncate text-[8px] font-semibold text-white/40 sm:inline">
                    {hint}
                  </span>
                </>
              ) : null}
            </div>

            <div
              id="last-gw-hint"
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-50 hidden w-max max-w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 pb-2 group-hover/score:block group-focus-within/score:block"
            >
              <div className={HINT_BACKPLATE}>
                <GlassPanel crystal className="!rounded-xl px-3 py-2">
                  <p className="whitespace-nowrap text-[10px] font-medium leading-none text-white/90">
                    {copy.lastGwTooltip}
                  </p>
                </GlassPanel>
              </div>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-auto shrink-0">
          {onPitchStyleChange ? (
            <PitchStylePicker
              value={pitchStyleId}
              onChange={onPitchStyleChange}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
