/**
 * Pitch chip surname face — IBM Plex on locker · Inter on share plates.
 * Uses CSS vars from root layout (no next/font here — avoids flaky Google
 * font fetches during Vercel production builds).
 */

export type PitchChipFontId = "ibm-plex" | "inter";

export type PitchChipFont = {
  id: PitchChipFontId;
  name: string;
  tagline: string;
  family: string;
  weight: number;
  tracking: string;
};

export const PITCH_CHIP_FONT: PitchChipFont = {
  id: "ibm-plex",
  name: "IBM Plex Sans",
  tagline: "Sharp technical UI",
  family: "\"IBM Plex Sans\", var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  weight: 600,
  tracking: "-0.01em",
};

export const SHARE_PITCH_CHIP_FONT: PitchChipFont = {
  id: "inter",
  name: "Inter",
  tagline: "Share card plates",
  family: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
  weight: 700,
  tracking: "-0.02em",
};

/** @deprecated use PITCH_CHIP_FONT — kept for any leftover map callers */
export const PITCH_CHIP_FONTS: readonly PitchChipFont[] = [
  PITCH_CHIP_FONT,
  SHARE_PITCH_CHIP_FONT,
];

export const DEFAULT_PITCH_CHIP_FONT: PitchChipFontId = "ibm-plex";

export function getPitchChipFont(_id?: PitchChipFontId): PitchChipFont {
  return PITCH_CHIP_FONT;
}

export function getSharePitchChipFont(): PitchChipFont {
  return SHARE_PITCH_CHIP_FONT;
}
