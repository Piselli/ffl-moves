/**
 * Lab tablet directions from Refero research (iPad polish only).
 * Shipping homepage defaults to `current` = Obsidian Glass.
 * `crystal` is the optional heavy-frost look (user-selectable on `/`).
 *
 * A Obsidian Glass — shipping lock
 * B Active Theory — 3D scene rules: chrome whispers, ghost / hairline
 * C Linear — dense dark product, lime flashlight
 * D Signal — Sandclock/Phantom: green only as live signal
 * E Authkit — frosted plate polish on black (no cool-blue frost)
 * F Crystal Glass — max frost / refractive edge (leaderboard Crystal twin)
 *
 * Athletics → secondary pages / Lounge TV (not this switcher).
 */

import {
  getCtaStyle,
  type CtaStyle,
  type CtaStyleId,
} from "./ctaStyles";
import {
  getLockerPalette,
  type LockerPalette,
  type LockerPaletteId,
} from "./lockerPalettes";

export type TabletVariantId =
  | "current"
  | "active-theory"
  | "linear"
  | "signal"
  | "authkit"
  | "crystal";

export type TabletChrome =
  | "current"
  | "ghost"
  | "linear"
  | "signal"
  | "authkit"
  | "crystal";

export type TabletVariant = {
  id: TabletVariantId;
  label: string;
  hook: string;
  paletteId: LockerPaletteId;
  ctaId: CtaStyleId;
  chrome: TabletChrome;
};

export const TABLET_VARIANTS: TabletVariant[] = [
  {
    id: "current",
    label: "A · Obsidian Glass",
    hook: "Shipping lock · baseline",
    paletteId: "obsidian-glass",
    ctaId: "convex-green",
    chrome: "current",
  },
  {
    id: "active-theory",
    label: "B · Active Theory",
    hook: "Ghost chrome · hover whisper",
    paletteId: "active-theory",
    ctaId: "tripled-white",
    chrome: "ghost",
  },
  {
    id: "linear",
    label: "C · Linear",
    hook: "Dense product · lime flashlight",
    paletteId: "linear-dense",
    ctaId: "linear-lime",
    chrome: "linear",
  },
  {
    id: "signal",
    label: "D · Signal",
    hook: "Green only as live signal",
    paletteId: "signal-green",
    ctaId: "signal-green",
    chrome: "signal",
  },
  {
    id: "authkit",
    label: "E · Authkit Glass",
    hook: "Frosted plates · Obsidian polish",
    paletteId: "plates-plus",
    ctaId: "convex-green",
    chrome: "authkit",
  },
  {
    id: "crystal",
    label: "F · Crystal Glass",
    hook: "Max frost · green registration",
    paletteId: "plates-plus",
    ctaId: "convex-green",
    chrome: "crystal",
  },
];

/** User-selectable tablet looks on `/` (saved in localStorage). */
export const HOMEPAGE_COMPARE_VARIANTS: readonly TabletVariantId[] = [
  "current",
  "crystal",
] as const;

export type UserTabletLook = {
  id: TabletVariantId;
  name: string;
  /** Mini swatch in the pitch fringe picker */
  swatch: string;
  swatchBase?: string;
};

/** Swatches for the in-pitch look picker — Obsidian vs Crystal only. */
export const USER_TABLET_LOOKS: readonly UserTabletLook[] = [
  {
    id: "current",
    name: "Obsidian",
    swatchBase: "#0a0a0a",
    swatch:
      "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
  },
  {
    id: "crystal",
    name: "Crystal",
    swatchBase: "#101010",
    swatch:
      "linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(200,220,255,0.14) 50%, rgba(255,255,255,0.06) 100%)",
  },
];

export const DEFAULT_TABLET_VARIANT: TabletVariantId = "current";
/** Default look on `/` when no saved preference — user can switch to Crystal. */
export const SHIPPING_TABLET_VARIANT: TabletVariantId = "current";

export const TABLET_VARIANT_STORAGE_KEY = "ffl:locker-hero:tablet-variant";
export const HOMEPAGE_LOOK_STORAGE_KEY = "ffl:homepage:tablet-look";

/** Old lab ids → closest Refero direction */
const LEGACY_MAP: Record<string, TabletVariantId> = {
  "tripled-white": "active-theory",
  "tripled-frost": "current",
  "tripled-quiet": "linear",
  "hover-craft": "active-theory",
  "plates-plus": "authkit",
  "crystal-glass": "crystal",
};

const VALID = new Set<string>(TABLET_VARIANTS.map((v) => v.id));

export function isTabletVariantId(value: string): value is TabletVariantId {
  return VALID.has(value);
}

export function getTabletVariant(id?: TabletVariantId | null): TabletVariant {
  return (
    TABLET_VARIANTS.find((v) => v.id === id) ??
    TABLET_VARIANTS.find((v) => v.id === DEFAULT_TABLET_VARIANT)!
  );
}

export function resolveTabletTheme(id?: TabletVariantId | null): {
  variant: TabletVariant;
  palette: LockerPalette;
  cta: CtaStyle;
} {
  const variant = getTabletVariant(id);
  return {
    variant,
    palette: getLockerPalette(variant.paletteId),
    cta: getCtaStyle(variant.ctaId),
  };
}

export function loadTabletVariantId(): TabletVariantId {
  if (typeof window === "undefined") return DEFAULT_TABLET_VARIANT;
  try {
    const saved = window.localStorage.getItem(TABLET_VARIANT_STORAGE_KEY);
    if (saved && isTabletVariantId(saved)) return saved;
    if (saved && LEGACY_MAP[saved]) return LEGACY_MAP[saved];
    const fromQuery = new URLSearchParams(window.location.search).get("look");
    if (fromQuery && isTabletVariantId(fromQuery)) return fromQuery;
  } catch {
    /* ignore */
  }
  return DEFAULT_TABLET_VARIANT;
}

export function saveTabletVariantId(id: TabletVariantId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TABLET_VARIANT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadHomepageLookId(): TabletVariantId {
  if (typeof window === "undefined") return DEFAULT_TABLET_VARIANT;
  try {
    const saved = window.localStorage.getItem(HOMEPAGE_LOOK_STORAGE_KEY);
    if (
      saved &&
      HOMEPAGE_COMPARE_VARIANTS.includes(saved as TabletVariantId)
    ) {
      return saved as TabletVariantId;
    }
    const fromQuery = new URLSearchParams(window.location.search).get("look");
    if (
      fromQuery &&
      HOMEPAGE_COMPARE_VARIANTS.includes(fromQuery as TabletVariantId)
    ) {
      return fromQuery as TabletVariantId;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TABLET_VARIANT;
}

export function saveHomepageLookId(id: TabletVariantId) {
  if (typeof window === "undefined") return;
  if (!HOMEPAGE_COMPARE_VARIANTS.includes(id)) return;
  try {
    window.localStorage.setItem(HOMEPAGE_LOOK_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
