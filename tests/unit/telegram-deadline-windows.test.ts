import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEADLINE_CHAIN_HORIZON_MS,
  msUntilNextDeadlineAlertMark,
  pickDeadlineWindow,
  shouldChainAutoClose,
  shouldChainDeadlineTicks,
  shouldChainForRegClosed,
  shouldRetryAutoClose,
  TELEGRAM_DEADLINE_CHAIN_MAX_DEPTH,
} from "../../src/lib/server/telegram/deadlineWindows";
import { chainDelayUntilMs, DEFAULT_CHAIN_DELAY_MS } from "../../src/lib/server/cronSelfChain";

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

test("deadline chain covers 24h band through kickoff", () => {
  assert.equal(DEADLINE_CHAIN_HORIZON_MS, 24 * HOUR + 45 * MIN);
  assert.equal(shouldChainDeadlineTicks(24 * HOUR + 45 * MIN), true);
  assert.equal(shouldChainDeadlineTicks(24 * HOUR + 45 * MIN + 1), false);
  assert.equal(shouldChainDeadlineTicks(20 * HOUR), true);
  assert.equal(shouldChainDeadlineTicks(4 * HOUR), true);
  assert.equal(shouldChainDeadlineTicks(30 * MIN), true);
  assert.equal(shouldChainDeadlineTicks(0), false);
  assert.equal(shouldChainDeadlineTicks(null), false);
  assert.ok(TELEGRAM_DEADLINE_CHAIN_MAX_DEPTH >= 1700);
});

test("msUntilNextDeadlineAlertMark aims at 24h / 12h / 3h / 1h then kickoff", () => {
  assert.equal(msUntilNextDeadlineAlertMark(25 * HOUR), 1 * HOUR);
  assert.equal(msUntilNextDeadlineAlertMark(24 * HOUR + MIN), MIN);
  assert.equal(msUntilNextDeadlineAlertMark(24 * HOUR), 12 * HOUR);
  assert.equal(msUntilNextDeadlineAlertMark(13 * HOUR), 1 * HOUR);
  assert.equal(msUntilNextDeadlineAlertMark(12 * HOUR), 9 * HOUR);
  assert.equal(msUntilNextDeadlineAlertMark(3 * HOUR + 30 * MIN), 30 * MIN);
  assert.equal(msUntilNextDeadlineAlertMark(3 * HOUR), 2 * HOUR);
  assert.equal(msUntilNextDeadlineAlertMark(90 * MIN), 30 * MIN);
  assert.equal(msUntilNextDeadlineAlertMark(1 * HOUR), 1 * HOUR);
  assert.equal(msUntilNextDeadlineAlertMark(20 * MIN), 20 * MIN);
  assert.equal(msUntilNextDeadlineAlertMark(0), null);
  assert.equal(msUntilNextDeadlineAlertMark(null), null);
});

test("auto-close chain mirrors the 4h horizon", () => {
  assert.equal(shouldChainAutoClose(4 * HOUR), true);
  assert.equal(shouldChainAutoClose(4 * HOUR + 1), false);
  assert.equal(shouldChainAutoClose(20 * MIN), true);
  assert.equal(shouldChainAutoClose(0), false);
  assert.equal(shouldChainAutoClose(null), false);
});

test("auto-close retries only on unverified/missing deadline", () => {
  assert.equal(shouldRetryAutoClose("deadline_unverified"), true);
  assert.equal(shouldRetryAutoClose("no_deadline"), true);
  assert.equal(shouldRetryAutoClose("before_deadline"), false);
  assert.equal(shouldRetryAutoClose("no_open_gameweek"), false);
});

test("reg_closed chain only while pending", () => {
  assert.equal(shouldChainForRegClosed(true), true);
  assert.equal(shouldChainForRegClosed(false), false);
  assert.equal(shouldChainForRegClosed(undefined), false);
});

test("chain delay stays ~55s far out, then aims just past the target", () => {
  assert.equal(chainDelayUntilMs(2 * HOUR), DEFAULT_CHAIN_DELAY_MS);
  assert.equal(chainDelayUntilMs(DEFAULT_CHAIN_DELAY_MS), DEFAULT_CHAIN_DELAY_MS);
  assert.equal(chainDelayUntilMs(20_000), 21_500);
  assert.equal(chainDelayUntilMs(500), 2_000);
  assert.equal(chainDelayUntilMs(null), DEFAULT_CHAIN_DELAY_MS);
});
