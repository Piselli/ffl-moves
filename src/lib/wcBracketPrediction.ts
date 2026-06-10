/**
 * World Cup 2026 bracket prediction — data model, encoding, and scoring.
 *
 * Scoring (strict): 1 point per correctly guessed place.
 *   • 48 group positions (exact rank 1–4 per team)
 *   • 12 third-place rankings among the dozen group thirds (exact 1–12 order)
 *   • 32 knockout match winners (R32 → Final + 3rd-place play-off)
 *
 * On-chain payload uses the same layout via `encodeBracketPayload` / `decodeBracketPayload`.
 */

import { WC_GROUPS } from "@/components/wc/wcGroups";
import { BRACKET_LEFT, BRACKET_RIGHT, type BracketNode } from "@/components/wc/wcBracket";
import { WC_TOUR_ID_BASE } from "@/lib/worldcup";

/** Dedicated gameweek id for the bracket-challenge prize pool (admin-sponsored USDCx). */
export const WC_BRACKET_EVENT_ID = 10999;

/** md1 tour — must have registered a squad here to enter the bracket challenge. */
export const WC_BRACKET_ELIGIBILITY_TOUR_ID = WC_TOUR_ID_BASE + 1;

/** Fixed top-5 prizes in USDCx micro-units (6 decimals). Total $200. */
export const WC_BRACKET_PRIZES_USDCX = [
  100_000_000, 50_000_000, 25_000_000, 15_000_000, 10_000_000,
] as const;

export const WC_TEAM_COUNT = 48;
export const WC_THIRD_PLACE_COUNT = 12;
export const WC_KNOCKOUT_MATCH_COUNT = 32;

/** Canonical knockout match ids in encoding order (M73…M88 R32, M89…M96 R16, … M104 Final). */
export const WC_KNOCKOUT_MATCH_IDS = [
  "M73", "M74", "M75", "M76", "M77", "M78", "M79", "M80",
  "M81", "M82", "M83", "M84", "M85", "M86", "M87", "M88",
  "M89", "M90", "M91", "M92", "M93", "M94", "M95", "M96",
  "M97", "M98", "M99", "M100",
  "M101", "M102",
  "M103", "M104",
] as const;

export type KnockoutMatchId = (typeof WC_KNOCKOUT_MATCH_IDS)[number];

export interface WcTeamRef {
  index: number;
  code: string;
  name: string;
  group: string;
}

/** Flat list of 48 teams in draw order (A1…A4, B1…B4, … L1…L4). */
export function buildTeamIndex(): WcTeamRef[] {
  const out: WcTeamRef[] = [];
  for (const g of WC_GROUPS) {
    g.teams.forEach((t, i) => {
      out.push({ index: out.length, code: t.code, name: t.name, group: g.letter });
    });
  }
  return out;
}

export const WC_TEAMS = buildTeamIndex();

export function teamIndexFor(groupLetter: string, slotInGroup: number): number {
  const gi = WC_GROUPS.findIndex((g) => g.letter === groupLetter);
  if (gi < 0 || slotInGroup < 0 || slotInGroup > 3) return -1;
  return gi * 4 + slotInGroup;
}

export function groupForTeamIndex(idx: number): string {
  if (idx < 0 || idx >= WC_TEAM_COUNT) return "?";
  return WC_GROUPS[Math.floor(idx / 4)]!.letter;
}

/** `groupRanks[teamIndex]` = finishing position 1–4 in that group. */
export type GroupRanks = number[];

/** Order among the 12 third-placed teams: 1 = best third, 12 = worst. Top 8 advance. */
export type ThirdPlaceOrder = number[];

export type KnockoutWinners = number[];

export interface BracketPrediction {
  groupRanks: GroupRanks;
  thirdPlaceOrder: ThirdPlaceOrder;
  knockoutWinners: KnockoutWinners;
}

export function emptyBracketPrediction(): BracketPrediction {
  return {
    groupRanks: Array(WC_TEAM_COUNT).fill(0),
    thirdPlaceOrder: Array(WC_THIRD_PLACE_COUNT).fill(0),
    knockoutWinners: Array(WC_KNOCKOUT_MATCH_COUNT).fill(-1),
  };
}

