import type { Player } from "@/lib/types";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";

/** Draft vs a stats map. Empty slots skipped. No captain → no double (`-1`). */
export function scoreDraftAgainstGw(
  starters: (Player | null)[],
  bench: (Player | null)[],
  stats: Record<string, Record<string, unknown>>,
  captainIndex: number | null,
): number {
  const xi = starters.slice(0, 11);
  while (xi.length < 11) xi.push(null);
  const b = bench.filter((p): p is Player => p != null);
  return computeChainAlignedXiBreakdown(
    xi as Player[],
    b,
    stats,
    captainIndex ?? -1,
  ).preMultiplier;
}

/** Fallback when no published stats exist — uses catalog `form` as fake GW pts. */
export function sampleDraftScore(
  starters: (Player | null)[],
  captainIndex: number | null,
): number {
  let total = 0;
  starters.forEach((p, i) => {
    if (!p) return;
    const pts = Math.max(0, Math.round(Number(p.form) || 0));
    total += pts;
    if (captainIndex === i) total += pts;
  });
  return total;
}
