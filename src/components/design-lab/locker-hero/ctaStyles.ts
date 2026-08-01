import type { CSSProperties } from "react";

export type CtaStyleId = "convex-green";

export type CtaStyle = {
  id: CtaStyleId;
  name: string;
  tagline: string;
  label: string;
  style: CSSProperties;
};

export const LOCKER_CTA: CtaStyle = {
  id: "convex-green",
  name: "Convex green",
  tagline: "Domed green · white label",
  label: "Registration",
  // Muted green + top highlight and bottom core shadow reads as a physical dome
  // instead of the flat acid slab.
  style: {
    background:
      "linear-gradient(180deg, #3BE07A 0%, #17C255 46%, #0E9B41 100%)",
    color: "#FFFFFF",
    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
    boxShadow: [
      "inset 0 1.5px 0 rgba(255,255,255,0.55)",
      "inset 0 -2px 4px rgba(0,40,14,0.45)",
      "0 4px 10px rgba(0,0,0,0.35)",
      "0 10px 24px rgba(10,120,50,0.28)",
    ].join(", "),
  },
};

export function getCtaStyle(): CtaStyle {
  return LOCKER_CTA;
}