/** Default group state: draw order 1st→4th within each group. */
export function defaultGroupRanks(): GroupRanks {
  const ranks = Array(WC_TEAM_COUNT).fill(0);
  for (let g = 0; g < WC_GROUPS.length; g++) {
    for (let s = 0; s < 4; s++) {
      ranks[g * 4 + s] = s + 1;
    }
  }
  return ranks;
}

/** Default third-place ranking: group order A→L. */
export function defaultThirdPlaceOrder(): ThirdPlaceOrder {
  return Array.from({ length: WC_THIRD_PLACE_COUNT }, (_, i) => i + 1);
}

/** Team indices of the 12 third-placed sides, one per group A→L. */
export function thirdPlaceTeamIndices(groupRanks: GroupRanks): number[] {
  const out: number[] = [];
  for (let g = 0; g < WC_GROUPS.length; g++) {
    let found = -1;
    for (let s = 0; s < 4; s++) {
      const idx = g * 4 + s;
      if (groupRanks[idx] === 3) {
        found = idx;
        break;
      }
    }
    if (found >= 0) out.push(found);
  }
  return out;
}

/** The 8 third-placed teams that advance under the user's ranking. */
export function advancingThirdIndices(groupRanks: GroupRanks, thirdOrder: ThirdPlaceOrder): number[] {
  const thirds = thirdPlaceTeamIndices(groupRanks);
  if (thirds.length !== WC_THIRD_PLACE_COUNT) return [];

  const ranked = thirds
    .map((teamIdx, i) => ({
      teamIdx,
      rankAmongThirds: thirdOrder[i] ?? 0,
      group: groupForTeamIndex(teamIdx),
    }))
    .filter((x) => x.rankAmongThirds >= 1 && x.rankAmongThirds <= 12)
    .sort((a, b) => a.rankAmongThirds - b.rankAmongThirds);

  return ranked.slice(0, 8).map((x) => x.teamIdx);
}

export function teamAtGroupPlace(groupRanks: GroupRanks, groupLetter: string, place: 1 | 2 | 3 | 4): number | null {
  const gi = WC_GROUPS.findIndex((g) => g.letter === groupLetter);
  if (gi < 0) return null;
  for (let s = 0; s < 4; s++) {
    const idx = gi * 4 + s;
    if (groupRanks[idx] === place) return idx;
  }
  return null;
}

/** Collect bracket leaf + internal match codes in tree order (left pathway then right). */
function collectBracketMatchCodes(node: BracketNode, out: string[]): void {
  if (node.feeders) {
    collectBracketMatchCodes(node.feeders[0], out);
    collectBracketMatchCodes(node.feeders[1], out);
  }
  out.push(node.code);
}

/** R32…SF match codes from the official tree (30 ties), plus M103 (3rd) and M104 (Final). */
export function bracketTreeMatchCodes(): string[] {
  const tree: string[] = [];
  collectBracketMatchCodes(BRACKET_LEFT, tree);
  collectBracketMatchCodes(BRACKET_RIGHT, tree);
  return [...tree, "M103", "M104"];
}

/** Map from match id → index in `knockoutWinners` vector. */
export function knockoutMatchIndex(matchId: string): number {
  const i = WC_KNOCKOUT_MATCH_IDS.indexOf(matchId as KnockoutMatchId);
  return i;
}

// ── Validation ──────────────────────────────────────────────────────────────

export function isValidGroupRanks(ranks: GroupRanks): boolean {
  if (ranks.length !== WC_TEAM_COUNT) return false;
  for (let g = 0; g < WC_GROUPS.length; g++) {
    const seen = new Set<number>();
    for (let s = 0; s < 4; s++) {
      const r = ranks[g * 4 + s];
      if (r < 1 || r > 4 || seen.has(r)) return false;
      seen.add(r);
    }
  }
  return true;
}

export function isValidThirdPlaceOrder(order: ThirdPlaceOrder, groupRanks: GroupRanks): boolean {
  if (order.length !== WC_THIRD_PLACE_COUNT) return false;
  const seen = new Set<number>();
  for (const v of order) {
    if (v < 1 || v > 12 || seen.has(v)) return false;
    seen.add(v);
  }
  return thirdPlaceTeamIndices(groupRanks).length === WC_THIRD_PLACE_COUNT;
}

