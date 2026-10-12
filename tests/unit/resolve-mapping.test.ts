import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMappings } from "../../src/lib/football-api";

const row = (id: number, team: string) => ({ id, position: "DEF", team });

test("API-Sports club names resolve through club aliases (Nottingham Forest ↔ Nott'm Forest)", () => {
  // GW6 regression: Muñoz (Forest) lost his stats to a same-apiId row at Liverpool.
  const got = resolveMappings([row(377, "Liverpool"), row(201, "Nott'm Forest")], "Nottingham Forest");
  assert.deepEqual(got.map((m) => m.id), [201]);
});

test("same-apiId rows at different clubs pick the fixture club", () => {
  const got = resolveMappings([row(355, "Liverpool"), row(508, "Spurs")], "Tottenham");
  assert.deepEqual(got.map((m) => m.id), [508]);
});

test("duplicate FPL entries of one human at the same club all receive the stats", () => {
  const got = resolveMappings([row(434, "Man Utd"), row(438, "Man Utd")], "Manchester United");
  assert.deepEqual(got.map((m) => m.id).sort(), [434, 438]);
});

test("single candidate and unknown ids", () => {
  assert.deepEqual(resolveMappings([row(1, "Arsenal")], "Arsenal").map((m) => m.id), [1]);
  assert.deepEqual(resolveMappings(undefined, "Arsenal"), []);
});

test("no club match falls back to the first candidate (previous behaviour)", () => {
  const got = resolveMappings([row(1, "Arsenal"), row(2, "Chelsea")], "Brighton");
  assert.deepEqual(got.map((m) => m.id), [1]);
});
