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

/**
 * GET /api/fpl-live?gw=N
 *
 * Fetches FPL Live gameweek data and returns it in the same
 * OraclePlayerStats format that the admin page expects.
 * No API key required — uses the official free FPL endpoints.
 *
 * Player IDs are generated with the same filter & ordering as
 * /api/players (sequential idx+1 over selectable elements),
 * so they stay consistent with what users see when picking squads.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gw = searchParams.get("gw");

  if (!gw || isNaN(Number(gw))) {
    return NextResponse.json(
      { gameweekId: 0, players: [], fixtures: [], errors: ["Valid ?gw= parameter required"] },
      { status: 400 },
    );
  }

  const gwNum = parseInt(gw);
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

    const [bootstrap, live, fixtures] = await Promise.all([
      bootstrapRes.json(),
      liveRes.json(),
      fixturesRes.json(),
    ]);

    // Same filter + order as /api/players → keeps player IDs consistent
    const selectableElements = bootstrap.elements.filter(
      (el: any) => el.can_select && el.status !== "u",
    );

    const fplIdToInternal = new Map<number, { id: number; positionId: number }>();
    selectableElements.forEach((el: any, idx: number) => {
      fplIdToInternal.set(el.id, {
        id: idx + 1,
        positionId: el.element_type - 1, // FPL 1-4 → our 0-3
      });
    });

    // Team name lookup
    const teamName: Record<number, string> = {};
    for (const t of bootstrap.teams) teamName[t.id] = t.name;

    // Completed fixtures info
    const completedFixtures = fixtures.filter((f: any) => f.finished);
    const fixtureNames = completedFixtures.map(
      (f: any) => `${teamName[f.team_h] || "?"} vs ${teamName[f.team_a] || "?"}`,
    );

    if (completedFixtures.length === 0) {
      errors.push(`No completed fixtures found for Gameweek ${gwNum}`);
    } else if (completedFixtures.length > 10) {
      errors.push(
        `FPL returned ${completedFixtures.length} finished fixtures for GW${gwNum} (e.g. blanks + rearranged games). ` +
          `That is normal in the official API — all still count in FPL for this gameweek. Submit Stats uses player live data, not fixture count.`,
      );
    }

    // Map FPL live stats → OraclePlayerStats format
    const players: any[] = [];

    for (const element of live.elements) {
      const s = element.stats;
      if (!s || (s.minutes ?? 0) === 0) continue;

      const mapping = fplIdToInternal.get(element.id);
      if (!mapping) continue;

      players.push({
        playerId: mapping.id,
        position: mapping.positionId,
        minutesPlayed: s.minutes ?? 0,
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
        // BPS can be negative in FPL live; Move oracle uses u64 — clamp.
        rating: Math.max(0, Number(s.bps ?? 0) || 0),
        // UI scoring (merge with chain stats) — not all are on-chain yet
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
