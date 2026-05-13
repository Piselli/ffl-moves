import { NextResponse } from "next/server";
import bootstrapLite from "@/data/fpl-bootstrap-lite.json";

const FPL_FIXTURES_ALL = "https://fantasy.premierleague.com/api/fixtures/";
const BADGE_BASE = "https://resources.premierleague.com/premierleague/badges/70/t";

/** London-first egress often works better with FPL than default US regions. */
export const preferredRegion = "lhr1";
export const maxDuration = 30;

/** Never cache this handler’s JSON at the edge — stale kickoff/deadline breaks the hero countdown. */
export const dynamic = "force-dynamic";

/**
 * Fixture IDs to exclude from the displayed schedule.
 * Used for postponed/rescheduled matches that FPL assigns to this GW
 * but don't belong to it from a fantasy scoring perspective.
 * 307 = MCI vs CRY (rescheduled from another round, 13 May 2026)
 */
const EXCLUDED_FIXTURE_IDS = new Set([307]);

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

const FETCH_INIT: RequestInit = {
  headers: BROWSER_HEADERS,
  cache: "no-store",
};

type TeamMap = Record<number, { name: string; shortName: string; badge: string }>;

interface FplFixtureRaw {
  id: number;
  event: number;
  kickoff_time?: string;
  team_h: number;
  team_a: number;
  finished?: boolean;
  started?: boolean;
  team_h_score?: number | null;
  team_a_score?: number | null;
}

type BootstrapLite = typeof bootstrapLite;
type EventMeta = BootstrapLite["events"][number];

function buildTeamMap(teams: BootstrapLite["teams"]): TeamMap {
  const teamMap: TeamMap = {};
  for (const t of teams) {
    teamMap[t.id] = {
      name: t.name,
      shortName: t.short_name,
      badge: `${BADGE_BASE}${t.code}.png`,
    };
  }
  return teamMap;
}

