import assert from "node:assert/strict";
import { test } from "node:test";
import { auditStatsAgainstFpl, formatAuditReport } from "../../src/lib/statsAudit";

const catalog = [
  { id: 201, webName: "Muñoz", team: "Nott'm Forest", position: "DEF", selectedByPercent: 5.3 },
  { id: 6, webName: "Saliba", team: "Arsenal", position: "DEF", selectedByPercent: 30 },
  { id: 9, webName: "Kostoulas", team: "Brighton", position: "FWD", selectedByPercent: 8.5 },
];

test("flags a player FPL says played but our stats have at 0 minutes (GW6 Muñoz case)", () => {
  const r = auditStatsAgainstFpl({
    ours: [
      { playerId: 201, minutes: 0, goals: 0 },
      { playerId: 6, minutes: 90, goals: 0 },
    ],
    live: [
      { id: 201, minutes: 90, goals: 0 },
      { id: 6, minutes: 90, goals: 0 },
    ],
    catalog,
    fixtures: { total: 10, finished: 10 },
  });
  assert.equal(r.blocking, 1);
  assert.equal(r.missing[0]?.playerId, 201);
  assert.match(formatAuditReport(r), /Muñoz/);
});

test("flags missing rows, phantom minutes, the 60' boundary and unfinished fixtures", () => {
  const r = auditStatsAgainstFpl({
    ours: [
      { playerId: 6, minutes: 30, goals: 0 },
      { playerId: 9, minutes: 60, goals: 0 },
    ],
    live: [
      { id: 201, minutes: 90, goals: 0 },
      { id: 6, minutes: 0, goals: 0 },
      { id: 9, minutes: 59, goals: 0 },
    ],
    catalog,
    fixtures: { total: 10, finished: 4 },
  });
  assert.deepEqual(r.missing.map((f) => f.playerId), [201]);
  assert.deepEqual(r.phantom.map((f) => f.playerId), [6]);
  assert.deepEqual(r.tier.map((f) => f.playerId), [9]);
  assert.equal(r.blocking, 2);
  assert.match(formatAuditReport(r), /Only 4\/10 fixtures finished/);
});

test("clean data and minute rounding noise are not blocking", () => {
  const r = auditStatsAgainstFpl({
    ours: [{ playerId: 6, minutes: 94, goals: 1 }],
    live: [
      { id: 6, minutes: 90, goals: 1 },
      { id: 9, minutes: 0, goals: 0 },
    ],
    catalog,
    fixtures: { total: 10, finished: 10 },
  });
  assert.equal(r.blocking, 0);
  assert.equal(formatAuditReport(r), "");
});
