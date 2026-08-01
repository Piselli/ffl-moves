/**
 * Pitch chip surname face — locked to IBM Plex Sans.
 */

import { IBM_Plex_Sans } from "next/font/google";

const ibmPlex = IBM_Plex_Sans({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export type PitchChipFontId = "ibm-plex";

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
  family: ibmPlex.style.fontFamily,
  weight: 600,
  tracking: "-0.01em",
};

/** @deprecated use PITCH_CHIP_FONT — kept for any leftover map callers */
export const PITCH_CHIP_FONTS: readonly PitchChipFont[] = [PITCH_CHIP_FONT];

export const DEFAULT_PITCH_CHIP_FONT: PitchChipFontId = "ibm-plex";

export function getPitchChipFont(_id?: PitchChipFontId): PitchChipFont {
  return PITCH_CHIP_FONT;
}
