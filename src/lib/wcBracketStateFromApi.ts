/**
 * Build / merge official bracket state from football-data.org match results.
 */

import { WC_GROUPS } from "@/components/wc/wcGroups";
import {
  advancingThirdIndices,
  thirdPlaceTeamIndices,
  WC_TEAMS,
  WC_KNOCKOUT_MATCH_IDS,
  knockoutMatchIndex,
  type BracketPrediction,
  type GroupRanks,
  type ThirdPlaceOrder,
} from "@/lib/wcBracketPrediction";
import { resolveBracketMatches } from "@/lib/wcBracketResolve";
import { lookupTeamIndex } from "@/lib/wcTeamLookup";
import type { WcFixture } from "@/lib/football-data";
import { fetchWcMatches, hasFootballDataToken } from "@/lib/football-data";
import type { WcBracketState } from "@/lib/wcBracketState";
import { loadWcBracketState } from "@/lib/wcBracketStateStore";
import { annexCCombinationKey, lookupAnnexC } from "@/lib/wcFifaAnnexC";

interface StandingRow {
  teamIdx: number;
  played: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
}

function buildStandings(groupLetter: string, fixtures: WcFixture[]): StandingRow[] {
  const gi = WC_GROUPS.findIndex((g) => g.letter === groupLetter);
  if (gi < 0) return [];

  const rows = new Map<number, StandingRow>();
  for (let s = 0; s < 4; s++) {
    const idx = gi * 4 + s;
    rows.set(idx, { teamIdx: idx, played: 0, pts: 0, gf: 0, ga: 0, gd: 0 });
  }

  for (const f of fixtures) {
    if (f.group !== groupLetter || !f.finished) continue;
    if (f.scoreH == null || f.scoreA == null) continue;

    const homeIdx = lookupTeamIndex(f.home, f.homeCode);
    const awayIdx = lookupTeamIndex(f.away, f.awayCode);
    if (homeIdx == null || awayIdx == null) continue;
    if (!rows.has(homeIdx) || !rows.has(awayIdx)) continue;

    const home = rows.get(homeIdx)!;
    const away = rows.get(awayIdx)!;
    home.played++;
    away.played++;
    home.gf += f.scoreH;
    home.ga += f.scoreA;
    away.gf += f.scoreA;
    away.ga += f.scoreH;

    if (f.scoreH > f.scoreA) {
      home.pts += 3;
    } else if (f.scoreH < f.scoreA) {
      away.pts += 3;
    } else {
      home.pts += 1;
      away.pts += 1;
    }
  }

  for (const row of Array.from(rows.values())) {
    row.gd = row.gf - row.ga;
  }

  return Array.from(rows.values());
}

function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamIdx - b.teamIdx;
  });
}

/** Live table — updates after any finished match in the group. */
function rankStandingsProvisional(rows: StandingRow[]): Map<number, number> | null {
  if (rows.every((r) => r.played === 0)) return null;

  const out = new Map<number, number>();
  sortStandings(rows).forEach((row, i) => out.set(row.teamIdx, i + 1));
  return out;
}

function computeGroupRanksFromFixtures(fixtures: WcFixture[]): GroupRanks {
  const ranks = Array(WC_TEAMS.length).fill(0) as GroupRanks;

  for (const g of WC_GROUPS) {
    const standings = buildStandings(g.letter, fixtures);
    const groupRanks = rankStandingsProvisional(standings);
    if (!groupRanks) continue;
    for (const [teamIdx, place] of Array.from(groupRanks.entries())) {
      ranks[teamIdx] = place;
    }
  }

  return ranks;
}

function computeThirdPlaceOrderFromFixtures(fixtures: WcFixture[], groupRanks: GroupRanks): ThirdPlaceOrder {
  const order = Array(12).fill(0) as ThirdPlaceOrder;
  const thirds = thirdPlaceTeamIndices(groupRanks);
  if (thirds.length !== 12) return order;

  const rows: StandingRow[] = [];
  for (const teamIdx of thirds) {
    const gi = Math.floor(teamIdx / 4);
    const groupLetter = WC_GROUPS[gi]!.letter;
    const standing = buildStandings(groupLetter, fixtures).find((r) => r.teamIdx === teamIdx);
    if (standing) rows.push(standing);
  }

  if (rows.length !== 12) return order;

  const sorted = [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamIdx - b.teamIdx;
  });

  sorted.forEach((row, rankIdx) => {
    const gi = Math.floor(row.teamIdx / 4);
    order[gi] = rankIdx + 1;
  });

  return order;
}

function computeGroupsFinal(fixtures: WcFixture[]): boolean[] {
  return WC_GROUPS.map((g) => {
    const groupFixtures = fixtures.filter((f) => f.group === g.letter);
    const finished = groupFixtures.filter((f) => f.finished).length;
    return finished >= 6;
  });
}

