import { NextResponse } from "next/server";

const FPL_BASE = "https://fantasy.premierleague.com/api";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

interface FplBootstrapSelectable {
  id: number;
  element_type: number;
  can_select?: boolean;
  status?: string;
}

interface FplFixtureRow {
  finished?: boolean;
  team_h: number;
  team_a: number;
}

interface FplLiveGwStats {
  minutes?: number;
  goals_scored?: number;
  assists?: number;
  clean_sheets?: number;
  saves?: number;
  penalties_saved?: number;
  penalties_missed?: number;
  own_goals?: number;
  yellow_cards?: number;
  red_cards?: number;
  bonus?: number;
  goals_conceded?: number;
}

interface FplLiveElementRow {
  id: number;
  stats?: FplLiveGwStats;
}

/** Response row aligned with admin / chain stat submit shape. */
interface FplLiveMappedPlayer {
  playerId: number;
  position: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  bonus: number;
  goalsConceded: number;
  fplCleanSheets: number;
  tackles: number;
  interceptions: number;
  successfulDribbles: number;
  freeKickGoals: number;
}

/**
 * GET /api/fpl-live?gw=N
 *
 * Fetches FPL Live gameweek data and returns it in the same
 * OraclePlayerStats format that the admin page expects.
 * No API key required — uses the official free FPL endpoints.
 *
 * Player IDs match /api/players: official FPL `element.id` (not list index).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gw = searchParams.get("gw");
  const gwNum = gw != null ? parseInt(gw, 10) : NaN;

  if (!gw || !Number.isFinite(gwNum) || gwNum < 1) {
    return NextResponse.json(
      { gameweekId: 0, players: [], fixtures: [], errors: ["Valid ?gw= parameter required (integer ≥ 1)"] },
      { status: 400 },
    );
  }
  const errors: string[] = [];

  try {
    const [bootstrapRes, liveRes, fixturesRes] = await Promise.all([
      fetch(`${FPL_BASE}/bootstrap-static/`, { headers: BROWSER_HEADERS, cache: "no-store" }),
      fetch(`${FPL_BASE}/event/${gwNum}/live/`, { headers: BROWSER_HEADERS, cache: "no-store" }),
      fetch(`${FPL_BASE}/fixtures/?event=${gwNum}`, { headers: BROWSER_HEADERS, cache: "no-store" }),
    ]);

    if (!bootstrapRes.ok) throw new Error(`FPL bootstrap API returned ${bootstrapRes.status}`);
    if (!liveRes.ok) throw new Error(`FPL live API returned ${liveRes.status} — gameweek ${gwNum} may not exist yet`);
    if (!fixturesRes.ok) throw new Error(`FPL fixtures API returned ${fixturesRes.status}`);

    const [bootstrap, live, fixtures] = (await Promise.all([
      bootstrapRes.json(),
      liveRes.json(),
      fixturesRes.json(),
    ])) as [
      { elements: FplBootstrapSelectable[]; teams: { id: number; name: string }[] },
      { elements: FplLiveElementRow[] },
      FplFixtureRow[],
    ];

    const selectableElements = bootstrap.elements.filter(
      (el) => Boolean(el.can_select) && el.status !== "u",
    );

    const fplIdToInternal = new Map<number, { id: number; positionId: number }>();
    selectableElements.forEach((el) => {
      fplIdToInternal.set(el.id, {
        id: el.id,
        positionId: el.element_type - 1, // FPL 1-4 → our 0-3
      });
    });

    // Team name lookup
    const teamName: Record<number, string> = {};
    for (const t of bootstrap.teams) teamName[t.id] = t.name;

    // Completed fixtures info
    const completedFixtures = fixtures.filter((f) => f.finished);
    const fixtureNames = completedFixtures.map(
      (f) => `${teamName[f.team_h] || "?"} vs ${teamName[f.team_a] || "?"}`,
    );

    if (completedFixtures.length === 0) {
      errors.push(`No completed fixtures found for Gameweek ${gwNum}`);
    } else if (completedFixtures.length > 10) {
      errors.push(
        `FPL returned ${completedFixtures.length} finished fixtures for GW${gwNum} (e.g. blanks + rearranged games). ` +
          `That is normal in the official API — all still count in FPL for this gameweek. Submit Stats uses player live data, not fixture count.`,
      );
    }

    // Map FPL live stats → OraclePlayerStats format.
    // Include ALL selectable players — even 0-minute ones — so the contract's substitution
    // logic fires correctly (minutes_played=0 in the stats map → contract looks for a bench
    // replacement; player missing from the map entirely → no substitution attempted).
    const players: FplLiveMappedPlayer[] = [];

    for (const element of live.elements) {
      const s = element.stats;
      if (!s) continue;

      const mapping = fplIdToInternal.get(element.id);
      if (!mapping) continue;

      const mins = s.minutes ?? 0;
      players.push({
        playerId: mapping.id,
        position: mapping.positionId,
        minutesPlayed: mins,
        goals: s.goals_scored ?? 0,
        assists: s.assists ?? 0,
        // Oracle / chain: only GK+DEF store clean sheet for submit_player_stats
        cleanSheet: (s.clean_sheets ?? 0) > 0 && mapping.positionId <= 1,
        saves: s.saves ?? 0,
        penaltiesSaved: s.penalties_saved ?? 0,
        penaltiesMissed: s.penalties_missed ?? 0,
        ownGoals: s.own_goals ?? 0,
        yellowCards: s.yellow_cards ?? 0,
        redCards: s.red_cards ?? 0,
        // Match rating in tenths (75 = 7.5). FPL live doesn't expose it — use neutral 60
        // for played players (no tier bonus, no low-rating −1). Use 0 for non-played players
        // so the contract correctly treats them as "no rating" (same as Move rating=0 guard).
        rating: mins > 0 ? 60 : 0,
        bonus: Math.max(0, Math.min(3, Number(s.bonus ?? 0) || 0)),
        goalsConceded: Math.max(0, Number(s.goals_conceded ?? 0) || 0),
        fplCleanSheets: (s.clean_sheets ?? 0) > 0 ? 1 : 0,
        tackles: 0,
        interceptions: 0,
        successfulDribbles: 0,
        freeKickGoals: 0,
      });
    }

    return NextResponse.json({ gameweekId: gwNum, players, fixtures: fixtureNames, errors });
  } catch (err) {
    console.error("FPL Live route error:", err);
    return NextResponse.json(
      {
        gameweekId: gwNum,
        players: [],
        fixtures: [],
        errors: [err instanceof Error ? err.message : String(err)],
      },
      { status: 500 },
    );
  }
}
