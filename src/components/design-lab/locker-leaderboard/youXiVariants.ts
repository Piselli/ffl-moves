/**
 * YOU-tab XI — Stack cards + shared login detail plaque.
 */

export type YouXiVariantId = "crystal-stack";

export type YouXiVariantMeta = {
  id: YouXiVariantId;
  label: string;
  blurb: string;
};

export const YOU_XI_DEFAULT: YouXiVariantId = "crystal-stack";
export const DEFAULT_YOU_XI_VARIANT: YouXiVariantId = YOU_XI_DEFAULT;
export const SHIPPING_YOU_XI_VARIANT: YouXiVariantId = YOU_XI_DEFAULT;

export const YOU_XI_VARIANTS: readonly YouXiVariantMeta[] = [
  {
    id: "crystal-stack",
    label: "Stack",
    blurb: "Name-stack cards · login detail plaque",
  },
] as const;

const STORAGE_KEY = "ffl.desk-results.you-xi";

export function isYouXiVariantId(v: string): v is YouXiVariantId {
  return YOU_XI_VARIANTS.some((x) => x.id === v);
}

export function isYouResultPlate(id: string): boolean {
  return isYouXiVariantId(id);
}

export function isYouPlateVariant(id: string): id is YouXiVariantId {
  return isYouXiVariantId(id);
}

const LEGACY: Record<string, YouXiVariantId> = {
  "crystal-frost": "crystal-stack",
  "crystal-kit": "crystal-stack",
  "crystal-login": "crystal-stack",
  "crystal-deposit": "crystal-stack",
  "crystal-result": "crystal-stack",
  "crystal-poster": "crystal-stack",
  "crystal-broadcast": "crystal-stack",
  "crystal-share": "crystal-stack",
  "crystal-glass": "crystal-stack",
  "crystal-heavy": "crystal-stack",
  "crystal-crown": "crystal-stack",
  crown: "crystal-stack",
  "triple-d": "crystal-stack",
  "squad-card": "crystal-stack",
  "pitch-live": "crystal-stack",
  frost: "crystal-stack",
  kit: "crystal-stack",
  stack: "crystal-stack",
  login: "crystal-stack",
  deposit: "crystal-stack",
};

export function resolveYouXiVariantId(
  raw: string | null | undefined,
): YouXiVariantId {
  if (!raw) return YOU_XI_DEFAULT;
  if (isYouXiVariantId(raw)) return raw;
  return LEGACY[raw] ?? YOU_XI_DEFAULT;
}

export function loadYouXiVariantId(): YouXiVariantId {
  if (typeof window === "undefined") return DEFAULT_YOU_XI_VARIANT;
  try {
    return resolveYouXiVariantId(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_YOU_XI_VARIANT;
  }
}

export function saveYouXiVariantId(id: YouXiVariantId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
