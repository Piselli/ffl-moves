/**
 * Locked typeface for the locker tablet (Onest).
 * Loaded at module scope (next/font requirement).
 */

import { Onest } from "next/font/google";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export type TypefaceId = "onest-clean";

export type TypefaceDirection = {
  id: TypefaceId;
  name: string;
  tagline: string;
  /** body / UI face */
  ui: string;
  /** headline face */
  display: string;
  /** letter-spacing applied to display headlines */
  displayTracking: string;
};

export const LOCKER_TYPEFACE: TypefaceDirection = {
  id: "onest-clean",
  name: "Onest",
  tagline: "Warm geometric · Cyrillic ready",
  ui: onest.style.fontFamily,
  display: onest.style.fontFamily,
  displayTracking: "-0.02em",
};

export function getTypeface(): TypefaceDirection {
  return LOCKER_TYPEFACE;
}

export function typefaceToCssVars(
  t: TypefaceDirection,
): Record<string, string> {
  return {
    "--lt-font-ui": t.ui,
    "--lt-font-display": t.display,
    "--lt-display-tracking": t.displayTracking,
  };
}
