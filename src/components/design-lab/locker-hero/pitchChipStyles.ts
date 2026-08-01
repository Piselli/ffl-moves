/**
 * Pitch chips — locked to pos·plate (cutout + name + club bar).
 */

export type PitchChipStyleId = "pos-plate";

export type PitchChipStyle = {
  id: PitchChipStyleId;
  name: string;
  tagline: string;
  swatch: string;
  group: "stack";
};

export const DEFAULT_PITCH_CHIP_STYLE: PitchChipStyleId = "pos-plate";

export const PITCH_CHIP_STYLES: readonly PitchChipStyle[] = [
  {
    id: "pos-plate",
    name: "Pos · plate",
    tagline: "Cutout photo · white name + club bar",
    swatch: "#e8e8e8",
    group: "stack",
  },
];

export function getPitchChipStyle(_id?: PitchChipStyleId): PitchChipStyle {
  return PITCH_CHIP_STYLES[0]!;
}
