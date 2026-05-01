import { NextResponse } from "next/server";
import bootstrapLite from "@/data/fpl-bootstrap-lite.json";

const FPL_FIXTURES_ALL = "https://fantasy.premierleague.com/api/fixtures/";
const BADGE_BASE = "https://resources.premierleague.com/premierleague/badges/70/t";

/** London-first egress often works better with FPL than default US regions. */
export const preferredRegion = "lhr1";
export const maxDuration = 30;

/** Never cache this handler’s JSON at the edge — stale kickoff/deadline breaks the hero countdown. */
export const dynamic = "force-dynamic";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
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

/** First gameweek that still has an unfinished fixture; otherwise last gameweek id in the feed. */
function pickTargetEventId(fixtures: FplFixtureRaw[]): number {
  const ids = Array.from(new Set(fixtures.map((f) => f.event))).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (ids.length === 0) throw new Error("No fixtures in FPL feed");
  for (const eid of ids) {
    const evFx = fixtures.filter((f) => f.event === eid);
    if (evFx.some((f) => !f.finished)) return eid;
  }
  return ids[ids.length - 1]!;
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

export async function GET() {
  try {
    const teamMap = buildTeamMap(bootstrapLite.teams);

    const fixturesRes = await fetch(FPL_FIXTURES_ALL, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });
    if (!fixturesRes.ok) throw new Error(`FPL fixtures API ${fixturesRes.status}`);
    const allRaw = (await fixturesRes.json()) as FplFixtureRaw[];

    const targetEventId = pickTargetEventId(allRaw);
    const targetMeta = bootstrapLite.events.find((e) => e.id === targetEventId);
    if (!targetMeta) {
      console.error("fixtures: unknown event id", targetEventId, "- refresh src/data/fpl-bootstrap-lite.json");
      return NextResponse.json(
        { error: "Season metadata out of date (run npm run fpl:bootstrap-lite)" },
        { status: 500 },
      );
    }

    const formattedFixtures = allRaw
      .filter((f) => f.event === targetEventId && Boolean(f.kickoff_time))
      .sort(
        (a, b) =>
          new Date(a.kickoff_time!).getTime() - new Date(b.kickoff_time!).getTime(),
      )
      .map((f) => {
        const th = teamSafe(teamMap, f.team_h);
        const ta = teamSafe(teamMap, f.team_a);
        return {
          id: f.id,
          kickoffTime: f.kickoff_time,
          teamH: { id: f.team_h, ...th },
          teamA: { id: f.team_a, ...ta },
          finished: f.finished,
          started: f.started,
          scoreH: f.team_h_score ?? null,
          scoreA: f.team_a_score ?? null,
        };
      });

    /** Registration closes at first GW kickoff (FPL official deadline is ~90 min earlier). */
    const firstKickIso = formattedFixtures[0]?.kickoffTime;
    let deadlineTime: string | null = null;
    let deadlineEpochMs: number | null = null;
    if (typeof firstKickIso === "string" && firstKickIso.length > 0) {
      const ms = Date.parse(firstKickIso);
      if (Number.isFinite(ms)) {
        deadlineTime = firstKickIso;
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

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    console.error("Fixtures API error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to fetch fixtures" }, { status: 500 });
  }
}
