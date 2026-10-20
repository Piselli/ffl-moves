import { NextResponse } from "next/server";
import bootstrapLite from "@/data/fpl-bootstrap-lite.json";
import fixturesSnapshot from "@/data/fpl-fixtures-snapshot.json";
import { pokeAutoCloseWatchdog } from "@/lib/server/autoCloseWatchdog";
import { pokeAutoPublishStatsWatchdog } from "@/lib/server/autoPublishStatsWatchdog";
import {
  readFixturesCache,
  readFixturesCachePointer,
  type CachedFixtureRow,
} from "@/lib/server/fixturesCacheStore";
import { pokeFixturesRefreshWatchdog } from "@/lib/server/fixturesRefreshWatchdog";
import { pokeTelegramAlertsWatchdog } from "@/lib/server/telegramAlertsWatchdog";

const FPL_FIXTURES_ALL = "https://fantasy.premierleague.com/api/fixtures/";
const BADGE_BASE = "https://resources.premierleague.com/premierleague/badges/70/t";
/** Full season feed is large and often blocked from US serverless — don't hang on it. */
const FULL_FEED_TIMEOUT_MS = 3500;

/** London-first egress often works better with FPL than default US regions. */
export const preferredRegion = ["lhr1", "iad1"];
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
 * Also skip events bootstrap already marks `finished` — a shipped snapshot can
 * keep stale `finished: false` after the round ends when live FPL is unreachable.
 * Fall back to bootstrap `is_next`, then `is_current`, then the latest event that has fixtures.
 */
