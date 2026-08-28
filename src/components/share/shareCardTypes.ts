import type { FormationId } from "@/lib/formation";
import type { Player } from "@/lib/types";
import type { PitchStyleId } from "@/components/design-lab/locker-hero/pitchStyles";
import type { HalfPitchSide } from "@/components/share/variants/ShareCardHalfPitch";
import type { ClassicPitchPlacement } from "@/components/share/variants/ShareCardHalfPitchClassic";
import type {
  ShareListPanelStyle,
  ShareListRowStyle,
} from "@/components/share/ShareHalfPitchListRail";

/** Landscape share card — 1200×630 (X / Open Graph friendly). */
export const SQUAD_SHARE_CARD_WIDTH = 1200;
export const SQUAD_SHARE_CARD_HEIGHT = 630;

/** Share card corner radius — modal + export. */
export const SHARE_CARD_CORNER_RADIUS_PX = 40;

/** 1px hairline on card edge (export strips drop shadow, keeps this). */
export const SHARE_CARD_HAIRLINE_SHADOW = "0 0 0 1px rgba(255,255,255,0.24)";

/** Portrait pitch plate — width : height = 68 : 105. */
export const PITCH_ASPECT = 68 / 105;

/** Half pitch plate — width : height = 68 : 52.5. */
export const HALF_PITCH_ASPECT = 68 / 52.5;

export type SquadShareCardProps = {
  starters: Player[];
  tourLabel: string;
  managerLabel: string;
  headline: string;
  lockedLabel: string;
  siteUrl?: string;
  formationId?: FormationId;
  className?: string;
  /** Optional bench for plaque layouts (up to 3 shown). */
  bench?: Player[];
};

export type SquadShareCardVariantId =
  | "half-turf-center"
  | "half-turf-right"
  | "half-emerald-right"
  | "half-emerald-center"
  | "half-classic"
  | "half-classic-swapped"
  | "half-tablet-swapped"
  | "half-classic-cutout-mid"
  | "half-classic-cutout-list-mid"
  | "half-classic-cutout-dark-mid"
  | "half-classic-unified-pitch-mid"
  | "half-classic-unified-list-mid"
  | "half-classic-cutout-white-mid"
  | "pitch-hero"
  | "team-sheet"
  | "identity"
  | "plaque"
  | "line-sheet"
  | "broadcast";

export const SQUAD_SHARE_MARKET_VARIANTS: {
  id: SquadShareCardVariantId;
  label: string;
  tagline: string;
  pitchSide?: HalfPitchSide;
  pitchStyleId?: PitchStyleId;
  classic?: boolean;
  pitchPlacement?: ClassicPitchPlacement;
  listPanel?: ShareListPanelStyle;
  listRowStyle?: ShareListRowStyle;
  chipMode?: "chips" | "chips-muted" | "glass";
  pitchFrameStyle?: "none" | "glow" | "soft" | "bezel";
  mutedPlateStyle?: "site" | "dark" | "white";
  unifiedPanel?: boolean;
}[] = [
  {
    id: "half-turf-center",
    label: "1 · Night turf · pitch center",
    tagline: "Current layout · list on the right",
    pitchSide: "center",
    pitchStyleId: "night-turf",
  },
  {
    id: "half-turf-right",
    label: "2 · Night turf · pitch right",
    tagline: "List mid · pitch on the right",
    pitchSide: "right",
    pitchStyleId: "night-turf",
  },
  {
    id: "half-emerald-right",
    label: "3 · Solid emerald · pitch right",
    tagline: "Site emerald pitch · pitch on the right",
    pitchSide: "right",
    pitchStyleId: "solid-emerald",
  },
  {
    id: "half-emerald-center",
    label: "4 · Solid emerald · pitch center",
    tagline: "Emerald pitch · list on the right",
    pitchSide: "center",
    pitchStyleId: "solid-emerald",
  },
  {
    id: "half-classic",
    label: "5 · Classic glass · pitch mid",
    tagline: "Soft glass list right · site cutouts · pitch center",
    classic: true,
    pitchPlacement: "center" as const,
    listPanel: "soft" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips" as const,
    pitchFrameStyle: "none" as const,
  },
  {
    id: "half-classic-swapped",
    label: "6 · Classic glass · list mid",
    tagline: "Glass list mid · glass plaques on pitch · pitch right",
    classic: true,
    pitchPlacement: "right" as const,
    listPanel: "soft" as const,
    listRowStyle: "glass" as const,
    chipMode: "glass" as const,
    pitchFrameStyle: "none" as const,
  },
  {
    id: "half-tablet-swapped",
    label: "7 · Tablet kit · pitch mid",
    tagline: "Obsidian panels · site cutouts · pitch center · list right",
    classic: true,
    pitchPlacement: "center" as const,
    listPanel: "tablet" as const,
    listRowStyle: "kit" as const,
    chipMode: "chips" as const,
    pitchFrameStyle: "glow" as const,
  },
  {
    id: "half-classic-cutout-mid",
    label: "8 · Muted cutout · pitch mid",
    tagline: "Based on 5 · soft glass list · softer bust cutouts · pitch center",
    classic: true,
    pitchPlacement: "center" as const,
    listPanel: "soft" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips-muted" as const,
    pitchFrameStyle: "none" as const,
  },
  {
    id: "half-classic-cutout-list-mid",
    label: "9 · Muted cutout · list mid",
    tagline: "Based on 6 · soft glass list · softer bust cutouts · pitch right",
    classic: true,
    pitchPlacement: "right" as const,
    listPanel: "soft" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips-muted" as const,
    pitchFrameStyle: "none" as const,
  },
  {
    id: "half-classic-cutout-dark-mid",
    label: "10 · Muted cutout · dark plate",
    tagline: "Like 8 · darker surname plate under cutouts · pitch center",
    classic: true,
    pitchPlacement: "center" as const,
    listPanel: "soft" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips-muted" as const,
    pitchFrameStyle: "none" as const,
    mutedPlateStyle: "dark" as const,
  },
  {
    id: "half-classic-unified-pitch-mid",
    label: "11 · Unified glass · pitch mid",
    tagline: "One soft plaque · pitch + list · pitch left · list right",
    classic: true,
    pitchPlacement: "center" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips-muted" as const,
    mutedPlateStyle: "dark" as const,
    unifiedPanel: true,
  },
  {
    id: "half-classic-unified-list-mid",
    label: "12 · Unified glass · list mid",
    tagline: "One soft plaque · list + pitch · list left · pitch right",
    classic: true,
    pitchPlacement: "right" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips-muted" as const,
    mutedPlateStyle: "dark" as const,
    unifiedPanel: true,
  },
  {
    id: "half-classic-cutout-white-mid",
    label: "13 · Muted cutout · white plate",
    tagline: "Like 10 · white surname plates · pitch center · list right",
    classic: true,
    pitchPlacement: "center" as const,
    listPanel: "soft" as const,
    listRowStyle: "glass" as const,
    chipMode: "chips-muted" as const,
    pitchFrameStyle: "none" as const,
    mutedPlateStyle: "white" as const,
  },
];
