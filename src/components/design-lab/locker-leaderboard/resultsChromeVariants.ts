/**
 * Same composition: board left · pitch right.
 * Chips always match homepage. Variants = materials / chrome only.
 *
 * Motion defaults (all chromes):
 *   layoutSelect — shared highlight slides between board rows
 *   claimSheet   — claim confirm as spring sheet
 *
 * `home` = shipping homepage Obsidian Glass underlays (A/B vs leaderboard looks).
 */

import {
  getTabletVariant,
  type TabletVariantId,
} from "@/components/design-lab/locker-hero/tabletVariants";
import type { LockerPaletteId } from "@/components/design-lab/locker-hero/lockerPalettes";
import type { CtaStyleId } from "@/components/design-lab/locker-hero/ctaStyles";

export type ResultsChromeId =
  | "home"
  | "slate"
  | "crystal"
  | "press"
  | "pulse"
  | "wallet"
  | "banger";

export type ResultsChromeDetails = {
  interactivePanels: boolean;
  counterPts: boolean;
  staggerRows: boolean;
  denseTable: boolean;
  condensedBoard: boolean;
  scrollToYou: boolean;
  walletFascia: boolean;
  whiteClaim: boolean;
  selectPulse: boolean;
  flipSelect: boolean;
  spotlight: boolean;
  livePulse: boolean;
  topMarquee: boolean;
  pressClaim: boolean;
  /** Heavy frost / sheen glass — stands out in the dark set */
  crystalGlass: boolean;
  /** Softer / larger plate radius (slate reference card) */
  softPlate: boolean;
  /** Shared layoutId highlight on selected board row (default on) */
  layoutSelect: boolean;
  /** Claim confirm as spring sheet (default on) */
  claimSheet: boolean;
};

export type ResultsChromeVariant = {
  id: ResultsChromeId;
  name: string;
  tagline: string;
  from: string;
  favorite?: boolean;
  tabletVariantId?: TabletVariantId;
  paletteId: LockerPaletteId;
  ctaId: CtaStyleId;
  details: ResultsChromeDetails;
};

const BASE_DETAILS: ResultsChromeDetails = {
  interactivePanels: false,
  counterPts: false,
  staggerRows: false,
  denseTable: false,
  condensedBoard: false,
  scrollToYou: false,
  walletFascia: false,
  whiteClaim: false,
  selectPulse: false,
  flipSelect: false,
  spotlight: false,
  livePulse: false,
  topMarquee: false,
  pressClaim: false,
  crystalGlass: false,
  softPlate: false,
  layoutSelect: true,
  claimSheet: true,
};

