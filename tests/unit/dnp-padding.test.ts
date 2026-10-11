import assert from "node:assert/strict";
import { test } from "node:test";
import { addDnpRowsForPlayedClubs, type OraclePlayerStats } from "../../src/lib/football-api";
import { computeChainAlignedXiBreakdown } from "../../src/lib/chainAlignedScoring";
import { calculateFantasyPoints } from "../../src/lib/scoring";
import type { Player } from "../../src/lib/types";

function row(playerId: number, position: number, minutesPlayed: number): OraclePlayerStats {
  return {
    playerId,
    position,
    minutesPlayed,
    goals: 0,
    assists: 0,
    cleanSheet: false,
    saves: 0,
    penaltiesSaved: 0,
    penaltiesMissed: 0,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
    rating: minutesPlayed > 0 ? 60 : 0,
    tackles: 0,
    interceptions: 0,
    successfulDribbles: 0,
    freeKickGoals: 0,
    goalsConceded: 0,
  };
}

const catalog = [
  { id: 6, position: "DEF", team: "Arsenal", hasApiId: true }, // injured, not in squad → no API-Sports row
  { id: 8, position: "DEF", team: "Arsenal", hasApiId: true }, // played
  { id: 500, position: "DEF", team: "Spurs", hasApiId: true }, // Spurs not finished → must NOT be padded
  { id: 279, position: "DEF", team: "Hull City" }, // no apiId → unknown, must NOT be padded
  { id: 701, position: "MID", team: "Man City", hasApiId: true }, // alias: API says "Manchester City"
];
const PLAYED = ["Arsenal", "Manchester City"];

test("adds DNP rows only for clubs that already have rows", () => {
  const { rows, added } = addDnpRowsForPlayedClubs([row(8, 1, 90)], catalog, PLAYED);
  assert.equal(added, 2); // Saliba + Man City alias player
  const saliba = rows.find((r) => r.playerId === 6);
  assert.ok(saliba);
  assert.equal(saliba.minutesPlayed, 0);
  assert.equal(saliba.position, 1);
  assert.equal(rows.find((r) => r.playerId === 500), undefined);
  assert.equal(rows.find((r) => r.playerId === 279), undefined);
  assert.ok(rows.find((r) => r.playerId === 701));
});

test("a club with rows but no finished fixture is not padded", () => {
  // e.g. a transferred player's row makes a live club look "played" — only finished fixtures count.
  const { added } = addDnpRowsForPlayedClubs([row(8, 1, 90)], catalog, []);
  assert.equal(added, 0);
});

test("padded DNP starter triggers auto-sub from bench", () => {
  const { rows } = addDnpRowsForPlayedClubs([row(8, 1, 90), row(77, 1, 90)], catalog, PLAYED);
  const stats: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    stats[String(r.playerId)] = {
      position: r.position,
      minutes_played: r.minutesPlayed,
      rating: r.rating,
      goals_conceded: 0,
    };
  }
  const p = (id: number, positionId: number): Player => ({ id, positionId }) as unknown as Player;
  const starters = [p(6, 1)];
  const bench = [p(77, 1)];
  const out = computeChainAlignedXiBreakdown(starters, bench, stats, -1);
  assert.equal(out.slots[0]!.substituted, true);
  assert.equal(out.slots[0]!.effectivePlayer.id, 77);
});

test("FPL bonus is ignored in scoring", () => {
  const base = calculateFantasyPoints({ positionId: 2 }, { minutes_played: 45 });
  const withBonus = calculateFantasyPoints({ positionId: 2 }, { minutes_played: 45, bonus: 3 });
  assert.equal(base, 1);
  assert.equal(withBonus, 1);
});
