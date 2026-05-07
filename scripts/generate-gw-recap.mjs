#!/usr/bin/env node
/**
 * Generate src/data/gw-recap.json for the GW Recap section on the home page.
 *
 * Finds the latest RESOLVED gameweek, then:
 *   1. Fetches FPL bootstrap for player metadata (name, team, position, photo)
 *   2. Fetches FPL live stats for that GW
 *   3. Computes the "optimal squad" — best 1 GK, 4 DEF, 3 MID, 3 FWD by points
 *   4. Finds the winner (rank 1) from chain and resolves their squad
 *   5. Writes gw-recap.json
 *
 * Run: node scripts/generate-gw-recap.mjs
 * Or:  npm run gw:recap
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_PATH = resolve(ROOT, "src/data/gw-recap.json");

// ─── .env.local loader ────────────────────────────────────────────────────────
function loadEnv() {
  const p = resolve(ROOT, ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const ENV = { ...loadEnv(), ...process.env };
const RPC = (ENV.NEXT_PUBLIC_MOVEMENT_RPC_URL || ENV.NEXT_PUBLIC_APTOS_API || "").trim();
const MODULE = (ENV.NEXT_PUBLIC_MODULE_ADDRESS || "").trim();
const MODNAME = (ENV.NEXT_PUBLIC_MODULE_NAME || "fantasy_epl").trim();

if (!RPC) { console.error("Missing NEXT_PUBLIC_MOVEMENT_RPC_URL"); process.exit(1); }
if (!MODULE) { console.error("Missing NEXT_PUBLIC_MODULE_ADDRESS"); process.exit(1); }

// ─── Chain view helper ────────────────────────────────────────────────────────
async function view(fnName, args = []) {
  const addr = MODULE.startsWith("0x") ? MODULE.slice(2) : MODULE;
  const url = `${RPC.replace(/\/$/, "")}/view`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: `0x${addr}::${MODNAME}::${fnName}`,
      type_arguments: [],
      arguments: args,
    }),
  });
  if (!res.ok) throw new Error(`view ${fnName} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function viewNum(v) {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("0x") || t.startsWith("0X")) return parseInt(t, 16);
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function viewU8Vec(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(viewNum);
  if (raw instanceof Uint8Array) return Array.from(raw);
  return [];
}

// ─── FPL API helper ───────────────────────────────────────────────────────────
const FPL = "https://fantasy.premierleague.com/api";
const FPL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

async function fplFetch(path) {
  const res = await fetch(`${FPL}${path}`, { headers: FPL_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`FPL ${path} → ${res.status}`);
  return res.json();
}

// ─── Scoring (matches scoring.ts / scoring-rules.ts exactly) ─────────────────
const GOAL_PTS = [10, 6, 5, 5]; // positionId 0-3

function calcBasePoints(posId, s) {
  const mins   = s.minutes ?? 0;
  const goals  = s.goals_scored ?? s.goals ?? 0;
  const asst   = s.assists ?? 0;
  const saves  = s.saves ?? 0;
  const psaved = s.penalties_saved ?? 0;
  const pmiss  = s.penalties_missed ?? 0;
  const og     = s.own_goals ?? 0;
  const yc     = s.yellow_cards ?? 0;
  const rc     = s.red_cards ?? 0;
  const cs     = (s.clean_sheets ?? 0) > 0 || (s.clean_sheet ?? false);
  const gc     = s.goals_conceded ?? 0;
  const bonus  = Math.max(0, Math.min(3, Math.floor(s.bonus ?? 0)));

  let pts = 0;
  if (mins >= 60) pts += 2; else if (mins >= 1) pts += 1;
  if (goals > 0) { pts += goals * GOAL_PTS[posId]; if (goals >= 3) pts += 3; }
  pts += asst * 3;
  if (mins >= 60 && cs) { if (posId <= 1) pts += 4; else if (posId === 2) pts += 1; }
  if (posId === 0) pts += Math.floor(saves / 3);
  pts += psaved * 5;
  if (posId <= 1 && gc > 0) { const pen = Math.floor(gc / 2); pts = pts >= pen ? pts - pen : 0; }
  pts += bonus;
  let ded = pmiss * 2 + og * 2 + yc * 1 + rc * 3;
  return pts >= ded ? pts - ded : 0;
}

function ratingTenths(r) {
  if (!r) return 0;
  return r < 20 ? Math.round(r * 10) : Math.floor(r);
}

function calcRatingAdj(s) {
  const raw = s.rating ?? 0;
  if (!raw) return 0;
  const mins = s.minutes_played ?? s.minutesPlayed ?? s.minutes ?? 0;
  const t = ratingTenths(raw);
  let add = 0;
  for (const [minT, pts] of [[90, 3], [80, 2], [75, 1]]) { if (t >= minT) { add = pts; break; } }
  const sub = (mins > 0 && t < 60) ? 1 : 0;
  return add - sub;
}

function calcTotalPoints(posId, stats) {
  return Math.max(0, calcBasePoints(posId, stats) + calcRatingAdj(stats));
}

// ─── Optimal squad builder ────────────────────────────────────────────────────
// 4-3-3: 1 GK, 4 DEF, 3 MID, 3 FWD (starters); bench = next 3 highest by points
const FORMATION = { 0: 1, 1: 4, 2: 3, 3: 3 };
const BENCH_SIZE = 3;

function buildOptimalSquad(allPlayers) {
  const byPos = { 0: [], 1: [], 2: [], 3: [] };
  for (const p of allPlayers) {
    const pid = Math.max(0, Math.min(3, p.positionId));
    byPos[pid].push(p);
  }
  for (const pid of [0, 1, 2, 3]) {
    byPos[pid].sort((a, b) => b.points - a.points);
  }
  const starters = [];
  const used = new Set();
  for (const pid of [0, 1, 2, 3]) {
    for (const p of byPos[pid].slice(0, FORMATION[pid])) {
      starters.push(p);
      used.add(p.id);
    }
  }
  // Bench = top N remaining by points (any position, real fantasy substitutes)
  const bench = allPlayers
    .filter((p) => !used.has(p.id))
    .sort((a, b) => b.points - a.points)
    .slice(0, BENCH_SIZE)
    .map((p) => ({ ...p, isStarter: false }));
  return { starters, bench };
}

// ─── Async helpers ────────────────────────────────────────────────────────────
async function mapBatch(items, concurrency, fn) {
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const res = await Promise.all(slice.map(fn));
    res.forEach((r, j) => { out[i + j] = r; });
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("RPC:", RPC);
  console.log("MODULE:", MODULE);
  console.log("");

  // 1. Find latest resolved GW
  console.log("Finding latest resolved GW...");
  const cfg = await view("get_config");
  const currentGw = viewNum(cfg[6]);
  console.log("  current_gameweek on chain:", currentGw);

  let resolvedGwId = 0;
  for (let id = Math.max(1, currentGw); id >= 1; id--) {
    try {
      const gw = await view("get_gameweek", [String(id)]);
      if (viewNum(gw[1]) === 2) { resolvedGwId = id; break; }
    } catch { /* skip missing */ }
  }

  if (!resolvedGwId) {
    console.error("No resolved gameweek found on chain. Nothing to generate.");
    process.exit(0);
  }
  console.log("  Found resolved GW:", resolvedGwId);
  console.log("");

  // 2. Check if already up to date (skip unless --force)
  if (existsSync(OUT_PATH) && !process.argv.includes("--force")) {
    try {
      const existing = JSON.parse(readFileSync(OUT_PATH, "utf8"));
      if (existing.gwId === resolvedGwId) {
        console.log(`gw-recap.json already up to date for GW${resolvedGwId}. Pass --force to regenerate.`);
        process.exit(0);
      }
    } catch { /* ignore parse errors */ }
  }

  // 3. Fetch FPL bootstrap for player metadata
  console.log("Fetching FPL bootstrap...");
  const bootstrap = await fplFetch("/bootstrap-static/");

  const teamName = {};
  for (const t of bootstrap.teams) teamName[t.id] = t.name;

  // Build catalog: eligible (can_select, not loaned)
  const catalog = new Map();
  for (const el of bootstrap.elements) {
    if (!el.can_select || el.status === "u") continue;
    catalog.set(el.id, {
      id: el.id,
      name: el.known_name || `${el.first_name} ${el.second_name}`,
      webName: el.web_name,
      team: teamName[el.team] || "Unknown",
      teamId: el.team,
      position: ["GK", "DEF", "MID", "FWD"][el.element_type - 1] || "MID",
      positionId: el.element_type - 1,
      fplPhotoCode: el.code,
      photo: `https://resources.premierleague.com/premierleague/photos/players/250x250/p${el.code}.png`,
    });
  }
  console.log(`  ${catalog.size} eligible players in catalog`);

  // 4. Fetch FPL live stats for resolved GW
  console.log(`Fetching FPL live stats for GW${resolvedGwId}...`);
  const live = await fplFetch(`/event/${resolvedGwId}/live/`);

  // Map: playerId → stats
  const liveStats = new Map();
  for (const el of live.elements) {
    const s = el.stats;
    if (!s || (s.minutes ?? 0) === 0) continue;
    liveStats.set(el.id, {
      minutes: s.minutes ?? 0,
      goals_scored: s.goals_scored ?? 0,
      assists: s.assists ?? 0,
      clean_sheets: s.clean_sheets ?? 0,
      saves: s.saves ?? 0,
      penalties_saved: s.penalties_saved ?? 0,
      penalties_missed: s.penalties_missed ?? 0,
      own_goals: s.own_goals ?? 0,
      yellow_cards: s.yellow_cards ?? 0,
      red_cards: s.red_cards ?? 0,
      bonus: Math.max(0, Math.min(3, s.bonus ?? 0)),
      goals_conceded: Math.max(0, s.goals_conceded ?? 0),
    });
  }
  console.log(`  ${liveStats.size} players with stats`);

  // 5. Compute points for all eligible players and build optimal squad
  console.log("Computing optimal squad...");
  const allWithPoints = [];
  for (const [id, player] of catalog) {
    const s = liveStats.get(id);
    if (!s) continue; // didn't play
    const points = calcBasePoints(player.positionId, s);
    allWithPoints.push({
      ...player,
      points,
      goals: s.goals_scored,
      assists: s.assists,
      cleanSheet: s.clean_sheets > 0,
      isStarter: true,
    });
  }

  const { starters: optimalPlayers, bench: optimalBench } = buildOptimalSquad(allWithPoints);
  const optimalTotal = optimalPlayers.reduce((s, p) => s + p.points, 0);
  console.log(`  Optimal squad total: ${optimalTotal} pts`);
  console.log(`  Starters: ${optimalPlayers.map(p => `${p.webName}(${p.points})`).join(", ")}`);
  console.log(`  Bench:    ${optimalBench.map(p => `${p.webName}(${p.points})`).join(", ")}`);
  console.log("");

  // 6. Find winner from chain
  console.log("Fetching participants for GW" + resolvedGwId + "...");
  let participants = [];
  try {
    const teamsRaw = await view("get_gameweek_teams", [String(resolvedGwId)]);
    participants = (teamsRaw[0] || []).map(String);
  } catch (e) {
    console.error("  Failed to get gameweek teams:", e.message);
    process.exit(1);
  }
  console.log(`  ${participants.length} participants`);

  if (participants.length === 0) {
    console.error("No participants found.");
    process.exit(1);
  }

  console.log("Fetching team results...");
  const results = await mapBatch(participants, 12, async (owner) => {
    try {
      const r = await view("get_team_result", [owner, String(resolvedGwId)]);
      const ratingBonus = viewNum(r[1]);
      const ratingBonusNegative = Boolean(r[2]);
      return {
        owner,
        basePoints: viewNum(r[0]),
        ratingBonus: ratingBonusNegative ? -ratingBonus : ratingBonus,
        finalPoints: viewNum(r[7]),
        rank: viewNum(r[8]),
        prizeAmount: viewNum(r[9]),
      };
    } catch {
      return null;
    }
  });

  const winner = results
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)[0];

  if (!winner || winner.rank !== 1) {
    // Fallback: find highest finalPoints if rank 1 not found
    const fallback = results.filter(Boolean).sort((a, b) => b.finalPoints - a.finalPoints)[0];
    if (!fallback) { console.error("No valid results found."); process.exit(1); }
    console.log(`  Winner (by points): ${fallback.owner} — ${fallback.finalPoints} pts`);
    Object.assign(winner ?? {}, fallback);
  } else {
    console.log(`  Rank 1: ${winner.owner} — ${winner.finalPoints} pts`);
  }

  // 7. Get winner's team
  console.log("Fetching winner's team...");
  const winnerTeamRaw = await view("get_user_team", [winner.owner, String(resolvedGwId)]);
  const rawIds = winnerTeamRaw[0] || [];
  const posArr = viewU8Vec(winnerTeamRaw[1]);
  const n = rawIds.length;

  // First 11 are starters, last 3 are bench
  const winnerPlayers = [];
  const winnerBench = [];
  for (let i = 0; i < Math.min(14, n); i++) {
    const id = viewNum(rawIds[i]);
    const posId = posArr[i] ?? 2;
    const playerInfo = catalog.get(id);
    const stats = liveStats.get(id);
    // Always use FPL catalog position (authoritative) — chain-stored position can be wrong
    const resolvedPosId = playerInfo != null ? playerInfo.positionId : posId;
    const points = stats ? calcBasePoints(resolvedPosId, stats) : 0;
    const entry = {
      id,
      name: playerInfo?.name ?? `Player #${id}`,
      webName: playerInfo?.webName ?? `#${id}`,
      team: playerInfo?.team ?? "Unknown",
      teamId: playerInfo?.teamId ?? 0,
      position: playerInfo?.position ?? (["GK", "DEF", "MID", "FWD"][resolvedPosId] ?? "MID"),
      positionId: resolvedPosId,
      fplPhotoCode: playerInfo?.fplPhotoCode ?? 0,
      photo: playerInfo?.photo ?? "",
      points,
      goals: stats?.goals_scored ?? 0,
      assists: stats?.assists ?? 0,
      cleanSheet: (stats?.clean_sheets ?? 0) > 0,
    };
    if (i < 11) winnerPlayers.push({ ...entry, isStarter: true });
    else winnerBench.push({ ...entry, isStarter: false });
  }

  const winnerBaseSum = winnerPlayers.reduce((s, p) => s + p.points, 0);
  const winnerRatingBonus = winner.finalPoints - winnerBaseSum;
  const winnerDisplayName = `${winner.owner.slice(0, 6)}...${winner.owner.slice(-4)}`;
  console.log(`  Winner's squad base sum: ${winnerBaseSum}, ratingBonus: ${winnerRatingBonus}, finalPoints: ${winner.finalPoints}`);

  // 8. Write output
  const recap = {
    gwId: resolvedGwId,
    generatedAt: new Date().toISOString(),
    optimalSquad: {
      totalPoints: optimalTotal,
      players: optimalPlayers,
      bench: optimalBench,
    },
    winnerSquad: {
      owner: winner.owner,
      displayName: winnerDisplayName,
      finalPoints: winner.finalPoints,
      basePoints: winnerBaseSum,
      ratingBonus: winnerRatingBonus,
      rank: 1,
      players: winnerPlayers,
      bench: winnerBench,
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(recap, null, 2), "utf8");
  console.log("");
  console.log(`✓ Written to src/data/gw-recap.json (GW${resolvedGwId})`);
  console.log(`  Optimal: ${optimalTotal} pts | Winner: ${winner.finalPoints} pts`);
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
