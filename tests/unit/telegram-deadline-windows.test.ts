import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pickDeadlineWindow,
  shouldChainDeadlineTicks,
} from "../../src/lib/server/telegram/deadlineWindows";

const HOUR = 60 * 60_000;
const MIN = 60_000;

test("no window before the 24h band (with 30m slack)", () => {
  assert.equal(pickDeadlineWindow(24 * HOUR + 31 * MIN), null);
});

test("24h fires from ~24.5h down to just over 12h", () => {
  assert.equal(pickDeadlineWindow(24 * HOUR + 20 * MIN)?.kind, "deadline_24h");
  assert.equal(pickDeadlineWindow(24 * HOUR)?.kind, "deadline_24h");
  assert.equal(pickDeadlineWindow(23 * HOUR + 56 * MIN)?.kind, "deadline_24h");
  assert.equal(pickDeadlineWindow(12 * HOUR + 21 * MIN)?.kind, "deadline_24h");
});

test("12h fires from ~12.3h down to just over 3h", () => {
  assert.equal(pickDeadlineWindow(12 * HOUR + 15 * MIN)?.kind, "deadline_12h");
  assert.equal(pickDeadlineWindow(12 * HOUR)?.kind, "deadline_12h");
  assert.equal(pickDeadlineWindow(3 * HOUR + 1)?.kind, "deadline_12h");
});

test("3h fires exactly at/under 3h, not early", () => {
  assert.equal(pickDeadlineWindow(3 * HOUR + MIN)?.kind, "deadline_12h");
  assert.equal(pickDeadlineWindow(3 * HOUR)?.kind, "deadline_3h");
  assert.equal(pickDeadlineWindow(90 * MIN)?.kind, "deadline_3h");
  assert.equal(pickDeadlineWindow(1 * HOUR + 1)?.kind, "deadline_3h");
});

test("1h fires exactly at/under 1h, not early", () => {
  assert.equal(pickDeadlineWindow(1 * HOUR + MIN)?.kind, "deadline_3h");
  assert.equal(pickDeadlineWindow(1 * HOUR)?.kind, "deadline_1h");
  assert.equal(pickDeadlineWindow(5 * MIN)?.kind, "deadline_1h");
});

test("nothing after the deadline", () => {
  assert.equal(pickDeadlineWindow(0), null);
  assert.equal(pickDeadlineWindow(-MIN), null);
});

test("deadline chain runs only inside the last 4 hours", () => {
  assert.equal(shouldChainDeadlineTicks(4 * HOUR), true);
  assert.equal(shouldChainDeadlineTicks(4 * HOUR + 1), false);
  assert.equal(shouldChainDeadlineTicks(30 * MIN), true);
  assert.equal(shouldChainDeadlineTicks(0), false);
  assert.equal(shouldChainDeadlineTicks(null), false);
});
