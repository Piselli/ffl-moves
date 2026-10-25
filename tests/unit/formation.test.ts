import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FORMATION_OPTIONS,
  FORMATIONS,
  DEFAULT_FORMATION,
  inferFormationFromPositions,
  isFormationId,
  isValidStarterFormation,
  remapSquadToFormation,
  remapStartersToFormation,
  slotPosition,
  starterSlots,
} from "../../src/lib/formation";
import {
  groupSquadFormation,
  groupSquadFifaRows,
} from "../../src/components/design-lab/locker-leaderboard/xiBreakdownHelpers";
import type { LabSquadPlayer } from "../../src/components/design-lab/locker-leaderboard/mockData";

const POS = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

function xiPositions(formationId: (typeof FORMATION_OPTIONS)[number]): number[] {
  return starterSlots(formationId).map((s) => POS[s.position]);
}

function stubPlayers(
  n: number,
  position: LabSquadPlayer["position"],
): LabSquadPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `${position}-${i}`,
    pts: 0,
    position,
  }));
}

test("all four schemes are valid FormationIds and sum to 11", () => {
  assert.deepEqual(FORMATION_OPTIONS, ["4-3-3", "3-4-3", "5-3-2", "3-5-2"]);
  for (const id of FORMATION_OPTIONS) {
    assert.equal(isFormationId(id), true);
    const f = FORMATIONS[id];
    assert.equal(f.GK + f.DEF + f.MID + f.FWD, 11);
  }
  assert.equal(isFormationId("4-4-2"), false);
});

test("isValidStarterFormation accepts 4-3-3, 3-4-3, 5-3-2, 3-5-2", () => {
  for (const id of FORMATION_OPTIONS) {
    assert.equal(isValidStarterFormation(xiPositions(id)), true, id);
  }
  const bad = [
    POS.GK,
    POS.DEF,
    POS.DEF,
    POS.DEF,
    POS.DEF,
    POS.MID,
    POS.MID,
    POS.MID,
    POS.MID,
    POS.FWD,
    POS.FWD,
  ];
  assert.equal(isValidStarterFormation(bad), false);
  assert.equal(
    isValidStarterFormation([POS.FWD, ...xiPositions("4-3-3").slice(1)]),
    false,
  );
});

test("inferFormationFromPositions round-trips every scheme", () => {
  for (const id of FORMATION_OPTIONS) {
    assert.equal(inferFormationFromPositions(xiPositions(id)), id);
  }
  assert.equal(inferFormationFromPositions([]), DEFAULT_FORMATION);
});

test("slotPosition matches starterSlots for 5-3-2 and 3-5-2", () => {
  for (const id of ["5-3-2", "3-5-2"] as const) {
    for (const { index, position } of starterSlots(id)) {
      assert.equal(slotPosition(index, id), position);
    }
  }
});

test("remap 4-3-3 → 5-3-2 parks surplus FWD on empty bench", () => {
  const starters = starterSlots("4-3-3").map((s, i) => ({
    id: i + 1,
    position: s.position,
  }));
  const bench: ({ id: number; position: "GK" | "DEF" | "MID" | "FWD" } | null)[] =
    [null, null, null];
  const remapped = remapSquadToFormation(starters, bench, "5-3-2");
  assert.equal(remapped.starters.filter(Boolean).length, 10);
  assert.equal(
    remapped.starters.filter((p) => p?.position === "FWD").length,
    2,
  );
  assert.equal(
    remapped.starters.filter((p) => p?.position === "DEF").length,
    4,
  );
  const overflowParked = remapped.bench.filter(Boolean);
  assert.equal(overflowParked.length, 1);
  assert.equal(overflowParked[0]?.position, "FWD");
});

test("remapStartersToFormation returns overflow without mutating bench", () => {
  const starters = starterSlots("3-4-3").map((s, i) => ({
    id: i + 1,
    position: s.position,
  }));
  const { starters: next, overflow } = remapStartersToFormation(
    starters,
    "3-5-2",
  );
  assert.equal(next.filter((p) => p?.position === "MID").length, 4);
  assert.equal(next.filter((p) => p?.position === "FWD").length, 2);
  assert.equal(overflow.length, 1);
  assert.equal(overflow[0]?.position, "FWD");
});

test("groupSquadFifaRows keeps 7+7 for every scheme", () => {
  for (const id of FORMATION_OPTIONS) {
    const f = FORMATIONS[id];
    const starters = [
      ...stubPlayers(1, "GK"),
      ...stubPlayers(f.DEF, "DEF"),
      ...stubPlayers(f.MID, "MID"),
      ...stubPlayers(f.FWD, "FWD"),
    ];
    const bench = stubPlayers(3, "MID");
    const groups = groupSquadFormation(starters, bench, id);
    const rows = groupSquadFifaRows(groups);
    assert.equal(rows.top.length, 7, `${id} top`);
    assert.equal(rows.bottom.length, 7, `${id} bottom`);
  }
});
