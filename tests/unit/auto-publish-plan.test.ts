import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RECHECK_AFTER_MS,
  buildCanonicalStatsJson,
  countPublishedRows,
  isFinishedStatus,
  planNextPoll,
  hasNewFinishedFixture,
  labelsForPublishAlert,
  planRefresh,
  autoPublishChainDelayMs,
  LIVE_POLL_MS,
  ACTIVE_MAX_SLEEP_MS,
  IDLE_MAX_SLEEP_MS,
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

test("alert labels only name newly finished fixtures (rechecks are silent in TG)", () => {
  const fixtures = [
    { id: 101, label: "Fulham vs Hull City" },
    { id: 102, label: "Tottenham vs Coventry" },
    { id: 103, label: "Everton vs Chelsea" },
  ];
  assert.equal(
    hasNewFinishedFixture(["new finished fixture 102", "recheck 1/2 of fixture 101"]),
    true,
  );
  assert.equal(hasNewFinishedFixture(["recheck 2/2 of fixture 101"]), false);
  assert.deepEqual(
    labelsForPublishAlert(
      ["new finished fixture 102", "recheck 1/2 of fixture 101"],
      fixtures,
    ),
    ["Tottenham vs Coventry"],
  );
  assert.deepEqual(labelsForPublishAlert(["recheck 2/2 of fixture 101"], fixtures), []);
  assert.deepEqual(labelsForPublishAlert([], fixtures), []);
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

test("a live match → look every LIVE_POLL_MS", () => {
  assert.equal(planNextPoll([fx(1, "2H", T0 - 60 * MIN), fx(2, "NS", T0 + 3600 * MIN)], {}, T0), LIVE_POLL_MS);
});

test("nothing live, next kickoff in 10 min → sleep capped by active max (not full 8 min lead)", () => {
  // Lead would be 8 min, but ACTIVE_MAX_SLEEP keeps peeks frequent between slots.
  const ms = planNextPoll([fx(1, "FT", T0 - 200 * MIN), fx(2, "NS", T0 + 10 * MIN)], {}, T0);
  assert.equal(ms, ACTIVE_MAX_SLEEP_MS);
});

test("nothing live, next kickoff in 4 min → sleep until 2 min before kickoff", () => {
  const ms = planNextPoll([fx(1, "FT", T0 - 200 * MIN), fx(2, "NS", T0 + 4 * MIN)], {}, T0);
  assert.equal(ms, 2 * MIN);
});

test("active round sleep is capped at 3 min and never below LIVE_POLL", () => {
  assert.equal(planNextPoll([fx(1, "NS", T0 + 3000 * MIN)], {}, T0), ACTIVE_MAX_SLEEP_MS);
  assert.equal(planNextPoll([fx(1, "NS", T0 + 30_000)], {}, T0), LIVE_POLL_MS);
  assert.equal(planNextPoll([fx(1, "NS", T0 - 10 * MIN)], {}, T0), LIVE_POLL_MS); // delayed start
});

test("whole round finished → wake for the next pending recheck (idle cap 15 min)", () => {
  const seen = { "1": { firstSeenMs: T0 - 10 * MIN, rechecks: 0 } };
  assert.equal(planNextPoll([fx(1, "FT", T0 - 120 * MIN)], seen, T0), IDLE_MAX_SLEEP_MS); // 20 min left, capped 15
  const near = { "1": { firstSeenMs: T0 - 27 * MIN, rechecks: 0 } };
  assert.equal(planNextPoll([fx(1, "FT", T0 - 150 * MIN)], near, T0), 3 * MIN);
});

test("everything finished and all rechecks done → idle sleep", () => {
  const seen = { "1": { firstSeenMs: T0 - 300 * MIN, rechecks: 2 } };
  assert.equal(planNextPoll([fx(1, "FT", T0 - 400 * MIN)], seen, T0), IDLE_MAX_SLEEP_MS);
});

test("autoPublishChainDelayMs follows sleep / next poll, stops when idle", () => {
  assert.equal(
    autoPublishChainDelayMs({ action: "skipped", reason: "sleeping", wakesInMs: 12_000 }),
    12_000,
  );
  assert.equal(
    autoPublishChainDelayMs({ action: "skipped", reason: "nothing_new", nextPollInMs: 30_000 }),
    30_000,
  );
  assert.equal(
    autoPublishChainDelayMs({ action: "published", nextPollInMs: 180_000 }),
    180_000,
  );
  assert.equal(autoPublishChainDelayMs({ action: "skipped", reason: "no_closed_gameweek" }), null);
  assert.equal(autoPublishChainDelayMs({ action: "skipped", reason: "stats_committed_on_chain" }), null);
  assert.equal(autoPublishChainDelayMs({ action: "skipped", reason: "another_run_in_progress" }), 5_000);
});
