/**
 * Build hero bracket display data from published official state.
 * Only shows confirmed participants — provisional group tables do not fill R32 slots.
 */

import { WC_GROUPS } from "@/components/wc/wcGroups";
import { resolveBracketMatches, R32_LEAVES, FEEDER_MAP, parseBracketSeed, resolveThirdPlaceAssignments } from "@/lib/wcBracketResolve";
import { knockoutMatchIndex, WC_TEAMS } from "@/lib/wcBracketPrediction";
import { hasPublishedState, type WcBracketState } from "@/lib/wcBracketState";
import type { WcTeam } from "@/components/wc/wcGroups";

export interface HeroMatchDisplay {
  home: Pick<WcTeam, "code" | "name"> | null;
  away: Pick<WcTeam, "code" | "name"> | null;
  winner: Pick<WcTeam, "code" | "name"> | null;
}

const R32_SEEDS = new Map(R32_LEAVES.map((l) => [l.code, l.seeds]));

function groupIndexForLetter(letter: string): number {
  return WC_GROUPS.findIndex((g) => g.letter === letter);
}

function isSeedSideConfirmed(
  seed: string,
  matchId: string,
  groupsFinal: boolean[] | undefined,
  r32SeedingFinal: boolean,
  thirdAssignments: Map<string, number>,
): boolean {
  const parsed = parseBracketSeed(seed);
  if (!parsed) return false;

  if (parsed.kind === "place") {
    const gi = groupIndexForLetter(parsed.group);
    return gi >= 0 && groupsFinal?.[gi] === true;
  }

  return r32SeedingFinal && thirdAssignments.has(matchId);
}

function feederWinnerIdx(matchId: string, knockoutWinners: number[]): number | null {
  const idx = knockoutMatchIndex(matchId);
  if (idx < 0) return null;
  const w = knockoutWinners[idx] ?? -1;
  return w >= 0 ? w : null;
}

export function buildHeroMatchDisplays(state: WcBracketState | null): Map<string, HeroMatchDisplay> {
  const out = new Map<string, HeroMatchDisplay>();
  if (!state || !hasPublishedState(state)) return out;

  const groupsFinal = state.meta.groupsFinal;
  const r32SeedingFinal = state.meta.r32SeedingFinal === true;
  const thirdAssignments = r32SeedingFinal ? resolveThirdPlaceAssignments(state) : new Map<string, number>();

  const resolved = resolveBracketMatches(state);

  const teamRef = (idx: number | null | undefined) => {
    if (idx == null || idx < 0) return null;
    const t = WC_TEAMS[idx];
    return t ? { code: t.code, name: t.name } : null;
  };

  for (const [matchId, p] of Array.from(resolved.entries())) {
    const koIdx = knockoutMatchIndex(matchId);
    const winnerIdx = koIdx >= 0 ? state.knockoutWinners[koIdx] ?? -1 : -1;

    const r32Seeds = R32_SEEDS.get(matchId);
    if (r32Seeds) {
      const [homeSeed, awaySeed] = r32Seeds.split(" v ");
      const homeOk = homeSeed ? isSeedSideConfirmed(homeSeed, matchId, groupsFinal, r32SeedingFinal, thirdAssignments) : false;
      const awayOk = awaySeed ? isSeedSideConfirmed(awaySeed, matchId, groupsFinal, r32SeedingFinal, thirdAssignments) : false;

      out.set(matchId, {
        home: homeOk ? teamRef(p.home) : null,
        away: awayOk ? teamRef(p.away) : null,
        winner: winnerIdx >= 0 ? teamRef(winnerIdx) : null,
      });
      continue;
    }

    if (winnerIdx >= 0) {
      out.set(matchId, {
        home: null,
        away: null,
        winner: teamRef(winnerIdx),
      });
      continue;
    }

    const feeders = FEEDER_MAP.get(matchId);
    if (feeders) {
      const homeOk = feederWinnerIdx(feeders[0], state.knockoutWinners) != null;
      const awayOk = feederWinnerIdx(feeders[1], state.knockoutWinners) != null;

      out.set(matchId, {
        home: homeOk ? teamRef(p.home) : null,
        away: awayOk ? teamRef(p.away) : null,
        winner: null,
      });
      continue;
    }

    out.set(matchId, { home: null, away: null, winner: null });
  }

  return out;
}

/** Order group teams by rank once the group stage is final; else draw order. */
export function orderTeamsByRank(
  teams: WcTeam[],
  groupIndex: number,
  groupRanks: number[] | undefined,
  groupsFinal?: boolean[],
): WcTeam[] {
  if (!groupsFinal?.[groupIndex]) return teams;
  if (!groupRanks?.some((r) => r >= 1 && r <= 4)) return teams;

  return teams
    .map((team, slot) => ({
      team,
      slot,
      rank: groupRanks[groupIndex * 4 + slot] ?? 0,
    }))
    .sort((a, b) => {
      const ar = a.rank >= 1 && a.rank <= 4 ? a.rank : 99 + a.slot;
      const br = b.rank >= 1 && b.rank <= 4 ? b.rank : 99 + b.slot;
      return ar - br;
    })
    .map((x) => x.team);
}

export function hasGroupStandings(groupIndex: number, groupRanks: number[] | undefined, groupsFinal?: boolean[]): boolean {
  if (!groupsFinal?.[groupIndex]) return false;
  if (!groupRanks) return false;
  const places = new Set<number>();
  for (let s = 0; s < 4; s++) {
    const r = groupRanks[groupIndex * 4 + s] ?? 0;
    if (r >= 1 && r <= 4) places.add(r);
  }
  return places.size === 4;
}
