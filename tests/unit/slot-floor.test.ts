import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chainSlotDisplayPoints,
  computeChainAlignedXiBreakdown,
} from "../../src/lib/chainAlignedScoring";
import type { Player } from "../../src/lib/types";

function player(id: number, positionId: number, name: string): Player {
  return {
    id,
    name,
    webName: name,
    team: "T",
    teamId: 1,
    position: positionId === 0 ? "GK" : positionId === 1 ? "DEF" : positionId === 2 ? "MID" : "FWD",
    positionId,
    photo: "",
    status: "a",
    totalPoints: 0,
    form: 0,
    selectedByPercent: 0,
  } as Player;
}

function stats(over: Record<string, unknown>): Record<string, unknown> {
  return {
    minutes_played: 90,
    goals: 0,
    assists: 0,
    clean_sheet: false,
    saves: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    own_goals: 0,
    yellow_cards: 0,
    red_cards: 0,
    rating: 65,
    goals_conceded: 0,
    ...over,
  };
}

const starters = [
  player(1, 0, "GK"),
  player(2, 1, "D1"),
  player(3, 1, "D2"),
  player(4, 1, "D3"),
  player(5, 2, "Semenyo"),
  player(6, 2, "Rogers"),
  player(7, 2, "Cherki"),
  player(8, 2, "M4"),
  player(9, 3, "Haaland"),
  player(10, 3, "F2"),
  player(11, 3, "F3"),
];
const bench = [player(20, 2, "Yarmoliuk"), player(21, 1, "B2"), player(22, 3, "B3")];

test("auto-sub with red card + low rating counts 0, never negative, pitch sum == team total", () => {
  const gw: Record<string, Record<string, unknown>> = {
    5: stats({ minutes_played: 13, rating: 65 }), // 1 pt
    6: stats({ yellow_cards: 1 }), // 2 - 1... base 2 (mins) minus yc = 1? see assertion below
    7: stats({ minutes_played: 0, rating: 0 }), // Cherki DNP
    20: stats({ minutes_played: 53, red_cards: 1, rating: 54 }), // 1 - 3 floor 0, rating <6
    9: stats({ goals: 2, rating: 98 }),
  };
  const bd = computeChainAlignedXiBreakdown(starters, bench, gw, 8);

  const cherki = bd.slots.find((s) => s.slotIndex === 6)!;
  assert.equal(cherki.substituted, true);
  assert.equal(chainSlotDisplayPoints(cherki), 0);
  assert.equal(cherki.ratingSub, 0, "rating penalty must be capped by what the slot earned");

  for (const s of bd.slots) assert.ok(chainSlotDisplayPoints(s) >= 0);

  const pitchSum = bd.slots.reduce((acc, s) => {
    const pts = chainSlotDisplayPoints(s);
    return acc + (s.slotIndex === 8 && !s.substituted ? pts * 2 : pts);
  }, 0);
  assert.equal(pitchSum, bd.preMultiplier);
});

test("low rating still costs a point when the slot earned points", () => {
  const gw: Record<string, Record<string, unknown>> = {
    5: stats({ minutes_played: 90, rating: 55 }), // base 2, rating <6 → net 1
  };
  const bd = computeChainAlignedXiBreakdown(starters, bench, gw, -1);
  const slot = bd.slots.find((s) => s.slotIndex === 4)!;
  assert.equal(slot.ratingSub, 1);
  assert.equal(chainSlotDisplayPoints(slot), 1);
});
