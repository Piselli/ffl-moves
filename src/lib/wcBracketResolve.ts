/**
 * Resolve knockout bracket participants from group + third-place predictions.
 * R32 seeds follow Appendix A; later rounds use prior match winners.
 */

import { BRACKET_LEFT, BRACKET_RIGHT, type BracketNode } from "@/components/wc/wcBracket";
import {
  advancingThirdIndices,
  knockoutMatchIndex,
  teamAtGroupPlace,
  WC_TEAMS,
  type BracketPrediction,
  type KnockoutWinners,
} from "@/lib/wcBracketPrediction";

export interface ResolvedSide {
  teamIdx: number | null;
  label: string;
}

export interface ResolvedMatch {
  id: string;
  round: string;
  home: ResolvedSide;
  away: ResolvedSide;
  koIndex: number;
}

type ThirdSlot = { matchId: string; groups: Set<string> };
type AdvancingThird = { teamIdx: number; group: string; rank: number };

function parseSeed(seed: string): { kind: "place"; place: 1 | 2 | 3; group: string } | { kind: "third"; groups: string[] } | null {
  const direct = seed.match(/^([123])([A-L])$/);
  if (direct) {
    return { kind: "place", place: Number(direct[1]) as 1 | 2 | 3, group: direct[2]! };
  }
  const third = seed.match(/^3([A-L]+)$/);
  if (third) {
    return { kind: "third", groups: third[1]!.split("") };
  }
  return null;
}

function collectLeaves(node: BracketNode, out: { code: string; seeds: string }[]): void {
  if (node.feeders) {
    collectLeaves(node.feeders[0], out);
    collectLeaves(node.feeders[1], out);
  } else if (node.seeds) {
    out.push({ code: node.code, seeds: node.seeds });
  }
}

function collectAllNodes(node: BracketNode, out: BracketNode[]): void {
  if (node.feeders) {
    collectAllNodes(node.feeders[0], out);
    collectAllNodes(node.feeders[1], out);
  }
  out.push(node);
}

const R32_LEAVES: { code: string; seeds: string }[] = [];
collectLeaves(BRACKET_LEFT, R32_LEAVES);
collectLeaves(BRACKET_RIGHT, R32_LEAVES);

const ALL_TREE_NODES: BracketNode[] = [];
collectAllNodes(BRACKET_LEFT, ALL_TREE_NODES);
collectAllNodes(BRACKET_RIGHT, ALL_TREE_NODES);

const FEEDER_MAP = new Map<string, [string, string]>();
for (const n of ALL_TREE_NODES) {
  if (n.feeders) {
    FEEDER_MAP.set(n.code, [n.feeders[0].code, n.feeders[1].code]);
  }
}

function thirdSlotsFromLeaves(): ThirdSlot[] {
  const slots: ThirdSlot[] = [];
  for (const leaf of R32_LEAVES) {
    const thirdSeed = leaf.seeds.split(" v ").find((p) => p.startsWith("3"));
    if (!thirdSeed) continue;
    const parsed = parseSeed(thirdSeed);
    if (!parsed || parsed.kind !== "third") continue;
    slots.push({ matchId: leaf.code, groups: new Set(parsed.groups) });
  }
  return slots;
}

function eligibleCount(slot: ThirdSlot, teams: AdvancingThird[]): number {
  return teams.filter((t) => slot.groups.has(t.group)).length;
}

/**
 * Assign each advancing third to exactly one R32 tie whose seed string allows that group.
 * Greedy order fails when overlapping pools exhaust teams — use backtracking (8 slots max).
 */
function buildThirdAssignments(prediction: BracketPrediction): Map<string, number> {
  const advancing = advancingThirdIndices(prediction.groupRanks, prediction.thirdPlaceOrder);
  const teams: AdvancingThird[] = advancing.map((teamIdx) => {
    const groupIdx = Math.floor(teamIdx / 4);
    return {
      teamIdx,
      group: WC_TEAMS[teamIdx]!.group,
      rank: prediction.thirdPlaceOrder[groupIdx] ?? 99,
    };
  });

  const slots = thirdSlotsFromLeaves().sort(
    (a, b) => eligibleCount(a, teams) - eligibleCount(b, teams),
  );

  const assignment = new Map<string, number>();
  const used = new Set<number>();

  function backtrack(i: number): boolean {
    if (i >= slots.length) return true;
    const slot = slots[i]!;
    const candidates = teams
      .filter((t) => slot.groups.has(t.group) && !used.has(t.teamIdx))
      .sort((a, b) => a.rank - b.rank);

    for (const c of candidates) {
      used.add(c.teamIdx);
      assignment.set(slot.matchId, c.teamIdx);
      if (backtrack(i + 1)) return true;
      used.delete(c.teamIdx);
      assignment.delete(slot.matchId);
    }
    return false;
  }

  if (!backtrack(0)) {
    const usedFallback = new Set<number>();
    for (const slot of slots) {
      const pick = teams
        .filter((t) => slot.groups.has(t.group) && !usedFallback.has(t.teamIdx))
        .sort((a, b) => a.rank - b.rank)[0];
      if (pick) {
        usedFallback.add(pick.teamIdx);
        assignment.set(slot.matchId, pick.teamIdx);
      }
    }
  }

  return assignment;
}

