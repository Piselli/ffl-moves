"use client";

import { Form8Lockup } from "@/components/Form8Mark";
import {
  ShareCardShell,
} from "@/components/share/ShareCardShell";
import { ShareHalfPitchBezel } from "@/components/share/ShareHalfPitchBezel";
import type { SharePitchFrameStyle } from "@/components/share/ShareHalfPitchBezel";
import { ShareHalfPitchListRail } from "@/components/share/ShareHalfPitchListRail";
import {
  ShareHalfPitchUnifiedPanel,
  type UnifiedPitchOrder,
} from "@/components/share/ShareHalfPitchUnifiedPanel";
import { shareFormationLabel } from "@/components/share/ShareSquadListVariants";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  type SquadShareCardProps,
} from "@/components/share/shareCardTypes";

/** Site display + UI — Oswald hero · Inter supporting (layout.tsx vars). */
const SHARE_DISPLAY = "var(--font-display), sans-serif";
const SHARE_UI = "var(--font-inter), sans-serif";

const INSET_X = 28;
const INSET_Y = 22;
const GAP = 18;
const LEFT_W = 280;
const LIST_W = 260;

export type ClassicPitchPlacement = "right" | "center";

/**
 * Locker locked-share composition:
 * black canvas · glass plaques · soft list · pitch bezel underlay.
 */
export function ShareCardHalfPitchClassic({
  starters,
  bench = [],
  tourLabel,
  managerLabel,
  headline,
  siteUrl = "form8.app",
  formationId,
  className,
  captainIndex,
  pitchPlacement = "right",
  listPanel = "soft",
  listRowStyle = "glass",
  chipMode = "glass",
  pitchFrameStyle = "none",
  mutedPlateStyle = "site",
  unifiedPanel = false,
}: SquadShareCardProps & {
  /** right = list mid · pitch far right · center = pitch mid · list far right */
  pitchPlacement?: ClassicPitchPlacement;
  listPanel?: "tablet" | "soft";
  /** glass = minimal POS · name · club */
  listRowStyle?: "kit" | "glass";
  /** chips = site bust cutouts · chips-muted = softer share cutouts · glass = frosted plaques */
  chipMode?: "chips" | "chips-muted" | "glass";
  pitchFrameStyle?: SharePitchFrameStyle;
  mutedPlateStyle?: "site" | "dark" | "white";
  unifiedPanel?: boolean;
}) {
  const formation = shareFormationLabel(formationId);
  const lineupTag = headline.replace(/\.$/, "");

  const colH = SQUAD_SHARE_CARD_HEIGHT - INSET_Y * 2;
  const unifiedW = 1200 - INSET_X * 2 - LEFT_W - GAP;
  const maxPitchOuterW =
    1200 - INSET_X * 2 - LEFT_W - LIST_W - GAP * 2;

  const unifiedOrder: UnifiedPitchOrder =
    pitchPlacement === "center" ? "pitch-first" : "list-first";

  const unifiedNode = (
    <ShareHalfPitchUnifiedPanel
      starters={starters}
      bench={bench}
      tourLabel={tourLabel}
      formationId={formationId}
      colH={colH}
      colW={unifiedW}
      order={unifiedOrder}
      rowStyle={listRowStyle}
      chipMode={chipMode}
      mutedPlateStyle={mutedPlateStyle}
      captainIndex={captainIndex}
    />
  );

  const listRail = (
    <ShareHalfPitchListRail
      starters={starters}
      bench={bench}
      tourLabel={tourLabel}
      formationId={formationId}
      height={colH}
      width={LIST_W}
      panelStyle={listPanel}
      rowStyle={listRowStyle}
      captainIndex={captainIndex}
    />
  );

  const pitchBezel = (
    <ShareHalfPitchBezel
      starters={starters}
      formationId={formationId}
      colH={colH}
      maxOuterW={maxPitchOuterW}
      chipMode={chipMode}
      pitchStyleId="night-turf"
      align={pitchPlacement === "right" ? "end" : "center"}
      frameStyle={pitchFrameStyle}
      mutedPlateStyle={mutedPlateStyle}
      captainIndex={captainIndex}
    />
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
        <aside
          className="flex shrink-0 flex-col justify-between"
          style={{ width: LEFT_W, height: colH }}
        >
          <Form8Lockup
            markClassName="h-[26px]"
            wordmarkClassName="text-[15px] tracking-[0.1em] text-white/88"
            priority
          />

          <div className="min-w-0 pr-1">
            <p
              className="truncate pb-0.5 text-[42px] font-black leading-[1.08] tracking-[-0.03em] text-white"
              style={{ fontFamily: SHARE_DISPLAY }}
              title={managerLabel}
            >
              {managerLabel}
            </p>
            <p
              className="mt-2.5 text-[21px] font-semibold lowercase leading-snug tracking-[-0.01em] text-white/68"
              style={{ fontFamily: SHARE_UI }}
            >
              {lineupTag}
            </p>
          </div>

          <div>
            <p
              className="text-[26px] font-bold uppercase leading-none tracking-[-0.02em] text-white"
              style={{ fontFamily: SHARE_DISPLAY }}
            >
              {formation}
            </p>
            <p
              className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/32"
              style={{ fontFamily: SHARE_UI }}
            >
              {siteUrl}
            </p>
          </div>
        </aside>

        {unifiedPanel ? (
          unifiedNode
        ) : pitchPlacement === "center" ? (
          <>
            {pitchBezel}
            {listRail}
          </>
        ) : (
          <>
            {listRail}
            {pitchBezel}
          </>
        )}
      </div>
    </ShareCardShell>
  );
}
