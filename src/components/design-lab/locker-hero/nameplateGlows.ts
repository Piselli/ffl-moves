/**
 * Locked nameplate glow — soft ceiling-spot bounce matched to v25 bulbs
 * (bulb core ~RGB 253, falloff ~217, door face ~200).
 */

export type NameplateGlowId = "spot-soft";

export type NameplateGlow = {
  id: NameplateGlowId;
  name: string;
  tagline: string;
  /** Plate face fill */
  background: string;
  /** Inset / contact lighting */
  boxShadow: string;
  /** Optional outer bloom (kept soft — bulb-like, not neon) */
  filter?: string;
};

export const SPOT_SOFT_GLOW: NameplateGlow = {
  id: "spot-soft",
  name: "Spot soft",
  tagline: "Ceiling spot bounce · soft center",
  background:
    "radial-gradient(120% 90% at 50% 35%, #f2f2f1 0%, #dddede 55%, #c9caca 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -10px 18px rgba(255,252,248,0.2), 0 0 14px rgba(255,252,248,0.22)",
};

export const DEFAULT_NAMEPLATE_GLOW: NameplateGlowId = "spot-soft";
/** Locked production recommendation — soft ceiling-spot bounce. */
export const ACTIVE_NAMEPLATE_GLOW: NameplateGlowId = "spot-soft";

export function getNameplateGlow(_id?: NameplateGlowId): NameplateGlow {
  return SPOT_SOFT_GLOW;
}
