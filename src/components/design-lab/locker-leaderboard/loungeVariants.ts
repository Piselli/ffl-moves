/**
 * Lounge TV / wall board directions (Refero → secondary pages).
 * Room photo stays; chrome language changes.
 */

export type LoungeVariantId =
  | "current"
  | "active-theory"
  | "athletics"
  | "signal"
  | "linear";

export type LoungeVariant = {
  id: LoungeVariantId;
  label: string;
  hook: string;
  /** CSS vars applied to wall broadcast root */
  vars: Record<string, string>;
  liveClass: string;
  youClass: string;
  accentRank: boolean;
};

export const LOUNGE_VARIANTS: LoungeVariant[] = [
  {
    id: "current",
    label: "A · Lounge TV",
    hook: "Locked shipping wall",
    vars: {
      "--lv-ink": "#ffffff",
      "--lv-muted": "rgba(255,255,255,0.30)",
      "--lv-soft": "rgba(255,255,255,0.45)",
      "--lv-accent": "#00f948",
      "--lv-accent-on": "#000000",
      "--lv-panel": "#141210",
      "--lv-screen": "#000000",
      "--lv-hairline": "rgba(255,255,255,0.10)",
      "--lv-row": "rgba(255,255,255,0.05)",
      "--lv-you": "rgba(0,249,72,0.10)",
    },
    liveClass: "text-[#00f948]",
    youClass: "text-[#00f948]",
    accentRank: true,
  },
  {
    id: "active-theory",
    label: "B · Active Theory",
    hook: "Ghost chrome · hairline void",
    vars: {
      "--lv-ink": "#ffffff",
      "--lv-muted": "rgba(198,198,198,0.70)",
      "--lv-soft": "rgba(255,255,255,0.45)",
      "--lv-accent": "#ffffff",
      "--lv-accent-on": "#000000",
      "--lv-panel": "rgba(0,0,0,0.55)",
      "--lv-screen": "#000000",
      "--lv-hairline": "rgba(77,77,77,0.95)",
      "--lv-row": "rgba(255,255,255,0.03)",
      "--lv-you": "rgba(255,255,255,0.08)",
    },
    liveClass: "text-white/70",
    youClass: "text-white",
    accentRank: false,
  },
  {
    id: "athletics",
    label: "C · Athletics",
    hook: "Mono UI · warmth in room photo",
    vars: {
      "--lv-ink": "#f4f1ec",
      "--lv-muted": "rgba(244,241,236,0.40)",
      "--lv-soft": "rgba(244,241,236,0.58)",
      "--lv-accent": "#d7d2c8",
      "--lv-accent-on": "#141210",
      "--lv-panel": "rgba(12,11,10,0.72)",
      "--lv-screen": "#0a0908",
      "--lv-hairline": "rgba(255,255,255,0.09)",
      "--lv-row": "rgba(255,255,255,0.035)",
      "--lv-you": "rgba(255,255,255,0.07)",
    },
    liveClass: "text-[#d7d2c8]",
    youClass: "text-[#f4f1ec]",
    accentRank: false,
  },
  {
    id: "signal",
    label: "D · Signal",
    hook: "Green only as live pulse",
    vars: {
      "--lv-ink": "#ffffff",
      "--lv-muted": "rgba(255,255,255,0.35)",
      "--lv-soft": "rgba(255,255,255,0.50)",
      "--lv-accent": "#00f948",
      "--lv-accent-on": "#000000",
      "--lv-panel": "#0c0c0c",
      "--lv-screen": "#000000",
      "--lv-hairline": "rgba(255,255,255,0.12)",
      "--lv-row": "rgba(255,255,255,0.04)",
      "--lv-you": "rgba(0,249,72,0.08)",
    },
    liveClass: "text-[#00f948]",
    youClass: "text-[#00f948]",
    accentRank: true,
  },
  {
    id: "linear",
    label: "E · Linear Wall",
    hook: "Dense board · lime flashlight",
    vars: {
      "--lv-ink": "#ffffff",
      "--lv-muted": "#8a8f98",
      "--lv-soft": "#d0d6e0",
      "--lv-accent": "#e4f222",
      "--lv-accent-on": "#08090a",
      "--lv-panel": "#0f1011",
      "--lv-screen": "#08090a",
      "--lv-hairline": "#23252a",
      "--lv-row": "rgba(255,255,255,0.03)",
      "--lv-you": "rgba(228,242,34,0.08)",
    },
    liveClass: "text-[#e4f222]",
    youClass: "text-[#e4f222]",
    accentRank: true,
  },
];

export const DEFAULT_LOUNGE_VARIANT: LoungeVariantId = "current";
export const LOUNGE_VARIANT_STORAGE_KEY = "ffl:locker-leaderboard:lounge-variant";

const VALID = new Set<string>(LOUNGE_VARIANTS.map((v) => v.id));

export function isLoungeVariantId(v: string): v is LoungeVariantId {
  return VALID.has(v);
}

export function getLoungeVariant(id?: LoungeVariantId | null): LoungeVariant {
  return (
    LOUNGE_VARIANTS.find((v) => v.id === id) ??
    LOUNGE_VARIANTS.find((v) => v.id === DEFAULT_LOUNGE_VARIANT)!
  );
}

export function loadLoungeVariantId(): LoungeVariantId {
  if (typeof window === "undefined") return DEFAULT_LOUNGE_VARIANT;
  try {
    const saved = localStorage.getItem(LOUNGE_VARIANT_STORAGE_KEY);
    if (saved && isLoungeVariantId(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOUNGE_VARIANT;
}

export function saveLoungeVariantId(id: LoungeVariantId) {
  try {
    localStorage.setItem(LOUNGE_VARIANT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
