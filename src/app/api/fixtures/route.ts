import { NextResponse } from "next/server";

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";
const BADGE_BASE = "https://resources.premierleague.com/premierleague/badges/70/t";

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const res = await fetch(FPL_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`FPL API ${res.status}`);
    const data = await res.json();

    // Prefer next event, fall back to current
    const targetEvent =
      data.events.find((e: any) => e.is_next) ||
      data.events.find((e: any) => e.is_current);

    if (!targetEvent) {
      return NextResponse.json({ error: "No upcoming gameweek found" }, { status: 404 });
    }

    // Build team map: id → { name, shortName, badge }
    const teamMap: Record<number, { name: string; shortName: string; badge: string }> = {};
    for (const t of data.teams) {
      teamMap[t.id] = {
        name: t.name,
        shortName: t.short_name,
        badge: `${BADGE_BASE}${t.id}.png`,
      };
    }

    // Fetch fixtures for target event
    const fixturesRes = await fetch(`${FPL_FIXTURES_URL}?event=${targetEvent.id}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!fixturesRes.ok) throw new Error(`Fixtures API ${fixturesRes.status}`);
    const fixtures = await fixturesRes.json();

    const formattedFixtures = fixtures
      .sort((a: any, b: any) =>
        new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
      )
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

    return NextResponse.json({
      gameweek: {
        id: targetEvent.id,
        name: targetEvent.name,
        deadlineTime: targetEvent.deadline_time,
        isCurrent: targetEvent.is_current,
        isNext: targetEvent.is_next,
      },
      fixtures: formattedFixtures,
    });
  } catch (e) {
    console.error("Fixtures API error:", e);
    return NextResponse.json({ error: "Failed to fetch fixtures" }, { status: 500 });
  }
}
