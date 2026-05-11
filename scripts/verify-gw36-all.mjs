/**
 * Full GW36 verification: all registered wallets, per-player breakdown.
 * Usage: npx tsx scripts/verify-gw36-all.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadDotEnvLocal();

const GW = 36;
const POS = ["GK", "DEF", "MID", "FWD"];

const {
  getGameweekTeams, getUserTeam, getGameweekStats, getGameweek, getTeamResult,
} = await import("../src/lib/movement.ts");

const { previewTourPointsFromRegisteredTeam } = await import("../src/lib/chainAlignedScoring.ts");
const { calculateFantasyPoints, ratingTierAdjustment } = await import("../src/lib/scoring.ts");

const gw = await getGameweek(GW);
console.log("=== GW36 Verification ===");
console.log("Status:", gw?.status);

const addresses = await getGameweekTeams(GW);
console.log("Registered wallets:", addresses.length, "\n");

const allPlayerIds = new Set();
const teams = [];
for (const addr of addresses) {
  const t = await getUserTeam(addr, GW);
  teams.push({ addr, team: t });
  if (t) t.playerIds.forEach((id) => allPlayerIds.add(id));
}

const statsMap = await getGameweekStats(GW, Array.from(allPlayerIds));

const results = [];

for (const { addr, team } of teams) {
  if (!team) {
    results.push({ addr, error: "NO TEAM" });
    continue;
  }

  const players = [];
  let starterBase = 0;
  let starterRatAdd = 0;
  let starterRatSub = 0;

  for (let i = 0; i < 14; i++) {
    const id = team.playerIds[i];
    const posId = team.playerPositions[i] ?? 2;
    const pos = POS[posId] || "?";
    const s = statsMap[id];
    const isStarter = i < 11;

    if (!s) {
      players.push({ slot: i, id, pos, posId, isStarter, noStats: true, base: 0, net: 0 });
      continue;
    }

    const base = calculateFantasyPoints({ positionId: posId }, s);
    const { add, sub } = ratingTierAdjustment(s);
    const net = Math.max(0, base + add - sub);

    if (isStarter) {
      starterBase += base;
      starterRatAdd += add;
      starterRatSub += sub;
    }

    players.push({
      slot: i, id, pos, posId, isStarter,
      noStats: false,
      min: s.minutes_played,
      goals: s.goals,
      assists: s.assists,
      cs: (s.clean_sheet || s.fpl_clean_sheets > 0),
      saves: s.saves,
      bonus: s.bonus,
      yc: s.yellow_cards,
      rc: s.red_cards,
      gc: s.goals_conceded,
      rating: s.rating,
      base, ratAdd: add, ratSub: sub, net,
    });
  }

  const chainRecord = {};
  for (const id of team.playerIds) {
    const row = statsMap[id];
    if (row) chainRecord[String(id)] = row;
  }
  const preview = previewTourPointsFromRegisteredTeam(team, chainRecord);
  const tr = await getTeamResult(addr, GW);

  results.push({
    addr,
    players,
    starterBase,
    starterRatAdd,
    starterRatSub,
    preview,
    onChainFinal: tr?.finalPoints ?? null,
    onChainBase: tr?.basePoints ?? null,
    posArr: team.playerPositions.join(","),
  });
}

// Output JSON for canvas
console.log("JSON_OUTPUT_START");
console.log(JSON.stringify({ gw: GW, status: gw?.status, results }, null, 2));
console.log("JSON_OUTPUT_END");