function pickTargetEventId(fixtures: FplFixtureRaw[], eventsMeta: BootstrapLite["events"]): number {
  const ids = collectEventIds(fixtures);
  if (ids.length === 0) throw new Error("No fixtures in FPL feed");

  for (const eid of ids) {
    const meta = eventsMeta.find((e) => e.id === eid);
    if (meta?.finished) continue;
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
 * True when chain still points at last season (high GW) while FPL already reset
 * to early new-season ids — do not treat that as "open the next tour".
 */
function looksLikeSeasonWrap(preferredGw: number, fplPick: number): boolean {
  return preferredGw >= 30 && fplPick <= 10 && preferredGw - fplPick >= 20;
}

/**
 * Display GW = on-chain registration (or Redis pointer from cron), not FPL's
 * "earliest unfinished". Only fall back to the FPL pick when we have no product
 * pointer, or the pointer looks like a season wrap after a new campaign starts.
 */
function resolveDisplayEventId(
  fplPick: number,
  registrationGw: number | null,
  cachePointerGw: number | null,
  eventsMeta: BootstrapLite["events"],
): { eventId: number; lockedToTour: boolean } {
  const preferred =
    registrationGw != null && Number.isFinite(registrationGw) && registrationGw >= 1
      ? registrationGw
      : cachePointerGw != null && Number.isFinite(cachePointerGw) && cachePointerGw >= 1
        ? cachePointerGw
        : null;

  if (preferred == null) {
    return { eventId: fplPick, lockedToTour: false };
  }
  if (looksLikeSeasonWrap(preferred, fplPick)) {
    return { eventId: fplPick, lockedToTour: false };
  }
  if (!eventsMeta.some((e) => e.id === preferred)) {
    return { eventId: fplPick, lockedToTour: false };
  }
  return { eventId: preferred, lockedToTour: true };
}

/** Cron/live rows win on score + finished flags; schedule stays complete. */
function mergeCachedFixtureRows(
  base: FplFixtureRaw[],
  cached: CachedFixtureRow[] | null | undefined,
): FplFixtureRaw[] {
  if (!cached?.length) return base;
  const byId = new Map<number, FplFixtureRaw>();
  for (const row of base) {
    if (row && Number.isFinite(row.id)) byId.set(row.id, row);
  }
  for (const row of cached) {
    if (!row || !Number.isFinite(row.id)) continue;
    const prev = byId.get(row.id);
    byId.set(row.id, {
      id: row.id,
      event: row.event,
      kickoff_time: row.kickoff_time ?? prev?.kickoff_time,
      team_h: row.team_h,
      team_a: row.team_a,
      finished: row.finished ?? prev?.finished,
      started: row.started ?? prev?.started,
      team_h_score: row.team_h_score ?? prev?.team_h_score ?? null,
      team_a_score: row.team_a_score ?? prev?.team_a_score ?? null,
    });
  }
  return Array.from(byId.values());
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

/**
 * When `registrationGw` is ahead of FPL’s unfinished slate, only that GW’s rows count.
 * Otherwise `resolveFormattedFixtures` falls through to `is_next` (e.g. GW36) and we show the wrong deadline/matches.
 */
function resolveFormattedFixturesForRegistrationGw(
  allRaw: FplFixtureRaw[],
  teamMap: TeamMap,
  eventsMeta: BootstrapLite["events"],
  registrationEventId: number,
): { eventId: number; meta: EventMeta; fixtures: ReturnType<typeof formatFixturesForEvent> } | null {
  const meta = resolveEventMeta(eventsMeta, registrationEventId);
  if (!meta) return null;
  const fixtures = formatFixturesForEvent(allRaw, registrationEventId, teamMap);
  return fixtures.length > 0 ? { eventId: registrationEventId, meta, fixtures } : null;
}

async function fetchFplFixtureRows(
  url: string,
  timeoutMs: number | null = null,
): Promise<FplFixtureRaw[] | null> {
  try {
    const init: RequestInit =
      timeoutMs != null && timeoutMs > 0
        ? { ...FETCH_INIT, signal: AbortSignal.timeout(timeoutMs) }
        : FETCH_INIT;
    const fixturesRes = await fetch(url, init);
    if (!fixturesRes.ok) return null;
    const parsed = (await fixturesRes.json()) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as FplFixtureRaw[];
  } catch (e) {
    console.warn("fixtures: fetch failed", url, e instanceof Error ? e.message : e);
    return null;
  }
}

function mergeFixtureRows(batches: Array<FplFixtureRaw[] | null>): FplFixtureRaw[] {
  const byId = new Map<number, FplFixtureRaw>();
  for (const batch of batches) {
    if (!batch) continue;
    for (const row of batch) {
      if (!row || !Number.isFinite(row.id)) continue;
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values());
}

/** Shipped season slate — keeps the hero populated when live FPL is unreachable. */
function snapshotFixtureRows(): FplFixtureRaw[] | null {
  const rows = (fixturesSnapshot as { fixtures?: FplFixtureRaw[] }).fixtures;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows;
}

/**
 * Small `?event=` probes first — same pattern as `/api/fpl-live`, reliably reaches FPL
 * from serverless when the full `/fixtures/` payload is blocked or times out.
 */
async function fetchPriorityEventRows(eventIds: number[]): Promise<FplFixtureRaw[] | null> {
  if (eventIds.length === 0) return null;
  const batches = await Promise.all(
    eventIds.slice(0, 4).map((eid) => fetchFplFixtureRows(`${FPL_FIXTURES_ALL}?event=${eid}`, 6000)),
  );
  const merged = mergeFixtureRows(batches);
  return merged.length > 0 ? merged : null;
}

/**
 * Event ids to probe when the full `/fixtures/` feed fails.
 * Prefer deadlines relative to now over shipped `is_next`/`is_current` flags —
 * those go stale between bootstrap refreshes and were pinning the hero on an
 * empty past GW (e.g. GW4 with 0 matches).
 */
function bootstrapPriorityEventIds(registrationGw: number | null = null): number[] {
  const now = Date.now();
  const timed = bootstrapLite.events
    .map((e) => {
      const raw = e.deadline_time as string | null | undefined;
      const ms = typeof raw === "string" && raw.length > 0 ? Date.parse(raw) : NaN;
      return { id: e.id, ms, finished: Boolean(e.finished), isNext: Boolean(e.is_next), isCurrent: Boolean(e.is_current) };
    })
    .filter((e) => Number.isFinite(e.id) && e.id > 0);

  const upcoming = timed
    .filter((e) => Number.isFinite(e.ms) && (e.ms as number) > now)
    .sort((a, b) => (a.ms as number) - (b.ms as number));
  const past = timed
    .filter((e) => Number.isFinite(e.ms) && (e.ms as number) <= now)
    .sort((a, b) => (b.ms as number) - (a.ms as number));
  const firstOpen = timed.find((e) => !e.finished);

  const raw = [
    registrationGw,
    upcoming[0]?.id,
    upcoming[1]?.id,
    past[0]?.id,
    firstOpen?.id,
    timed.find((e) => e.isNext)?.id,
    timed.find((e) => e.isCurrent)?.id,
  ].filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id >= 1);

  const seen = new Set<number>();
  return raw.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

/** Pick bootstrap event meta when the live fixtures feed is unreachable. */
function pickBootstrapFallbackEvent(registrationGw: number | null): EventMeta | undefined {
  const events = bootstrapLite.events;
  if (registrationGw != null) {
    const hinted = resolveEventMeta(events, registrationGw);
    if (hinted) return hinted;
  }
  const now = Date.now();
  const upcoming = events
    .map((e) => {
      const raw = e.deadline_time as string | null | undefined;
      const ms = typeof raw === "string" && raw.length > 0 ? Date.parse(raw) : NaN;
      return { e, ms };
    })
    .filter((x) => Number.isFinite(x.ms) && (x.ms as number) > now)
    .sort((a, b) => (a.ms as number) - (b.ms as number));
  if (upcoming[0]) return upcoming[0].e;

  return (
    events.find((e) => e.is_next) ??
    events.find((e) => !e.finished) ??
    events.find((e) => e.is_current) ??
    events[events.length - 1]
  );
}

/**
 * Prefer small `?event=` probes (work on Vercel), then a bounded full-feed attempt,
 * then the shipped season snapshot so the tablet never shows an empty open GW.
 *
 * Always overlay live rows on the snapshot: schedule stays complete when probes only
 * return a few events, and matchday scores/flags win over a stale shipped slate.
 */
async function loadLiveFixtureRows(registrationGw: number | null = null): Promise<FplFixtureRaw[] | null> {
  const priorityIds = bootstrapPriorityEventIds(registrationGw);
  const snapshot = snapshotFixtureRows();

  // Small probes first — do NOT wait on the full season feed when these succeed
  // (full `/fixtures/` is often blocked/slow from US serverless and would add seconds).
  const eventRows = await fetchPriorityEventRows(priorityIds);
  if (eventRows?.length) {
    return mergeFixtureRows([snapshot, eventRows]);
  }

  const full = await fetchFplFixtureRows(FPL_FIXTURES_ALL, FULL_FEED_TIMEOUT_MS);
  if (full) {
    return mergeFixtureRows([snapshot, full]);
  }

  if (snapshot) {
    console.warn("fixtures: using shipped snapshot", (fixturesSnapshot as { fetchedAt?: string }).fetchedAt ?? "");
    return snapshot;
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

/**
 * Last resort when even the snapshot is missing — still prefer snapshot rows for the
 * picked GW so the tablet is not stuck on "0 matches".
 */
function bootstrapFallbackSchedule(registrationGw: number | null = null): NextResponse {
  const ev = pickBootstrapFallbackEvent(registrationGw);
  if (!ev) {
    return NextResponse.json({ error: "Season metadata missing" }, { status: 500 });
  }
  const teamMap = buildTeamMap(bootstrapLite.teams);
  const snap = snapshotFixtureRows();
  const formatted = snap ? formatFixturesForEvent(snap, ev.id, teamMap) : [];
  const firstKick = formatted.find((f) => typeof f.kickoffTime === "string" && f.kickoffTime.length > 0)
    ?.kickoffTime;
  let deadlineTime: string | null = null;
  let deadlineEpochMs: number | null = null;
  if (typeof firstKick === "string" && firstKick.length > 0) {
    const kickMs = Date.parse(firstKick);
    if (Number.isFinite(kickMs)) {
      deadlineTime = firstKick;
      deadlineEpochMs = kickMs;
    }
  }
  if (deadlineTime == null) {
    const rawDeadline = ev.deadline_time as string | null | undefined;
    const ms = typeof rawDeadline === "string" && rawDeadline.length > 0 ? Date.parse(rawDeadline) : NaN;
    deadlineTime = rawDeadline ?? null;
    deadlineEpochMs = Number.isFinite(ms) ? ms : null;
  }
  return noStoreJson({
    gameweek: {
      id: ev.id,
      name: ev.name,
      deadlineTime,
      deadlineEpochMs,
      isCurrent: Boolean(ev.is_current),
      isNext: Boolean(ev.is_next),
    },
    fixtures: formatted,
  });
}

export async function GET(request: Request) {
  // Match-day traffic backup for auto-close (see autoCloseWatchdog).
  pokeAutoCloseWatchdog();
  // Same idea for publishing finished-match stats to the site (production only, throttled).
  pokeAutoPublishStatsWatchdog();
  // Keep Redis fixtures cache warm when GH schedule lags.
  pokeFixturesRefreshWatchdog();
  // Telegram reg_open / deadline / claim — GH schedule is often hours late.
  pokeTelegramAlertsWatchdog();

  const { searchParams } = new URL(request.url);
  const regRaw = searchParams.get("registrationGw");
  const parsedReg = regRaw != null ? parseInt(regRaw, 10) : NaN;
  const registrationGw = Number.isFinite(parsedReg) && parsedReg >= 1 ? parsedReg : null;

  const pointer = registrationGw == null ? await readFixturesCachePointer() : null;
  const cachePointerGw = pointer?.gameweekId ?? null;
  const preferredForLoad = registrationGw ?? cachePointerGw;

  const [liveOrSnap, cachedForPreferred] = await Promise.all([
    loadLiveFixtureRows(preferredForLoad),
    preferredForLoad != null ? readFixturesCache(preferredForLoad) : Promise.resolve(null),
  ]);

  const allRaw = mergeCachedFixtureRows(
    liveOrSnap ?? snapshotFixtureRows() ?? [],
    cachedForPreferred?.fixtures,
  );

  if (allRaw.length === 0) {
    return bootstrapFallbackSchedule(preferredForLoad);
  }

  try {
    const teamMap = buildTeamMap(bootstrapLite.teams);
    const fplPick = pickTargetEventId(allRaw, bootstrapLite.events);
    const { eventId: hintedId, lockedToTour } = resolveDisplayEventId(
      fplPick,
      registrationGw,
      cachePointerGw,
      bootstrapLite.events,
    );

    // Locked to on-chain / cron pointer: never swap in another GW's slate.
    const resolved = lockedToTour
      ? resolveFormattedFixturesForRegistrationGw(allRaw, teamMap, bootstrapLite.events, hintedId)
      : resolveFormattedFixtures(allRaw, teamMap, bootstrapLite.events, hintedId);

    let targetMeta: EventMeta;
    let formattedFixtures: ReturnType<typeof formatFixturesForEvent>;

    if (resolved) {
      targetMeta = resolved.meta;
      formattedFixtures = resolved.fixtures;
    } else {
      const meta = resolveEventMeta(bootstrapLite.events, hintedId);
      if (!meta) {
        console.error("fixtures: unknown event id", hintedId, "- refresh src/data/fpl-bootstrap-lite.json");
        return bootstrapFallbackSchedule(preferredForLoad);
      }
      targetMeta = meta;
      formattedFixtures = [];
    }

    if (formattedFixtures.length === 0) {
      const rescue = await fetchFplFixtureRows(`${FPL_FIXTURES_ALL}?event=${targetMeta.id}`, 6000);
      if (rescue?.length) {
        const mergedRescue = mergeCachedFixtureRows(rescue, cachedForPreferred?.fixtures);
        const retry = formatFixturesForEvent(mergedRescue, targetMeta.id, teamMap);
        if (retry.length > 0) formattedFixtures = retry;
      }
    }
    if (formattedFixtures.length === 0) {
      const snap = snapshotFixtureRows();
      if (snap) {
        const mergedSnap = mergeCachedFixtureRows(snap, cachedForPreferred?.fixtures);
        const retry = formatFixturesForEvent(mergedSnap, targetMeta.id, teamMap);
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
    return bootstrapFallbackSchedule(preferredForLoad);
  }
}
