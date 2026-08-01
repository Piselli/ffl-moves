/**
 * Pitch looks — Night Turf vs Solid Emerald (user-selectable).
 */

export type PitchStyleId = "night-turf" | "solid-emerald";

export type PitchStyle = {
  id: PitchStyleId;
  name: string;
  tagline: string;
  /** swatch for the picker */
  swatch: string;
  /** CSS background for the pitch plate */
  base: string;
  /** optional photo turf layer */
  image?: string;
  imageFilter?: string;
  /** stripe overlay */
  stripes?: string;
  stripesOpacity?: number;
  /** grade / vignette / lights */
  overlays?: string[];
  /** outer rim glow / ring */
  ring: string;
  shadow: string;
  /** chalk line color */
  chalk: string;
  chalkSoft: string;
  /** empty slot look */
  slotBorder: string;
  slotFill: string;
  slotFilledBorder: string;
  slotFilledFill: string;
  /** show penalty spots + fuller boxes */
  fullMarkings: boolean;
};

export const PITCH_STYLES: readonly PitchStyle[] = [
  {
    id: "night-turf",
    name: "Night Turf",
    tagline: "Photo grass · match night",
    swatch: "#0D2E1A",
    base: "#0D2E1A",
    image: "/design-lab/locker-hero/pitch-turf-flat.jpg",
    imageFilter: "brightness(0.85) contrast(1.18) saturate(1.05)",
    overlays: [
      "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 100%)",
      "radial-gradient(50% 32% at 50% 6%, rgba(255,255,255,0.10) 0%, transparent 55%)",
    ],
    ring: "ring-[#00F948]/25",
    shadow:
      "inset 0 0 28px rgba(0,249,72,0.12), inset 0 0 1px rgba(255,255,255,0.35), 0 14px 40px rgba(0,0,0,0.55)",
    chalk: "#FFFFFF",
    chalkSoft: "#FFFFFF",
    slotBorder: "rgba(255,255,255,0.92)",
    slotFill: "rgba(0,0,0,0.42)",
    slotFilledBorder: "#FFFFFF",
    slotFilledFill: "rgba(0,0,0,0.55)",
    fullMarkings: true,
  },
  {
    id: "solid-emerald",
    name: "Solid Emerald",
    tagline: "Vivid pitch · full boxes",
    swatch: "#0E9B2E",
    base: "#0E9B2E",
    overlays: [
      "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 30%, rgba(0,0,0,0.08) 100%)",
    ],
    ring: "ring-black/30",
    shadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 12px 28px rgba(0,0,0,0.32)",
    chalk: "#FFFFFF",
    chalkSoft: "#FFFFFF",
    slotBorder: "#FFFFFF",
    slotFill: "rgba(0,0,0,0.14)",
    slotFilledBorder: "#FFFFFF",
    slotFilledFill: "rgba(0,0,0,0.30)",
    fullMarkings: true,
  },
];

export const DEFAULT_PITCH_STYLE: PitchStyleId = "night-turf";
export const PITCH_STYLE_STORAGE_KEY = "ffl:locker-hero:pitch-style";

export function getPitchStyle(id: PitchStyleId): PitchStyle {
  return PITCH_STYLES.find((p) => p.id === id) ?? PITCH_STYLES[0]!;
}

export function loadPitchStyleId(): PitchStyleId {
  if (typeof window === "undefined") return DEFAULT_PITCH_STYLE;
  try {
    const raw = window.localStorage.getItem(PITCH_STYLE_STORAGE_KEY);
    if (PITCH_STYLES.some((p) => p.id === raw)) return raw as PitchStyleId;
  } catch {
    /* ignore */
  }
  return DEFAULT_PITCH_STYLE;
}

export function savePitchStyleId(id: PitchStyleId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PITCH_STYLE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