function collectEventIds(fixtures: FplFixtureRaw[]): number[] {
  return Array.from(new Set(fixtures.map((f) => f.event)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

/**
 * Prefer the earliest FPL event that still has an unfinished fixture.
 * Skip events with zero rows in the feed (blanks / not published yet).
 * Fall back to bootstrap `is_next`, then `is_current`, then the latest event that has fixtures.
 */
function pickTargetEventId(fixtures: FplFixtureRaw[], eventsMeta: BootstrapLite["events"]): number {
  const ids = collectEventIds(fixtures);
  if (ids.length === 0) throw new Error("No fixtures in FPL feed");

  for (const eid of ids) {
    const evFx = fixtures.filter((f) => f.event === eid);
    if (evFx.length === 0) continue;
    // Ignore postponed/rescheduled rows we hide from the UI (e.g. MCI–CRY in GW36);
    // otherwise FPL keeps them `finished: false` and we never advance to the next GW.
    const relevant = evFx.filter((f) => !EXCLUDED_FIXTURE_IDS.has(f.id));
    if (relevant.length === 0) continue;
    if (relevant.some((f) => !f.finished)) return eid;
  }

  const nextMeta = eventsMeta.find((e) => e.is_next);
  if (nextMeta && ids.includes(nextMeta.id)) return nextMeta.id;

  const currentMeta = eventsMeta.find((e) => e.is_current);
  if (currentMeta && ids.includes(currentMeta.id)) return currentMeta.id;

  for (let i = ids.length - 1; i >= 0; i--) {
    const eid = ids[i];
    if (fixtures.some((f) => f.event === eid)) return eid;
  }

  return ids[ids.length - 1]!;
}

/**
 * FPL "live" pick stays on the earliest GW that still has unfinished *displayed* fixtures.
 * On-chain registration can open the next GW while that slate is still playing — pass
 * `registrationGw` from `findActiveGameweekFromChain` so deadline/fixtures match the squad tour.
 * If the chain lags behind FPL, `registrationGw <= fplPick` and we keep the FPL pick.
 */
function mergeRegistrationEventPreference(
  fplPick: number,
  registrationGw: number | null,
  eventsMeta: BootstrapLite["events"],
): number {
  if (
    registrationGw == null ||
    !Number.isFinite(registrationGw) ||
    registrationGw < 1 ||
    registrationGw <= fplPick
  ) {
    return fplPick;
  }
  const exists = eventsMeta.some((e) => e.id === registrationGw);
  return exists ? registrationGw : fplPick;
}

function teamSafe(map: TeamMap, id: number) {
  return (
    map[id] ?? {
      name: `Team ${id}`,
      shortName: `#${id}`,
      badge: `${BADGE_BASE}3.png`,
    }
  );
}

function formatFixturesForEvent(
  allRaw: FplFixtureRaw[],
  eventId: number,
  teamMap: TeamMap,
): Array<{
  id: number;
  kickoffTime: string | null;
  teamH: { id: number; name: string; shortName: string; badge: string };
  teamA: { id: number; name: string; shortName: string; badge: string };
  finished: boolean | undefined;
  started: boolean | undefined;
  scoreH: number | null;
  scoreA: number | null;
}> {
  return allRaw
    .filter((f) => f.event === eventId && !EXCLUDED_FIXTURE_IDS.has(f.id))
    .sort((a, b) => {
      const ta = a.kickoff_time ? new Date(a.kickoff_time).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.kickoff_time ? new Date(b.kickoff_time).getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    })
    .map((f) => {
      const th = teamSafe(teamMap, f.team_h);
      const ta = teamSafe(teamMap, f.team_a);
      return {
        id: f.id,
        kickoffTime: f.kickoff_time ?? null,
        teamH: { id: f.team_h, ...th },
        teamA: { id: f.team_a, ...ta },
        finished: f.finished,
        started: f.started,
        scoreH: f.team_h_score ?? null,
        scoreA: f.team_a_score ?? null,
      };
    });
}

function resolveEventMeta(eventsMeta: BootstrapLite["events"], eventId: number): EventMeta | undefined {
  return eventsMeta.find((e) => e.id === eventId);
}

/** If the primary event has no rows (e.g. kickoffs not published yet were filtered out), try fallbacks. */
function resolveFormattedFixtures(
  allRaw: FplFixtureRaw[],
  teamMap: TeamMap,
  eventsMeta: BootstrapLite["events"],
  primaryId: number,
): { eventId: number; meta: EventMeta; fixtures: ReturnType<typeof formatFixturesForEvent> } | null {
  const candidateIds: number[] = [
    primaryId,
    eventsMeta.find((e) => e.is_next)?.id,
    eventsMeta.find((e) => e.is_current)?.id,
    ...[...collectEventIds(allRaw)].reverse(),
  ].filter((id): id is number => typeof id === "number" && Number.isFinite(id));

  const seen = new Set<number>();
  for (const eid of candidateIds) {
    if (seen.has(eid)) continue;
    seen.add(eid);
    const meta = resolveEventMeta(eventsMeta, eid);
    if (!meta) continue;
    const fixtures = formatFixturesForEvent(allRaw, eid, teamMap);
    if (fixtures.length > 0) {
      return { eventId: eid, meta, fixtures };
    }
  }
  return null;
}

async function fetchFplFixtureRows(url: string): Promise<FplFixtureRaw[] | null> {
  try {
    const fixturesRes = await fetch(url, FETCH_INIT);
    if (!fixturesRes.ok) return null;
    const parsed = (await fixturesRes.json()) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as FplFixtureRaw[];
  } catch (e) {
    console.warn("fixtures: fetch failed", url, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Prefer next GW, then current — matches shipped bootstrap for `/fixtures/?event=` fallback. */
function bootstrapPriorityEventIds(): number[] {
  const raw = [
    bootstrapLite.events.find((e) => e.is_next)?.id,
    bootstrapLite.events.find((e) => e.is_current)?.id,
  ].filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  const seen = new Set<number>();
  return raw.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

/**
 * Full `/fixtures/` sometimes fails from serverless (timeouts / transient blocks). Retry once, then
 * smaller `?event=id` responses (same endpoint pattern as `/api/fpl-live`).
 */
async function loadLiveFixtureRows(): Promise<FplFixtureRaw[] | null> {
  let rows = await fetchFplFixtureRows(FPL_FIXTURES_ALL);
  if (rows) return rows;
  await new Promise((r) => setTimeout(r, 400));
  rows = await fetchFplFixtureRows(FPL_FIXTURES_ALL);
  if (rows) return rows;
  for (const eid of bootstrapPriorityEventIds()) {
    rows = await fetchFplFixtureRows(`${FPL_FIXTURES_ALL}?event=${eid}`);
    if (rows) return rows;
  }
  return null;
}

function noStoreJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    },
  });
}

/** Last resort when the live FPL fixtures feed is unreachable — deadline/name from shipped bootstrap; fixtures empty. */
function bootstrapFallbackSchedule(): NextResponse {
  const ev =
    bootstrapLite.events.find((e) => e.is_next) ??
    bootstrapLite.events.find((e) => e.is_current) ??
    bootstrapLite.events[bootstrapLite.events.length - 1];
  if (!ev) {
    return NextResponse.json({ error: "Season metadata missing" }, { status: 500 });
  }
  const rawDeadline = ev.deadline_time as string | null | undefined;
  const ms = typeof rawDeadline === "string" && rawDeadline.length > 0 ? Date.parse(rawDeadline) : NaN;
  return noStoreJson({
    gameweek: {
      id: ev.id,
      name: ev.name,
      deadlineTime: rawDeadline ?? null,
      deadlineEpochMs: Number.isFinite(ms) ? ms : null,
      isCurrent: Boolean(ev.is_current),
      isNext: Boolean(ev.is_next),
    },
    fixtures: [],
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const regRaw = searchParams.get("registrationGw");
  const parsedReg = regRaw != null ? parseInt(regRaw, 10) : NaN;
  const registrationGw = Number.isFinite(parsedReg) && parsedReg >= 1 ? parsedReg : null;

  const allRaw = await loadLiveFixtureRows();

  if (!allRaw) {
    return bootstrapFallbackSchedule();
  }

  try {
    const teamMap = buildTeamMap(bootstrapLite.teams);
    const fplPick = pickTargetEventId(allRaw, bootstrapLite.events);
    const hintedId = mergeRegistrationEventPreference(fplPick, registrationGw, bootstrapLite.events);

    const resolved = resolveFormattedFixtures(allRaw, teamMap, bootstrapLite.events, hintedId);

    let targetMeta: EventMeta;
    let formattedFixtures: ReturnType<typeof formatFixturesForEvent>;

    if (resolved) {
      targetMeta = resolved.meta;
      formattedFixtures = resolved.fixtures;
    } else {
      const meta = resolveEventMeta(bootstrapLite.events, hintedId);
      if (!meta) {
        console.error("fixtures: unknown event id", hintedId, "- refresh src/data/fpl-bootstrap-lite.json");
        return bootstrapFallbackSchedule();
      }
      targetMeta = meta;
      formattedFixtures = [];
    }

    if (formattedFixtures.length === 0) {
      const rescue = await fetchFplFixtureRows(`${FPL_FIXTURES_ALL}?event=${targetMeta.id}`);
      if (rescue?.length) {
        const retry = formatFixturesForEvent(rescue, targetMeta.id, teamMap);
        if (retry.length > 0) formattedFixtures = retry;
      }
    }

    /** Registration closes at first GW kickoff (FPL official deadline is ~90 min earlier). */
    const firstKick = formattedFixtures.find((f) => typeof f.kickoffTime === "string" && f.kickoffTime.length > 0)
      ?.kickoffTime;
    let deadlineTime: string | null = null;
    let deadlineEpochMs: number | null = null;
    if (typeof firstKick === "string" && firstKick.length > 0) {
      const ms = Date.parse(firstKick);
      if (Number.isFinite(ms)) {
        deadlineTime = firstKick;
        deadlineEpochMs = ms;
      }
    }
    if (deadlineTime == null) {
      const rawFpl = targetMeta.deadline_time as string | null | undefined;
      const ms = typeof rawFpl === "string" && rawFpl.length > 0 ? Date.parse(rawFpl) : NaN;
      deadlineTime = rawFpl ?? null;
      deadlineEpochMs = Number.isFinite(ms) ? ms : null;
    }

    const payload = {
      gameweek: {
        id: targetMeta.id,
        name: targetMeta.name,
        deadlineTime,
        deadlineEpochMs,
        isCurrent: Boolean(targetMeta.is_current),
        isNext: Boolean(targetMeta.is_next),
      },
      fixtures: formattedFixtures,
    };

    return noStoreJson(payload);
  } catch (e) {
    console.error("Fixtures API processing error:", e instanceof Error ? e.message : e);
    return bootstrapFallbackSchedule();
  }
}