export const RESULTS_CHROME_VARIANTS: readonly ResultsChromeVariant[] = [
  {
    id: "crystal",
    name: "Crystal Glass",
    tagline: "Heavy frost · bright sheen",
    from: "Authkit frost + TripleD glass maxed",
    favorite: true,
    paletteId: "plates-plus",
    ctaId: "convex-green",
    details: {
      ...BASE_DETAILS,
      crystalGlass: true,
      interactivePanels: true,
      whiteClaim: false,
      pressClaim: true,
      counterPts: true,
      livePulse: true,
    },
  },
  {
    id: "home",
    name: "Homepage",
    tagline: "Obsidian glass · same as home",
    from: "Shipping homepage · tabletVariant current",
    favorite: true,
    tabletVariantId: "current",
    paletteId: "obsidian-glass",
    ctaId: "convex-green",
    details: {
      ...BASE_DETAILS,
      // Pure homepage materials — no crystal boost, no white claim
      livePulse: true,
      pressClaim: true,
    },
  },
  {
    id: "slate",
    name: "Slate Plate",
    tagline: "#0a0a0a · naming sheet",
    from: "tmp/naming-table.html → naming-shortlist-en.png",
    favorite: true,
    paletteId: "slate-plate",
    ctaId: "convex-green",
    details: {
      ...BASE_DETAILS,
      softPlate: true,
      pressClaim: true,
      livePulse: true,
    },
  },
  {
    id: "press",
    name: "Press Claim",
    tagline: "Spring press on claim",
    from: "TripleD Button / Morph",
    favorite: true,
    paletteId: "obsidian-glass",
    ctaId: "tripled-white",
    details: {
      ...BASE_DETAILS,
      whiteClaim: true,
      pressClaim: true,
      walletFascia: true,
      selectPulse: true,
    },
  },
  {
    id: "pulse",
    name: "Live Pulse",
    tagline: "Near-void · live breath",
    from: "TripleD Badge + Notification",
    favorite: true,
    paletteId: "signal-green",
    ctaId: "signal-green",
    details: {
      ...BASE_DETAILS,
      livePulse: true,
      selectPulse: true,
      staggerRows: true,
    },
  },
  {
    id: "wallet",
    name: "Wallet Fascia",
    tagline: "Prize bar as glass wallet",
    from: "TripleD Glass Wallet Card",
    favorite: true,
    paletteId: "obsidian-glass",
    ctaId: "tripled-white",
    details: {
      ...BASE_DETAILS,
      walletFascia: true,
      whiteClaim: true,
      counterPts: true,
      pressClaim: true,
    },
  },
  {
    id: "banger",
    name: "Banger",
    tagline: "Pulse + dense + wallet stack",
    from: "Combo of the keepers",
    paletteId: "signal-green",
    ctaId: "signal-green",
    details: {
      ...BASE_DETAILS,
      livePulse: true,
      denseTable: true,
      condensedBoard: true,
      scrollToYou: true,
      staggerRows: true,
      selectPulse: true,
      walletFascia: true,
      pressClaim: true,
      whiteClaim: true,
      counterPts: true,
    },
  },
] as const;

export const DEFAULT_RESULTS_CHROME: ResultsChromeId = "crystal";
export const SHIPPING_RESULTS_CHROME: ResultsChromeId = "crystal";
export const RESULTS_CHROME_STORAGE_KEY = "ffl:results-tablet:chrome";

export const RESULTS_CHROME_FAVORITES: readonly ResultsChromeId[] = [
  "crystal",
  "home",
  "slate",
  "press",
  "pulse",
  "wallet",
] as const;

export function getResultsChrome(
  id: ResultsChromeId,
): ResultsChromeVariant {
  return (
    RESULTS_CHROME_VARIANTS.find((v) => v.id === id) ??
    RESULTS_CHROME_VARIANTS[0]!
  );
}

export function loadResultsChromeId(): ResultsChromeId {
  if (typeof window === "undefined") return DEFAULT_RESULTS_CHROME;
  try {
    const raw = window.localStorage.getItem(RESULTS_CHROME_STORAGE_KEY);
    if (RESULTS_CHROME_VARIANTS.some((v) => v.id === raw)) {
      return raw as ResultsChromeId;
    }
    const legacy: Record<string, ResultsChromeId> = {
      obsidian: "crystal",
      frost: "crystal",
      "tripled-white": "press",
      ghost: "pulse",
      signal: "pulse",
      spring: "press",
      flip: "crystal",
      spotlight: "crystal",
      marquee: "banger",
      plates: "crystal",
      "plate-lift": "crystal",
      split: "banger",
      bento: "crystal",
      linear: "banger",
    };
    if (raw && legacy[raw]) return legacy[raw];
  } catch {
    /* ignore */
  }
  return DEFAULT_RESULTS_CHROME;
}

export function saveResultsChromeId(id: ResultsChromeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESULTS_CHROME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function resolveResultsChrome(id: ResultsChromeId) {
  const chrome = getResultsChrome(id);
  const tablet = chrome.tabletVariantId
    ? getTabletVariant(chrome.tabletVariantId)
    : null;
  return { chrome, tablet };
}
