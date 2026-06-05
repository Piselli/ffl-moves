/**
 * Builds public/data/wc-players.json — the World Cup 2026 player catalog.
 *
 * Source: API-Sports (api-football) FIFA World Cup, league=1, season=2026.
 * Output rows are Player-compatible (id, name, team, teamId, position, positionId,
 * photo) plus apiId / apiTeamId for the oracle stats mapping.
 *
 * Internal ids start at WC_PLAYER_ID_BASE (900000) so they never collide with FPL
 * ids (~1..800) inside the shared on-chain PlayerStatsRegistry.
 *
 * Squads are not final until early June — this script is idempotent and re-runnable;
 * it rebuilds the whole catalog each time. Existing internal ids are kept stable by
 * sorting on apiId before assigning sequential internal ids.
 *
 * Usage:
 *   API_SPORTS_KEY=xxxxxxxx npm run wc:players
 *
 * Notes:
 *   - Squads come from GET /players/squads?team={id} (one req per nation). The
 *     /players?league=1&season=2026 endpoint is empty until the tournament starts;
 *     we fall back to it only when /players/squads returns no rows.
 *   - Position mapping: squads use "Goalkeeper"/"Defender"/"Midfielder"/"Attacker";
 *     /fixtures/players uses "G"/"D"/"M"/"F" for the oracle.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "public/data/wc-players.json");

const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;
const SEASON = 2026;
const PLAYER_ID_BASE = 900000;

const API_KEY = process.env.API_SPORTS_KEY || process.env.NEXT_PUBLIC_API_SPORTS_KEY || "";
if (!API_KEY) {
  console.error("Missing API_SPORTS_KEY env var (API-Sports / api-football key with World Cup coverage).");
  process.exit(1);
}

const headers = { "x-apisports-key": API_KEY };

function mapPosition(raw) {
  const p = String(raw || "").toLowerCase();
  if (p.startsWith("goal") || p === "g") return { position: "GK", positionId: 0 };
  if (p.startsWith("def") || p === "d") return { position: "DEF", positionId: 1 };
  if (p.startsWith("mid") || p === "m") return { position: "MID", positionId: 2 };
  if (p.startsWith("att") || p.startsWith("for") || p === "f") return { position: "FWD", positionId: 3 };
  return { position: "MID", positionId: 2 };
}

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (res.status === 429) throw new Error("Rate limit exceeded (HTTP 429). Free tier allows 100 requests/day.");
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(data.errors)}`);
  }
  return data;
}

/** List national teams participating in the tournament. */
async function fetchTeams() {
  const data = await getJson(`${API_BASE}/teams?league=${LEAGUE_ID}&season=${SEASON}`);
  return (data.response || []).map((row) => ({
    apiTeamId: row.team.id,
    name: row.team.name,
  }));
}

/** Official tournament squad for one national team. */
async function fetchTeamSquad(apiTeamId) {
  const data = await getJson(`${API_BASE}/players/squads?team=${apiTeamId}`);
  const row = (data.response || []).find((r) => r.team?.id === apiTeamId) || data.response?.[0];
  if (!row?.players?.length) return [];

  return row.players.map((p) => ({
    apiId: p.id,
    name: p.name,
    webName: p.name.split(" ").pop() || p.name,
    photo: p.photo,
    posRaw: p.position,
  }));
}

/** Fallback: season statistics roster (populated once matches start). */
async function fetchTeamPlayersLeague(apiTeamId) {
  const players = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await getJson(
      `${API_BASE}/players?league=${LEAGUE_ID}&season=${SEASON}&team=${apiTeamId}&page=${page}`,
    );
    totalPages = data.paging?.total || 1;
    for (const row of data.response || []) {
      const stat = (row.statistics || []).find((s) => s.team?.id === apiTeamId) || row.statistics?.[0];
      const posRaw = stat?.games?.position || row.player?.position;
      players.push({
        apiId: row.player.id,
        name: row.player.name,
        webName: row.player.lastname || row.player.name,
        photo: row.player.photo,
        posRaw,
      });
    }
    page += 1;
    await new Promise((r) => setTimeout(r, 200));
  } while (page <= totalPages);
  return players;
}

async function fetchTeamPlayers(apiTeamId) {
  const squad = await fetchTeamSquad(apiTeamId);
  if (squad.length > 0) return squad;
  return fetchTeamPlayersLeague(apiTeamId);
}

async function main() {
  console.log(`Fetching World Cup ${SEASON} teams (league=${LEAGUE_ID})…`);
  const teams = await fetchTeams();
  if (teams.length === 0) {
    console.warn("No teams returned — the tournament squads may not be published yet.");
  }
  console.log(`Found ${teams.length} teams. Fetching squads…`);

  // Stable internal team index, sorted by name for determinism.
  teams.sort((a, b) => a.name.localeCompare(b.name));
  const teamIdByApi = new Map();
  teams.forEach((t, i) => teamIdByApi.set(t.apiTeamId, i + 1));

  const collected = [];
  for (const team of teams) {
    process.stdout.write(`  · ${team.name} … `);
    try {
      const roster = await fetchTeamPlayers(team.apiTeamId);
      for (const p of roster) {
        const { position, positionId } = mapPosition(p.posRaw);
        collected.push({
          apiId: p.apiId,
          apiTeamId: team.apiTeamId,
          name: p.name,
          webName: p.webName,
          team: team.name,
          teamId: teamIdByApi.get(team.apiTeamId),
          position,
          positionId,
          photo: p.photo,
        });
      }
      console.log(`${roster.length} players`);
    } catch (e) {
      console.log(`failed (${e.message})`);
    }
  }

  // Deduplicate by apiId, assign stable internal ids sorted by apiId.
  const byApiId = new Map();
  for (const p of collected) byApiId.set(p.apiId, p);
  const unique = Array.from(byApiId.values()).sort((a, b) => a.apiId - b.apiId);

  const catalog = unique.map((p, i) => ({
    id: PLAYER_ID_BASE + i,
    apiId: p.apiId,
    apiTeamId: p.apiTeamId,
    name: p.name,
    webName: p.webName,
    team: p.team,
    teamId: p.teamId,
    position: p.position,
    positionId: p.positionId,
    photo: p.photo,
  }));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(catalog, null, 2));
  console.log(`\nWrote ${catalog.length} players from ${teams.length} teams -> ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