export function isValidKnockoutWinners(winners: KnockoutWinners): boolean {
  if (winners.length !== WC_KNOCKOUT_MATCH_COUNT) return false;
  return winners.every((w) => w >= 0 && w < WC_TEAM_COUNT);
}

export function isCompletePrediction(p: BracketPrediction): boolean {
  return (
    isValidGroupRanks(p.groupRanks) &&
    isValidThirdPlaceOrder(p.thirdPlaceOrder, p.groupRanks) &&
    isValidKnockoutWinners(p.knockoutWinners)
  );
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export interface BracketScoreBreakdown {
  groupPoints: number;
  thirdPlacePoints: number;
  knockoutPoints: number;
  total: number;
  maxPossible: number;
}

/**
 * Strict scoring: 1 pt per exact group rank, 1 pt per exact third-among-thirds rank,
 * 1 pt per correct knockout winner.
 */
export function scoreBracketPrediction(
  predicted: BracketPrediction,
  actual: BracketPrediction,
): BracketScoreBreakdown {
  let groupPoints = 0;
  for (let i = 0; i < WC_TEAM_COUNT; i++) {
    if (predicted.groupRanks[i] === actual.groupRanks[i] && actual.groupRanks[i] >= 1) {
      groupPoints++;
    }
  }

  let thirdPlacePoints = 0;
  for (let i = 0; i < WC_THIRD_PLACE_COUNT; i++) {
    if (predicted.thirdPlaceOrder[i] === actual.thirdPlaceOrder[i] && actual.thirdPlaceOrder[i] >= 1) {
      thirdPlacePoints++;
    }
  }

  let knockoutPoints = 0;
  for (let i = 0; i < WC_KNOCKOUT_MATCH_COUNT; i++) {
    if (
      predicted.knockoutWinners[i] === actual.knockoutWinners[i] &&
      actual.knockoutWinners[i] >= 0
    ) {
      knockoutPoints++;
    }
  }

  const maxPossible = WC_TEAM_COUNT + WC_THIRD_PLACE_COUNT + WC_KNOCKOUT_MATCH_COUNT;
  return {
    groupPoints,
    thirdPlacePoints,
    knockoutPoints,
    total: groupPoints + thirdPlacePoints + knockoutPoints,
    maxPossible,
  };
}

// ── On-chain encoding (vector<u8> args) ─────────────────────────────────────

/** Encode ranks 1–4 as bytes; 0 = unset. */
export function encodeGroupRanks(ranks: GroupRanks): number[] {
  return ranks.map((r) => (r >= 1 && r <= 4 ? r : 0));
}

/** Encode third-place order 1–12; 0 = unset. */
export function encodeThirdPlaceOrder(order: ThirdPlaceOrder): number[] {
  return order.map((r) => (r >= 1 && r <= 12 ? r : 0));
}

/** Encode winner team indices 0–47; 255 = unset (contract rejects). */
export function encodeKnockoutWinners(winners: KnockoutWinners): number[] {
  return winners.map((w) => (w >= 0 && w < WC_TEAM_COUNT ? w : 255));
}

export function decodeGroupRanks(bytes: number[]): GroupRanks {
  return bytes.slice(0, WC_TEAM_COUNT).map((b) => (b >= 1 && b <= 4 ? b : 0));
}

export function decodeThirdPlaceOrder(bytes: number[]): ThirdPlaceOrder {
  return bytes.slice(0, WC_THIRD_PLACE_COUNT).map((b) => (b >= 1 && b <= 12 ? b : 0));
}

export function decodeKnockoutWinners(bytes: number[]): KnockoutWinners {
  return bytes.slice(0, WC_KNOCKOUT_MATCH_COUNT).map((b) => (b < WC_TEAM_COUNT ? b : -1));
}

/** md1 kickoff — bracket registration closes with md1 squad registration. */
export const WC_BRACKET_DEADLINE_ISO = "2026-06-11T19:00:00Z";
