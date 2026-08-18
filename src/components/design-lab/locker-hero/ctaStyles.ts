import type { CSSProperties } from "react";

export type CtaStyleId =
  | "convex-green"
  | "tripled-white"
  | "tripled-ghost"
  | "linear-lime"
  | "signal-green";

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

/** TripleD / Active Theory primary: solid white with soft outer glow. */
export const TRIPLED_WHITE_CTA: CtaStyle = {
  id: "tripled-white",
  name: "TripleD white",
  tagline: "Solid white · soft glow",
  label: "Registration",
  style: {
    background: "#FFFFFF",
    color: "#000000",
    textShadow: "none",
    boxShadow: [
      "0 0 0 1px rgba(255,255,255,0.35)",
      "0 0 28px rgba(255,255,255,0.28)",
      "0 8px 24px rgba(0,0,0,0.35)",
    ].join(", "),
  },
};

/** Quiet ghost fill — denser product feel, no chromatic punch. */
export const TRIPLED_GHOST_CTA: CtaStyle = {
  id: "tripled-ghost",
  name: "Quiet ghost",
  tagline: "Bone fill · hairline edge",
  label: "Registration",
  style: {
    background: "#E5E5E6",
    color: "#08090a",
    textShadow: "none",
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.35)",
      "0 0 0 0.5px #23252a",
      "0 2px 4px rgba(0,0,0,0.4)",
    ].join(", "),
  },
};

/** Linear acid-lime flashlight — one action only. */
export const LINEAR_LIME_CTA: CtaStyle = {
  id: "linear-lime",
  name: "Linear lime",
  tagline: "Acid lime flashlight",
  label: "Registration",
  style: {
    background: "#E4F222",
    color: "#08090a",
    textShadow: "none",
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.35)",
      "0 2px 4px rgba(0,0,0,0.4)",
    ].join(", "),
  },
};

/** Sandclock / Phantom — flat green signal, no dome chrome. */
export const SIGNAL_GREEN_CTA: CtaStyle = {
  id: "signal-green",
  name: "Signal green",
  tagline: "Live signal fill only",
  label: "Registration",
  style: {
    background: "#00F948",
    color: "#000000",
    textShadow: "none",
    boxShadow: "0 0 0 1px rgba(0,249,72,0.35)",
  },
};

const CTAS: Record<CtaStyleId, CtaStyle> = {
  "convex-green": LOCKER_CTA,
  "tripled-white": TRIPLED_WHITE_CTA,
  "tripled-ghost": TRIPLED_GHOST_CTA,
  "linear-lime": LINEAR_LIME_CTA,
  "signal-green": SIGNAL_GREEN_CTA,
};

export function getCtaStyle(id?: CtaStyleId | null): CtaStyle {
  if (id && CTAS[id]) return CTAS[id];
  return LOCKER_CTA;
}
