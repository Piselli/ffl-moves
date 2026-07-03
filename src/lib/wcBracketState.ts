/**
 * Published official World Cup bracket state — types and pure helpers (client-safe).
 */

import {
  emptyBracketPrediction,
  type BracketPrediction,
  WC_TEAM_COUNT,
  WC_THIRD_PLACE_COUNT,
  WC_KNOCKOUT_MATCH_COUNT,
} from "@/lib/wcBracketPrediction";

export interface WcBracketStateMeta {
  updatedAt: string | null;
  source: "manual" | "api" | "mixed" | "static" | null;
  note?: string;
  /** Per group A→L: all six group-stage matches finished. */
  groupsFinal?: boolean[];
  /** All groups final + eight third-place qualifiers assigned (Annex C). */
  r32SeedingFinal?: boolean;
}

export interface WcBracketState extends BracketPrediction {
  meta: WcBracketStateMeta;
}

export function emptyWcBracketState(): WcBracketState {
  return {
    ...emptyBracketPrediction(),
    meta: { updatedAt: null, source: null },
  };
}

export function isValidWcBracketState(raw: unknown): raw is WcBracketState {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const ranks = o.groupRanks;
  const thirds = o.thirdPlaceOrder;
  const ko = o.knockoutWinners;
  return (
    Array.isArray(ranks) &&
    ranks.length === WC_TEAM_COUNT &&
    Array.isArray(thirds) &&
    thirds.length === WC_THIRD_PLACE_COUNT &&
    Array.isArray(ko) &&
    ko.length === WC_KNOCKOUT_MATCH_COUNT
  );
}

/** Whether any official data has been published (non-default). */
export function hasPublishedState(state: WcBracketState): boolean {
  const anyRank = state.groupRanks.some((r) => r >= 1 && r <= 4);
  const anyThird = state.thirdPlaceOrder.some((r) => r >= 1 && r <= 12);
  const anyKo = state.knockoutWinners.some((w) => w >= 0);
  return anyRank || anyThird || anyKo;
}

/** True when a group has all four finishing places set. */
export function isGroupComplete(state: WcBracketState, groupIndex: number): boolean {
  const ranks = new Set<number>();
  for (let s = 0; s < 4; s++) {
    const r = state.groupRanks[groupIndex * 4 + s] ?? 0;
    if (r < 1 || r > 4) return false;
    ranks.add(r);
  }
  return ranks.size === 4;
}

export function parseBracketStatePayload(body: unknown): WcBracketState | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const candidate: WcBracketState = {
    groupRanks: o.groupRanks as number[],
    thirdPlaceOrder: o.thirdPlaceOrder as number[],
    knockoutWinners: o.knockoutWinners as number[],
    meta: (o.meta as WcBracketStateMeta) ?? { updatedAt: null, source: null },
  };
  return isValidWcBracketState(candidate) ? candidate : null;
}