function computeR32SeedingFinal(
  groupRanks: GroupRanks,
  thirdPlaceOrder: ThirdPlaceOrder,
  groupsFinal: boolean[],
): boolean {
  if (!groupsFinal.every(Boolean)) return false;

  const advancing = advancingThirdIndices(groupRanks, thirdPlaceOrder);
  if (advancing.length !== 8) return false;

  const key = annexCCombinationKey(advancing.map((idx) => WC_TEAMS[idx]!.group));
  return Boolean(key && lookupAnnexC(key));
}

function applyKnockoutFromFixtures(
  prediction: BracketPrediction,
  fixtures: WcFixture[],
): BracketPrediction {
  const resolved = resolveBracketMatches(prediction);
  const winners = [...prediction.knockoutWinners];

  const koFixtures = fixtures.filter(
    (f) => f.finished && f.roundKey && f.roundKey !== "md1" && f.roundKey !== "md2" && f.roundKey !== "md3",
  );

  for (const f of koFixtures) {
    if (f.scoreH == null || f.scoreA == null) continue;
    const homeIdx = lookupTeamIndex(f.home, f.homeCode);
    const awayIdx = lookupTeamIndex(f.away, f.awayCode);
    if (homeIdx == null || awayIdx == null) continue;

    const winnerIdx = f.scoreH > f.scoreA ? homeIdx : f.scoreH < f.scoreA ? awayIdx : null;
    if (winnerIdx == null) continue;

    for (const matchId of WC_KNOCKOUT_MATCH_IDS) {
      const p = resolved.get(matchId);
      if (!p) continue;
      const matches =
        (p.home === homeIdx && p.away === awayIdx) || (p.home === awayIdx && p.away === homeIdx);
      if (!matches) continue;

      const idx = knockoutMatchIndex(matchId);
      if (idx >= 0) winners[idx] = winnerIdx;
      break;
    }
  }

  return { ...prediction, knockoutWinners: winners };
}

export interface SyncFromApiResult {
  state: WcBracketState;
  fixturesUsed: number;
  groupsComplete: number;
  knockoutFilled: number;
  errors: string[];
}

/** Merge football-data results into an existing state (API fills; manual values kept where API has no data). */
export async function syncBracketStateFromApi(base: WcBracketState): Promise<SyncFromApiResult> {
  const errors: string[] = [];
  const fixtures = await fetchWcMatches();

  if (!fixtures || fixtures.length === 0) {
    return {
      state: base,
      fixturesUsed: 0,
      groupsComplete: 0,
      knockoutFilled: 0,
      errors: ["football-data.org unavailable — set FOOTBALL_DATA_TOKEN or check the API."],
    };
  }

  const apiGroupRanks = computeGroupRanksFromFixtures(fixtures);
  const groupRanks = [...base.groupRanks] as GroupRanks;
  const groupsFinal = computeGroupsFinal(fixtures);

  let groupsComplete = 0;
  for (let g = 0; g < WC_GROUPS.length; g++) {
    if (groupsFinal[g]) {
      groupsComplete++;
      for (let s = 0; s < 4; s++) {
        const idx = g * 4 + s;
        if (apiGroupRanks[idx]! > 0) groupRanks[idx] = apiGroupRanks[idx]!;
      }
      continue;
    }

    const letter = WC_GROUPS[g]!.letter;
    if (!fixtures.some((f) => f.group === letter && f.finished)) continue;

    for (let s = 0; s < 4; s++) {
      const idx = g * 4 + s;
      if (apiGroupRanks[idx]! > 0) groupRanks[idx] = apiGroupRanks[idx]!;
    }
  }

  let thirdPlaceOrder = [...base.thirdPlaceOrder] as ThirdPlaceOrder;
  if (groupsFinal.every(Boolean)) {
    const apiThirds = computeThirdPlaceOrderFromFixtures(fixtures, groupRanks);
    if (apiThirds.some((r) => r > 0)) {
      thirdPlaceOrder = apiThirds;
    }
  }

  const r32SeedingFinal = computeR32SeedingFinal(groupRanks, thirdPlaceOrder, groupsFinal);

  let merged: BracketPrediction = {
    groupRanks,
    thirdPlaceOrder,
    knockoutWinners: [...base.knockoutWinners],
  };

  merged = applyKnockoutFromFixtures(merged, fixtures);

  const knockoutFilled = merged.knockoutWinners.filter((w) => w >= 0).length;

  return {
    state: {
      ...merged,
      meta: {
        updatedAt: new Date().toISOString(),
        source: base.meta.source === "manual" ? "mixed" : "api",
        groupsFinal,
        r32SeedingFinal,
      },
    },
    fixturesUsed: fixtures.length,
    groupsComplete,
    knockoutFilled,
    errors,
  };
}

/** Live hero state: stored overrides + football-data.org results (when configured). */
export async function resolveLiveWcBracketState(): Promise<WcBracketState> {
  const stored = await loadWcBracketState();
  if (!hasFootballDataToken()) return stored;

  const { state } = await syncBracketStateFromApi(stored);
  return state;
}
