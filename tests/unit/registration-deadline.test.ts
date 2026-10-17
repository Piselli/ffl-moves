import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { resolveRegistrationDeadline } from "../../src/lib/server/fplRegistrationDeadline";
import { isRegistrationClosed } from "../../src/lib/server/registrationWindow";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFpl(
  handler: () => Response | Promise<Response>,
): { calls: () => number } {
  let n = 0;
  globalThis.fetch = (async () => {
    n++;
    return handler();
  }) as typeof fetch;
  return { calls: () => n };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("live FPL → authoritative first kickoff (earliest fixture)", async () => {
  mockFpl(() =>
    json([
      { event: 20, kickoff_time: "2026-12-01T15:00:00Z" },
      { event: 20, kickoff_time: "2026-12-01T12:30:00Z" },
      { event: 21, kickoff_time: "2026-11-01T10:00:00Z" },
    ]),
  );
  const d = await resolveRegistrationDeadline(20, { attempts: 1 });
  assert.equal(d.deadlineSource, "first_kickoff");
  assert.equal(d.authoritative, true);
  assert.equal(d.deadlineIso, "2026-12-01T12:30:00.000Z");
});

test("FPL later down → last confirmed kickoff is reused (still authoritative)", async () => {
  mockFpl(() => json([{ event: 22, kickoff_time: "2026-12-08T12:30:00Z" }]));
  await resolveRegistrationDeadline(22, { attempts: 1 });

  mockFpl(() => json({ error: "blocked" }, 403));
  const d = await resolveRegistrationDeadline(22, { attempts: 2, timeoutMs: 500 });
  assert.equal(d.deadlineSource, "cached_kickoff");
  assert.equal(d.authoritative, true);
  assert.equal(d.deadlineIso, "2026-12-08T12:30:00.000Z");
});

test("transient failure is retried before falling back", async () => {
  let call = 0;
  const m = mockFpl(() => {
    call++;
    return call < 3
      ? json({}, 503)
      : json([{ event: 23, kickoff_time: "2026-12-15T12:30:00Z" }]);
  });
  const d = await resolveRegistrationDeadline(23, { attempts: 3, timeoutMs: 2000 });
  assert.equal(m.calls(), 3);
  assert.equal(d.deadlineSource, "first_kickoff");
  assert.equal(d.authoritative, true);
});

test("FPL down and nothing confirmed → NEVER authoritative (no early FPL deadline)", async () => {
  mockFpl(() => json({}, 500));
  // GW7 has an FPL deadline_time of 10:00Z, ~90 min before the 11:30Z first kickoff.
  const d = await resolveRegistrationDeadline(7, { attempts: 1 });
  assert.equal(d.authoritative, false);
  assert.notEqual(d.deadlineSource, "first_kickoff");
  assert.notEqual(d.deadlineSource, "cached_kickoff");
});

test("GW7 incident: FPL unreachable at 11:18Z must NOT report registration closed", async () => {
  mockFpl(() => {
    throw new Error("network down");
  });
  const at1118 = Date.parse("2026-10-17T11:18:56Z");
  assert.equal(await isRegistrationClosed(7, at1118), false);
});

test("GW7: once a confirmed kickoff is known, closing applies only after it", async () => {
  mockFpl(() => json([{ event: 7, kickoff_time: "2026-10-17T11:30:00Z" }]));
  await resolveRegistrationDeadline(7, { attempts: 1 });
  mockFpl(() => json({}, 500)); // FPL goes down afterwards; cached kickoff still used
  // registrationWindow memoises for 60s per gameweek, so use instants > 60s apart.
  const before = Date.parse("2026-10-17T11:21:00Z"); // 9 min before kickoff
  const after = Date.parse("2026-10-17T11:33:00Z"); // past kickoff + 30s grace
  assert.equal(await isRegistrationClosed(7, before), false);
  assert.equal(await isRegistrationClosed(7, after), true);
});

// ---- decideCloseAt: the "never close before the official first kickoff" rule ----
import { decideCloseAt } from "../../src/lib/server/autoCloseGameweek";

const KICK = Date.parse("2026-10-17T11:30:00Z");
const FPL_DEADLINE = Date.parse("2026-10-17T10:00:00Z"); // 90 min before kickoff
const MIN = 60_000;

test("decideCloseAt: confirmed kickoff closes exactly at kickoff", () => {
  const d = { deadlineEpochMs: KICK, deadlineSource: "first_kickoff", authoritative: true } as const;
  assert.equal(decideCloseAt(d).closeAtMs, KICK);
  const c = { deadlineEpochMs: KICK, deadlineSource: "cached_kickoff", authoritative: true } as const;
  assert.equal(decideCloseAt(c).closeAtMs, KICK);
});

test("decideCloseAt: FPL deadline_time / none are refused (GW7 bug)", () => {
  const f = { deadlineEpochMs: FPL_DEADLINE, deadlineSource: "fpl_deadline_time", authoritative: false } as const;
  assert.equal(decideCloseAt(f).closeAtMs, null);
  const n = { deadlineEpochMs: null, deadlineSource: "none", authoritative: false } as const;
  assert.equal(decideCloseAt(n).closeAtMs, null);
});

test("decideCloseAt: snapshot fallback closes only AFTER kickoff + grace", () => {
  const s = { deadlineEpochMs: KICK, deadlineSource: "snapshot_kickoff", authoritative: false } as const;
  assert.equal(decideCloseAt(s).closeAtMs, KICK + 15 * MIN);
  assert.equal(decideCloseAt(s, 5 * MIN).closeAtMs, KICK + 5 * MIN);
  // a nonsense / negative grace can never pull the close before kickoff
  assert.equal(decideCloseAt(s, -30 * MIN).closeAtMs, KICK);
  assert.equal(decideCloseAt(s, Number.NaN).closeAtMs, KICK + 15 * MIN);
});

test("decideCloseAt: for every source the close time is never before the first kickoff", () => {
  const sources = ["first_kickoff", "cached_kickoff", "snapshot_kickoff"] as const;
  for (const deadlineSource of sources) {
    for (const grace of [undefined, 0, -1, 5 * MIN, Number.NaN]) {
      const r = decideCloseAt(
        { deadlineEpochMs: KICK, deadlineSource, authoritative: deadlineSource !== "snapshot_kickoff" },
        grace,
      );
      assert.ok(r.closeAtMs != null && r.closeAtMs >= KICK, `${deadlineSource}/${grace}`);
    }
  }
});
