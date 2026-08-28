import { getPitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
import {
  fitPitchName,
  textWidthPx,
} from "@/components/design-lab/locker-hero/pitchChipName";
import type { SharePitchChipSize } from "@/components/share/SharePitchChip";
import { sharePlayerSurname } from "@/components/share/sharePitchKit";
import {
  DEFAULT_FORMATION,
  PITCH_SLOT_LAYOUTS,
  inferFormationFromPositions,
  type FormationId,
} from "@/lib/formation";
import type { Player } from "@/lib/types";

const PLATE_GAP_PX = 10;

const SIZE: Record<
  SharePitchChipSize,
  {
    maxNameSize: number;
    preferMin: number;
    plateH: number;
    platePadX: number;
    absMaxPlateW: number;
  }
> = {
  sm: {
    maxNameSize: 10.5,
    preferMin: 9,
    plateH: 18,
    platePadX: 5,
    absMaxPlateW: 64,
  },
  md: {
    maxNameSize: 12,
    preferMin: 10,
    plateH: 20,
    platePadX: 6,
    absMaxPlateW: 72,
  },
  lg: {
    maxNameSize: 14.5,
    preferMin: 12.5,
    plateH: 26,
    platePadX: 7,
    absMaxPlateW: 88,
  },
};

function trackingEm(tracking: string): number {
  const t = tracking.trim();
  if (!t || t === "0" || t === "normal") return 0;
  if (t.endsWith("em")) return Number.parseFloat(t) || 0;
  return 0;
}

/** Same remap as ShareHalfPitchBoard.halfSlot — left edge %. */
function halfSlotLeftPct(leftPct: number): number {
  const left = 4 + (leftPct / 100) * 92;
  return Math.min(93, Math.max(7, left));
}

function minRowSpacingPct(formationId: FormationId): number {
  const slots =
    PITCH_SLOT_LAYOUTS[formationId] ?? PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION];
  let minSpacing = 100;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (Math.abs(a.topPct - b.topPct) > 6) continue;
      const gap = Math.abs(
        halfSlotLeftPct(a.leftPct) - halfSlotLeftPct(b.leftPct),
      );
      if (gap > 0) minSpacing = Math.min(minSpacing, gap);
    }
  }
  return minSpacing;
}

export type UniformMutedPlateMetrics = {
  plateW: number;
  plateH: number;
  platePadX: number;
  fontSize: number;
  labels: Record<number, string>;
};

export function computeUniformMutedPlateMetrics(
  starters: Player[],
  chipSize: SharePitchChipSize,
  opts?: { pitchWidthPx?: number; formationId?: FormationId },
): UniformMutedPlateMetrics {
  const s = SIZE[chipSize];
  const font = getPitchChipFont();
  const track = trackingEm(font.tracking);
  const formationId =
    opts?.formationId ??
    inferFormationFromPositions(starters.map((p) => p.positionId));

  const pitchW = opts?.pitchWidthPx ?? 568;
  const rowSpacingPct = minRowSpacingPct(formationId);
  const safeFromPitch = Math.floor(
    (rowSpacingPct / 100) * pitchW - PLATE_GAP_PX,
  );
  const maxPlateW = Math.max(
    48,
    Math.min(s.absMaxPlateW, safeFromPitch),
  );
  const maxTextW = maxPlateW - s.platePadX * 2;

  const entries = starters.map((player) => {
    const surname = sharePlayerSurname(player);
    const { label } = fitPitchName(surname, {
      widthPx: maxTextW,
      fontFamily: font.family,
      weight: font.weight,
      letterSpacing: font.tracking,
      fixedSize: s.maxNameSize,
      allowAbbreviate: false,
    });
    const widthAtMax = textWidthPx(
      label,
      `${font.weight} ${s.maxNameSize}px ${font.family}`,
      track,
      s.maxNameSize,
    );
    return { id: player.id, surname, label, widthAtMax };
  });

  const widestAtMax = Math.max(0, ...entries.map((e) => e.widthAtMax));
  const idealPlateW = Math.ceil(widestAtMax) + s.platePadX * 2;
  const plateW = Math.min(maxPlateW, idealPlateW);
  const textInnerW = plateW - s.platePadX * 2;

  let uniformFontSize = s.maxNameSize;
  const labels: Record<number, string> = {};

  for (const entry of entries) {
    const { label, fontSize } = fitPitchName(entry.surname, {
      widthPx: textInnerW,
      fontFamily: font.family,
      weight: font.weight,
      letterSpacing: font.tracking,
      maxSize: s.maxNameSize,
      preferMin: s.preferMin,
      allowAbbreviate: false,
    });
    labels[entry.id] = label;
    uniformFontSize = Math.min(uniformFontSize, fontSize);
  }

  return {
    plateW,
    plateH: s.plateH,
    platePadX: s.platePadX,
    fontSize: uniformFontSize,
    labels,
  };
}
