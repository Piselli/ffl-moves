/**
 * FIFA World Cup 2026 regulations — Annex C (495 third-place combinations).
 * Source: FIFA regulations PDF + cross-checked Wikipedia template rows 1–495.
 *
 * Keys are the 8 advancing third-place group letters, sorted A→L (e.g. "CDEFGIKL").
 * Values map R32 match IDs (M74, M77, …) to the group letter placed in that slot.
 */

import annexC from "@/data/wc-fifa-annex-c.json";

export type AnnexCMatchMapping = Record<string, string>;

const TABLE = annexC as Record<string, AnnexCMatchMapping>;

/** Sorted 8-letter key for the groups whose thirds advance. */
export function annexCCombinationKey(advancingGroups: string[]): string | null {
  if (advancingGroups.length !== 8) return null;
  return [...advancingGroups].sort().join("");
}

/** Official FIFA slot assignment for the given combination, or null if unknown. */
export function lookupAnnexC(key: string): AnnexCMatchMapping | null {
  return TABLE[key] ?? null;
}

export const ANNEX_C_COMBINATION_COUNT = Object.keys(TABLE).length;
