import { NextResponse } from "next/server";

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/";
const BADGE_BASE = "https://resources.premierleague.com/premierleague/badges/70/t";

export const revalidate = 300; // 5 minutes

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

export async function GET() {
  try {
    const res = await fetch(FPL_URL, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`FPL bootstrap API ${res.status}`);
    const data = await res.json();

    const nextEvent = data.events.find((e: any) => e.is_next) ?? null;
    const currentEvent = data.events.find((e: any) => e.is_current) ?? null;
    const lastFinished = data.events.filter((e: any) => e.finished).slice(-1)[0] ?? null;

    // List + deadline: next GW if flagged, else current / last finished (unchanged for /fixtures)
    const targetEvent = nextEvent || currentEvent || lastFinished;

    if (!targetEvent) {
      return NextResponse.json({ error: "No upcoming gameweek found" }, { status: 404 });
    }

    /**
     * “Старт наступного туру” for hero: FPL sometimes clears `is_next` briefly; then `targetEvent`
     * is current GW and the earliest future kickoff is a mid-week straggler, not Friday’s GW.
     * Prefer `is_next`; else the numerically following GW if current exists and id is below 38.
     */
    let heroRoundEvent: (typeof data.events)[0] | null = nextEvent;
    if (!heroRoundEvent && currentEvent && typeof currentEvent.id === "number") {
      const n = currentEvent.id + 1;
      if (n >= 1 && n <= 38) {
        heroRoundEvent = data.events.find((e: any) => e.id === n) ?? null;
      }
    }
    if (!heroRoundEvent) {
      heroRoundEvent = targetEvent;
    }

    // Build team map: id → { name, shortName, badge }
    // Use t.code (permanent club code) not t.id (seasonal 1-20) for correct badge URLs
    const teamMap: TeamMap = {};
    for (const t of data.teams) {
      teamMap[t.id] = {
        name: t.name,
        shortName: t.short_name,
        badge: `${BADGE_BASE}${t.code}.png`,
      };
    }

    const formattedFixtures = await fetchAndFormatEvent(targetEvent.id, teamMap);

    let heroNextRound: { gwId: number; fixtures: Awaited<ReturnType<typeof fetchAndFormatEvent>> } | null = null;
    if (heroRoundEvent.id !== targetEvent.id) {
      try {
        const heroFx = await fetchAndFormatEvent(heroRoundEvent.id, teamMap);
        heroNextRound = { gwId: heroRoundEvent.id, fixtures: heroFx };
      } catch {
        heroNextRound = null;
      }
    } else {
      heroNextRound = { gwId: heroRoundEvent.id, fixtures: formattedFixtures };
    }

    return NextResponse.json({
      gameweek: {
        id: targetEvent.id,
        name: targetEvent.name,
        deadlineTime: targetEvent.deadline_time,
        isCurrent: targetEvent.is_current,
        isNext: targetEvent.is_next,
      },
      fixtures: formattedFixtures,
      /** Earliest kickoffs for the *upcoming* PL round (hero countdown), not mid-week leftovers of current GW */
      heroNextRound,
    });
  } catch (e) {
    console.error("Fixtures API error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Failed to fetch fixtures", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
