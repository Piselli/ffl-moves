import { NextResponse } from "next/server";

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";
const BADGE_BASE = "https://resources.premierleague.com/premierleague/badges/70/t";

/** Never cache this handler’s JSON at the edge — stale `deadline_time` breaks the hero countdown. */
export const dynamic = "force-dynamic";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

type TeamMap = Record<number, { name: string; shortName: string; badge: string }>;

async function fetchAndFormatEvent(eventId: number, teamMap: TeamMap) {
  const fixturesRes = await fetch(`${FPL_FIXTURES_URL}?event=${eventId}`, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
  });
  if (!fixturesRes.ok) throw new Error(`FPL fixtures API ${fixturesRes.status} event=${eventId}`);
  const raw = await fixturesRes.json();
  return raw
    .filter((f: any) => f.kickoff_time)
    .sort((a: any, b: any) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())
    .map((f: any) => ({
      id: f.id,
      kickoffTime: f.kickoff_time,
      teamH: { id: f.team_h, ...teamMap[f.team_h] },
      teamA: { id: f.team_a, ...teamMap[f.team_a] },
      finished: f.finished,
      started: f.started,
      scoreH: f.team_h_score ?? null,
      scoreA: f.team_a_score ?? null,
    }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forcedRaw = searchParams.get("eventId");
    const forcedId =
      forcedRaw != null && forcedRaw !== "" ? Number.parseInt(forcedRaw, 10) : Number.NaN;

    const res = await fetch(FPL_URL, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`FPL bootstrap API ${res.status}`);
    const data = await res.json();

    let targetEvent: (typeof data.events)[0] | undefined;

    if (Number.isFinite(forcedId) && forcedId >= 1 && forcedId <= 38) {
      targetEvent = data.events.find((e: any) => Number(e.id) === forcedId);
    }

    if (!targetEvent) {
      targetEvent =
        data.events.find((e: any) => e.is_next) ||
        data.events.find((e: any) => e.is_current) ||
        data.events.filter((e: any) => e.finished).slice(-1)[0];
    }

    if (!targetEvent) {
      return NextResponse.json({ error: "No upcoming gameweek found" }, { status: 404 });
    }

    const teamMap: TeamMap = {};
    for (const t of data.teams) {
      teamMap[t.id] = {
        name: t.name,
        shortName: t.short_name,
        badge: `${BADGE_BASE}${t.code}.png`,
      };
    }

    const formattedFixtures = await fetchAndFormatEvent(targetEvent.id, teamMap);

    const rawDeadline = targetEvent.deadline_time as string | null | undefined;
    const deadlineEpochMs =
      typeof rawDeadline === "string" && rawDeadline.length > 0 ? Date.parse(rawDeadline) : NaN;

    const payload = {
      gameweek: {
        id: targetEvent.id,
        name: targetEvent.name,
        deadlineTime: rawDeadline ?? null,
        /** Same instant as `deadlineTime`, parsed once on the server (ms since epoch, UTC). */
        deadlineEpochMs: Number.isFinite(deadlineEpochMs) ? deadlineEpochMs : null,
        isCurrent: targetEvent.is_current,
        isNext: targetEvent.is_next,
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
    return NextResponse.json(
      { error: "Failed to fetch fixtures", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
