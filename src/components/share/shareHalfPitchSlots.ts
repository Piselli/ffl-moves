import {
  DEFAULT_FORMATION,
  PITCH_SLOT_LAYOUTS,
  getFormation,
  type FormationId,
} from "@/lib/formation";

const FWD_ROW_TOP = 18;
const MID_ROW_TOP = 43;
const DEF_ROW_TOP = 67;
const ROW_TOL = 3;

function fwdLeftAnchors(formationId: FormationId): number[] {
  const slots =
    PITCH_SLOT_LAYOUTS[formationId] ?? PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION];
  return slots
    .filter((s) => Math.abs(s.topPct - FWD_ROW_TOP) <= ROW_TOL)
    .map((s) => s.leftPct)
    .sort((a, b) => a - b);
}

function rowLeftAnchors(formationId: FormationId, rowTop: number): number[] {
  const slots =
    PITCH_SLOT_LAYOUTS[formationId] ?? PITCH_SLOT_LAYOUTS[DEFAULT_FORMATION];
  return slots
    .filter((s) => Math.abs(s.topPct - rowTop) <= ROW_TOL)
    .map((s) => s.leftPct)
    .sort((a, b) => a - b);
}

/** Share half-pitch row alignment — 4-3-3 MID and 3-4-3 DEF match FWD width. */
function alignShareRowLeft(
  leftPct: number,
  topPct: number,
  formationId: FormationId,
): number {
  const { DEF, MID } = getFormation(formationId);
  const fwd = fwdLeftAnchors(formationId);
  if (fwd.length !== 3) return leftPct;

  if (DEF === 4 && MID === 3 && Math.abs(topPct - MID_ROW_TOP) <= ROW_TOL) {
    const row = rowLeftAnchors(formationId, MID_ROW_TOP);
    const idx = row.indexOf(leftPct);
    if (idx >= 0 && idx < fwd.length) return fwd[idx]!;
  }

  if (DEF === 3 && MID === 4 && Math.abs(topPct - DEF_ROW_TOP) <= ROW_TOL) {
    const row = rowLeftAnchors(formationId, DEF_ROW_TOP);
    const idx = row.indexOf(leftPct);
    if (idx >= 0 && idx < fwd.length) return fwd[idx]!;
  }

  return leftPct;
}

/** Same left remap as ShareHalfPitchBoard.halfSlot — with share row alignment. */
export function shareHalfPitchLeftPct(
  leftPct: number,
  topPct: number,
  formationId: FormationId = DEFAULT_FORMATION,
): number {
  const aligned = alignShareRowLeft(leftPct, topPct, formationId);
  const left = 4 + (aligned / 100) * 92;
  return Math.min(93, Math.max(7, left));
}
