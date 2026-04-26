/**
 * Fetch current EPL player data from the official FPL bootstrap-static API
 * and write to src/data/players.json in the format expected by the app.
 *
 * Run with: node scripts/fetch-fpl-players.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const PHOTO_BASE = "https://resources.premierleague.com/premierleague/photos/players/250x250/p";

const POSITION_MAP = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

async function main() {
  console.log("Fetching FPL data...");
  const res = await fetch(FPL_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Build team id → name map
  const teamMap = {};
  for (const t of data.teams) {
    teamMap[t.id] = t.name;
  }

  // Filter and transform players
  // Only include players that are selectable (can_select) and not on loan (status !== 'u')
  const players = data.elements
    .filter((el) => el.can_select && el.status !== "u")
    .map((el) => ({
      id: el.id,
      fplId: el.id,
      name: el.known_name || `${el.first_name} ${el.second_name}`,
      webName: el.web_name,
      team: teamMap[el.team] || "Unknown",
      teamId: el.team,
      position: POSITION_MAP[el.element_type] || "MID",
      positionId: el.element_type - 1,
      photo: `${PHOTO_BASE}${el.code}.jpg`,
      status: el.status, // 'a' = available, 'd' = doubtful, 'i' = injured
      chanceOfPlaying: el.chance_of_playing_next_round,
      news: el.news || "",
      totalPoints: el.total_points,
      form: parseFloat(el.form),
      selectedByPercent: parseFloat(el.selected_by_percent),
    }));

  console.log(`Got ${players.length} selectable players across ${data.teams.length} teams`);

  const outPath = resolve(__dirname, "../src/data/players.json");
  writeFileSync(outPath, JSON.stringify(players, null, 2), "utf-8");
  console.log(`Written to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
