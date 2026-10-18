import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECHECK_AFTER_MS,
  buildCanonicalStatsJson,
  countPublishedRows,
  isFinishedStatus,
  planNextPoll,
  planRefresh,
  LIVE_POLL_MS,
  MAX_SLEEP_MS,
  type AutoPublishState,
} from "../../src/lib/oracleStatsCanonical";

const MIN = 60_000;
const T0 = 1_000_000_000_000;

test("a newly finished fixture publishes at once", () => {
  const plan = planRefresh({ seen: {} }, [101], T0);
  assert.equal(plan.shouldPublish, true);
  assert.deepEqual(plan.nextState.seen["101"], { firstSeenMs: T0, rechecks: 0 });
});

test("nothing new and too early for a recheck → no publish", () => {
  const state: AutoPublishState = { seen: { "101": { firstSeenMs: T0, rechecks: 0 } } };
  const plan = planRefresh(state, [101], T0 + 10 * MIN);
  assert.equal(plan.shouldPublish, false);
  assert.deepEqual(plan.nextState, state);
});

test("rechecks fire after 30 min and again after 120 min, then stop", () => {
  let state: AutoPublishState = { seen: { "101": { firstSeenMs: T0, rechecks: 0 } } };

  const first = planRefresh(state, [101], T0 + RECHECK_AFTER_MS[0]!);
  assert.equal(first.shouldPublish, true);
  assert.equal(first.nextState.seen["101"]!.rechecks, 1);
  state = first.nextState;

  assert.equal(planRefresh(state, [101], T0 + 60 * MIN).shouldPublish, false);

  const second = planRefresh(state, [101], T0 + RECHECK_AFTER_MS[1]!);
  assert.equal(second.shouldPublish, true);
  assert.equal(second.nextState.seen["101"]!.rechecks, 2);
  state = second.nextState;

  assert.equal(planRefresh(state, [101], T0 + 24 * 60 * MIN).shouldPublish, false);
});

test("a second match finishing triggers a publish without disturbing the first", () => {
  const state: AutoPublishState = { seen: { "101": { firstSeenMs: T0, rechecks: 0 } } };
  const plan = planRefresh(state, [101, 102], T0 + 5 * MIN);
  assert.equal(plan.shouldPublish, true);
  assert.deepEqual(plan.nextState.seen["101"], { firstSeenMs: T0, rechecks: 0 });
  assert.deepEqual(plan.nextState.seen["102"], { firstSeenMs: T0 + 5 * MIN, rechecks: 0 });
});

test("only FT / AET / PEN count as finished", () => {
  for (const s of ["FT", "AET", "PEN"]) assert.equal(isFinishedStatus(s), true);
  for (const s of ["NS", "1H", "HT", "2H", "PST", "CANC", "LIVE"]) {
    assert.equal(isFinishedStatus(s), false);
  }
});

test("canonical JSON has the admin's fields, bonus 0, and counts rows", () => {
  const json = buildCanonicalStatsJson(7, [
    {
      playerId: 448,
      position: 1,
      minutesPlayed: 1,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      saves: 0,
      penaltiesSaved: 0,
      penaltiesMissed: 0,
      ownGoals: 0,
      yellowCards: 0,
      redCards: 0,
      rating: 0,
      tackles: 0,
      interceptions: 0,
      successfulDribbles: 0,
      freeKickGoals: 0,
      goalsConceded: 0,
      fplCleanSheets: 0,
    },
  ]);
  const parsed = JSON.parse(json) as { gameweekId: number; players: Record<string, Record<string, unknown>> };
  assert.equal(parsed.gameweekId, 7);
  assert.equal(parsed.players["448"]!.minutes_played, 1);
  assert.equal(parsed.players["448"]!.bonus, 0);
  assert.equal(parsed.players["448"]!.fpl_clean_sheets, 0);
  assert.equal(countPublishedRows(json), 1);
  assert.equal(countPublishedRows(null), 0);
  assert.equal(countPublishedRows("not json"), 0);
});

test("canonical JSON rejects an invalid player id / position", () => {
  assert.throws(() => buildCanonicalStatsJson(7, [{ playerId: 0, position: 1 }]));
  assert.throws(() => buildCanonicalStatsJson(7, [{ playerId: 5, position: 9 }]));
});

const fx = (id: number, short: string, kickoffMs: number) => ({ id, short, kickoffMs });

test("a live match → look every minute", () => {
  assert.equal(planNextPoll([fx(1, "2H", T0 - 60 * MIN), fx(2, "NS", T0 + 3600 * MIN)], {}, T0), LIVE_POLL_MS);
});

test("nothing live, next kickoff in 10 min → sleep until 2 min before it", () => {
  const ms = planNextPoll([fx(1, "FT", T0 - 200 * MIN), fx(2, "NS", T0 + 10 * MIN)], {}, T0);
  assert.equal(ms, 8 * MIN);
});

test("sleep is capped at 15 min and never below 1 min", () => {
  assert.equal(planNextPoll([fx(1, "NS", T0 + 3000 * MIN)], {}, T0), MAX_SLEEP_MS);
  assert.equal(planNextPoll([fx(1, "NS", T0 + 30_000)], {}, T0), LIVE_POLL_MS);
  assert.equal(planNextPoll([fx(1, "NS", T0 - 10 * MIN)], {}, T0), LIVE_POLL_MS); // delayed start
});

test("whole round finished → wake for the next pending recheck", () => {
  const seen = { "1": { firstSeenMs: T0 - 10 * MIN, rechecks: 0 } };
  assert.equal(planNextPoll([fx(1, "FT", T0 - 120 * MIN)], seen, T0), 15 * MIN); // 20 min left, capped 15
  const near = { "1": { firstSeenMs: T0 - 27 * MIN, rechecks: 0 } };
  assert.equal(planNextPoll([fx(1, "FT", T0 - 150 * MIN)], near, T0), 3 * MIN);
});

test("everything finished and all rechecks done → long sleep", () => {
  const seen = { "1": { firstSeenMs: T0 - 300 * MIN, rechecks: 2 } };
  assert.equal(planNextPoll([fx(1, "FT", T0 - 400 * MIN)], seen, T0), MAX_SLEEP_MS);
});
