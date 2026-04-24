#!/usr/bin/env node
/**
 * Same output shape as GET /api/fpl-live?gw=N — Oracle JSON for admin.
 * Run without Next: node scripts/fpl-oracle-gw.mjs 33
 *   npm run fpl:gw -- 33
 */

const FPL_BASE = "https://fantasy.premierleague.com/api";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

const args = process.argv.slice(2).filter((a) => a !== "--admin");
const adminOnly = process.argv.includes("--admin");
const gwNum = parseInt(args[0], 10);
if (!gwNum || Number.isNaN(gwNum)) {
  console.error("Usage: node scripts/fpl-oracle-gw.mjs <gameweek_number> [--admin]");
  console.error("  --admin  output only { gameweekId, players } for Admin → stats JSON");
  console.error("Example: node scripts/fpl-oracle-gw.mjs 33 --admin");
  process.exit(1);
}

async function main() {
  const errors = [];

  const [bootstrapRes, liveRes, fixturesRes] = await Promise.all([
    fetch(`${FPL_BASE}/bootstrap-static/`, { headers: BROWSER_HEADERS }),
    fetch(`${FPL_BASE}/event/${gwNum}/live/`, { headers: BROWSER_HEADERS }),
    fetch(`${FPL_BASE}/fixtures/?event=${gwNum}`, { headers: BROWSER_HEADERS }),
  ]);

  if (!bootstrapRes.ok) throw new Error(`FPL bootstrap API returned ${bootstrapRes.status}`);
  if (!liveRes.ok) throw new Error(`FPL live API returned ${liveRes.status} — gameweek ${gwNum} may not exist yet`);
  if (!fixturesRes.ok) throw new Error(`FPL fixtures API returned ${fixturesRes.status}`);

  const [bootstrap, live, fixtures] = await Promise.all([
    bootstrapRes.json(),
    liveRes.json(),
    fixturesRes.json(),
  ]);

  const selectableElements = bootstrap.elements.filter((el) => el.can_select && el.status !== "u");

  const fplIdToInternal = new Map();
  selectableElements.forEach((el, idx) => {
    fplIdToInternal.set(el.id, {
      id: idx + 1,
      positionId: el.element_type - 1,
    });
  });

  const teamName = {};
  for (const t of bootstrap.teams) teamName[t.id] = t.name;

  const completedFixtures = fixtures.filter((f) => f.finished);
  const fixtureNames = completedFixtures.map(
    (f) => `${teamName[f.team_h] || "?"} vs ${teamName[f.team_a] || "?"}`,
  );

  if (completedFixtures.length === 0) {
    errors.push(`No completed fixtures found for Gameweek ${gwNum}`);
  }

  const players = [];

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
      cleanSheet: (s.clean_sheets ?? 0) > 0 && mapping.positionId <= 1,
      saves: s.saves ?? 0,
      penaltiesSaved: s.penalties_saved ?? 0,
      penaltiesMissed: s.penalties_missed ?? 0,
      ownGoals: s.own_goals ?? 0,
      yellowCards: s.yellow_cards ?? 0,
      redCards: s.red_cards ?? 0,
      rating: Math.max(0, Number(s.bps ?? 0) || 0),
      bonus: Math.max(0, Math.min(3, Number(s.bonus ?? 0) || 0)),
      goalsConceded: Math.max(0, Number(s.goals_conceded ?? 0) || 0),
      fplCleanSheets: (s.clean_sheets ?? 0) > 0 ? 1 : 0,
      tackles: 0,
      interceptions: 0,
      successfulDribbles: 0,
      freeKickGoals: 0,
    });
  }

  const payload = { gameweekId: gwNum, players, fixtures: fixtureNames, errors };
  const out = adminOnly ? { gameweekId: gwNum, players } : payload;
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
