import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyInjuryRow,
  preferAvailability,
  type PlayerAvailability,
} from "../../src/lib/playerAvailability";

test("Missing Fixture → out", () => {
  assert.equal(classifyInjuryRow("Missing Fixture", "Back Injury"), "out");
});

test("Questionable → doubt", () => {
  assert.equal(classifyInjuryRow("Questionable", "Thigh Injury"), "doubt");
});

test("suspension reason wins over Missing Fixture type", () => {
  assert.equal(classifyInjuryRow("Missing Fixture", "Suspended"), "suspended");
  assert.equal(classifyInjuryRow("Out", "Red Card"), "suspended");
});

test("preferAvailability keeps the more severe mark", () => {
  const doubt: PlayerAvailability = {
    kind: "doubt",
    type: "Questionable",
    reason: "Thigh Injury",
  };
  const out: PlayerAvailability = {
    kind: "out",
    type: "Missing Fixture",
    reason: "Back Injury",
  };
  assert.equal(preferAvailability(doubt, out).kind, "out");
  assert.equal(preferAvailability(out, doubt).kind, "out");
});