function resolveSeedSide(
  seed: string,
  prediction: BracketPrediction,
  thirdAssignments: Map<string, number>,
  matchId: string,
): ResolvedSide {
  const parsed = parseSeed(seed);
  if (!parsed) return { teamIdx: null, label: seed };

  if (parsed.kind === "place") {
    const idx = teamAtGroupPlace(prediction.groupRanks, parsed.group, parsed.place);
    const name = idx != null ? WC_TEAMS[idx]!.name : `${parsed.place}${parsed.group}`;
    return { teamIdx: idx, label: name };
  }

  const assigned = thirdAssignments.get(matchId);
  if (assigned != null) {
    return { teamIdx: assigned, label: WC_TEAMS[assigned]!.name };
  }
  return { teamIdx: null, label: `3(${parsed.groups.join("")})` };
}

function winnerOf(matchId: string, winners: KnockoutWinners): number | null {
  const idx = knockoutMatchIndex(matchId);
  if (idx < 0) return null;
  const w = winners[idx];
  return w >= 0 ? w : null;
}

function loserOf(
  matchId: string,
  winners: KnockoutWinners,
  participants: Map<string, { home: number | null; away: number | null }>,
): number | null {
  const w = winnerOf(matchId, winners);
  const p = participants.get(matchId);
  if (w == null || !p) return null;
  if (p.home === w) return p.away;
  if (p.away === w) return p.home;
  return null;
}

/** Full bracket with participants derived from groups + prior picks. */
export function resolveBracketMatches(
  prediction: BracketPrediction,
): Map<string, { home: number | null; away: number | null; round: string }> {
  const thirdAssignments = buildThirdAssignments(prediction);
  const out = new Map<string, { home: number | null; away: number | null; round: string }>();

  for (const leaf of R32_LEAVES) {
    const [homeSeed, awaySeed] = leaf.seeds.split(" v ");
    const home = resolveSeedSide(homeSeed!, prediction, thirdAssignments, leaf.code);
    const away = resolveSeedSide(awaySeed!, prediction, thirdAssignments, leaf.code);
    out.set(leaf.code, { home: home.teamIdx, away: away.teamIdx, round: "R32" });
  }

  for (const node of ALL_TREE_NODES) {
    if (node.round === "R32") continue;
    const feeders = FEEDER_MAP.get(node.code);
    if (!feeders) continue;
    const home = winnerOf(feeders[0], prediction.knockoutWinners);
    const away = winnerOf(feeders[1], prediction.knockoutWinners);
    out.set(node.code, { home, away, round: node.round });
  }

  out.set("M103", {
    home: loserOf("M101", prediction.knockoutWinners, out),
    away: loserOf("M102", prediction.knockoutWinners, out),
    round: "3rd",
  });

  out.set("M104", {
    home: winnerOf("M101", prediction.knockoutWinners),
    away: winnerOf("M102", prediction.knockoutWinners),
    round: "Final",
  });

  return out;
}

export function getResolvedMatch(prediction: BracketPrediction, matchId: string): ResolvedMatch | null {
  const map = resolveBracketMatches(prediction);
  const p = map.get(matchId);
  if (!p) return null;
  const koIndex = knockoutMatchIndex(matchId);
  if (koIndex < 0) return null;

  const label = (idx: number | null) => (idx != null ? WC_TEAMS[idx]!.name : "TBD");

  return {
    id: matchId,
    round: p.round,
    koIndex,
    home: { teamIdx: p.home, label: label(p.home) },
    away: { teamIdx: p.away, label: label(p.away) },
  };
}

/** Clear downstream winners after editing an earlier tie. */
export function clearDownstreamWinners(
  winners: KnockoutWinners,
  matchId: string,
): KnockoutWinners {
  const next = [...winners];
  const toClear = new Set<string>();

  function walk(id: string) {
    for (const [parent, [f0, f1]] of Array.from(FEEDER_MAP.entries())) {
      if (f0 === id || f1 === id) {
        toClear.add(parent);
        walk(parent);
      }
    }
  }
  walk(matchId);
  toClear.add("M103");
  toClear.add("M104");

  for (const id of Array.from(toClear)) {
    const idx = knockoutMatchIndex(id);
    if (idx >= 0) next[idx] = -1;
  }
  return next;
}

export function setMatchWinner(
  prediction: BracketPrediction,
  matchId: string,
  teamIdx: number,
): BracketPrediction {
  const idx = knockoutMatchIndex(matchId);
  if (idx < 0) return prediction;

  const resolved = getResolvedMatch(prediction, matchId);
  if (!resolved) return prediction;
  if (resolved.home.teamIdx !== teamIdx && resolved.away.teamIdx !== teamIdx) return prediction;

  let nextWinners = [...prediction.knockoutWinners];
  nextWinners[idx] = teamIdx;
  nextWinners = clearDownstreamWinners(nextWinners, matchId);

  return { ...prediction, knockoutWinners: nextWinners };
}

export { R32_LEAVES, ALL_TREE_NODES, FEEDER_MAP };
