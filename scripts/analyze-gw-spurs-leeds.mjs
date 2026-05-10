#!/usr/bin/env node
/**
 * GW analysis: leaderboard preview (chain stats), Spurs/Leeds in starting XI.
 * Usage: node scripts/analyze-gw-spurs-leeds.mjs [gwId]
 * Defaults to chain current_gameweek from get_config if gw omitted.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const raw = fs.readFileSync(p, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const env = { ...loadDotEnvLocal(), ...process.env };
const RPC = (env.NEXT_PUBLIC_MOVEMENT_RPC_URL || env.NEXT_PUBLIC_APTOS_API || "").trim();
const MODULE = (env.NEXT_PUBLIC_MODULE_ADDRESS || "").trim();
const MODNAME = (env.NEXT_PUBLIC_MODULE_NAME || "fantasy_epl").trim();

const MINUTES_POINTS = { partial: 1, full: 2, minMinutesPartial: 1, minMinutesFull: 60 };
const GOAL_POINTS = { GK: 10, DEF: 6, MID: 5, FWD: 5 };
const HAT_TRICK_BONUS = 3;
const ASSIST_POINTS = 3;
const CLEAN_SHEET_POINTS = { GK_DEF: 4, MID: 1 };
const GK_SAVE_BATCH = 3;
const GK_SAVE_POINTS_PER_BATCH = 1;
const PENALTY_SAVE_POINTS = 5;
const GOALS_CONCEDED_DIVISOR = 2;
const FPL_BONUS_MAX = 3;
const DEDUCTIONS = { yellowCard: 1, redCardMultiplier: 3, ownGoal: 2, penaltyMissed: 2 };
const RATING_BONUS_TIERS = [
  { minTenths: 90, points: 3 },
  { minTenths: 80, points: 2 },
  { minTenths: 75, points: 1 },
];
const RATING_SUB_THRESHOLD_TENTHS = 60;
const RATING_SUB_POINTS = 1;

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function bool(v) {
  return Boolean(v);
}

function ratingScaledTenths(stats) {
  if (!stats) return 0;
  const raw = num(stats.rating);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 20) return Math.round(raw * 10);
  return Math.floor(raw);
}

function ratingTierAdjustment(stats) {
  if (!stats) return { add: 0, sub: 0 };
  const mins = num(stats.minutes_played);
  const rawRating = num(stats.rating);
  const hasMatchRating = Number.isFinite(rawRating) && rawRating !== 0;
  const r = ratingScaledTenths(stats);
  let add = 0;
  if (hasMatchRating) {
    for (const tier of RATING_BONUS_TIERS) {
      if (r >= tier.minTenths) {
        add = tier.points;
        break;
      }
    }
  }
  const sub = hasMatchRating && mins > 0 && r < RATING_SUB_THRESHOLD_TENTHS ? RATING_SUB_POINTS : 0;
  return { add, sub };
}

function calculateFantasyPoints(positionId, stats) {
  if (!stats) return 0;
  const mins = num(stats.minutes_played);
  const goals = num(stats.goals);
  const assists = num(stats.assists);
  const saves = num(stats.saves);
  const pensSaved = num(stats.penalties_saved);
  const pensMissed = num(stats.penalties_missed);
  const ownG = num(stats.own_goals);
  const yc = num(stats.yellow_cards);
  const rc = num(stats.red_cards);
  const fplCs = num(stats.fpl_clean_sheets) > 0;
  const chainCs = bool(stats.clean_sheet);
  const hasCs = chainCs || fplCs;
  const gc = num(stats.goals_conceded);
  const bonus = num(stats.bonus);

  let pts = 0;
  if (mins >= MINUTES_POINTS.minMinutesFull) pts += MINUTES_POINTS.full;
  else if (mins >= MINUTES_POINTS.minMinutesPartial) pts += MINUTES_POINTS.partial;

  if (goals > 0) {
    const perGoal = positionId === 0 ? GOAL_POINTS.GK : positionId === 1 ? GOAL_POINTS.DEF : positionId === 2 ? GOAL_POINTS.MID : GOAL_POINTS.FWD;
    pts += goals * perGoal;
  }
  if (goals >= 3) pts += HAT_TRICK_BONUS;
  pts += assists * ASSIST_POINTS;

  if (mins >= MINUTES_POINTS.minMinutesFull && hasCs) {
    if (positionId <= 1) pts += CLEAN_SHEET_POINTS.GK_DEF;
    else if (positionId === 2) pts += CLEAN_SHEET_POINTS.MID;
  }
  if (positionId === 0) pts += Math.floor(saves / GK_SAVE_BATCH) * GK_SAVE_POINTS_PER_BATCH;
  pts += pensSaved * PENALTY_SAVE_POINTS;

  if (positionId <= 1 && gc > 0) {
    const gcPen = Math.floor(gc / GOALS_CONCEDED_DIVISOR);
    pts = pts >= gcPen ? pts - gcPen : 0;
  }
  pts += Math.max(0, Math.min(FPL_BONUS_MAX, Math.floor(bonus)));

  let ded = 0;
  ded += pensMissed * DEDUCTIONS.penaltyMissed;
  ded += ownG * DEDUCTIONS.ownGoal;
  ded += yc * DEDUCTIONS.yellowCard;
  ded += rc * DEDUCTIONS.redCardMultiplier;
  const base = pts >= ded ? pts - ded : 0;
  const { add, sub } = ratingTierAdjustment(stats);
  return Math.max(0, base + add - sub);
}

async function view(functionId, args = []) {
  const url = `${RPC.replace(/\/$/, "")}/view`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: functionId,
      type_arguments: [],
      arguments: args,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const FPL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://fantasy.premierleague.com/",
};

async function main() {
  if (!/^https?:\/\//i.test(RPC) || !/^0x[a-fA-F0-9]{64}$/.test(MODULE)) {
    console.error("Need NEXT_PUBLIC_MOVEMENT_RPC_URL and NEXT_PUBLIC_MODULE_ADDRESS in .env.local");
    process.exit(1);
  }
  const addr = MODULE.startsWith("0x") ? MODULE.slice(2) : MODULE;
  const fn = (name) => `0x${addr}::${MODNAME}::${name}`;

  let gwId = parseInt(process.argv[2], 10);
  if (!Number.isFinite(gwId) || gwId < 1) {
    const cfg = await view(fn("get_config"));
    gwId = Number(cfg?.[6]);
  }
  if (!Number.isFinite(gwId) || gwId < 1) {
    console.error("Could not resolve gameweek id");
    process.exit(1);
  }

  const [gwRaw, teamsRes] = await Promise.all([
    view(fn("get_gameweek"), [String(gwId)]),
    view(fn("get_gameweek_teams"), [String(gwId)]),
  ]);
  const st = Number(gwRaw?.[1]);
  const status = st === 0 ? "open" : st === 1 ? "closed" : st === 2 ? "resolved" : `raw=${gwRaw?.[1]}`;
  const addresses = (teamsRes?.[0] || []).map((a) => String(a));

  const [bootstrap, fixtures] = await Promise.all([
    fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { headers: FPL_HEADERS }).then((r) => r.json()),
    fetch(`https://fantasy.premierleague.com/api/fixtures/?event=${gwId}`, { headers: FPL_HEADERS }).then((r) => r.json()),
  ]);

  const teamById = new Map();
  for (const t of bootstrap.teams || []) teamById.set(t.id, t.short_name || t.name);

  /** @type {Map<number, number>} FPL element id -> team id */
  const elementTeam = new Map();
  for (const el of bootstrap.elements || []) {
    elementTeam.set(el.id, el.team);
  }

  const TOT_ID = 18;
  const LEE_ID = 11;
  const finishedFx = (fixtures || []).filter((f) => f.finished).length;
  const totalFx = (fixtures || []).length;

  const teams = await Promise.all(
    addresses.map(async (owner) => {
      const r = await view(fn("get_user_team"), [owner, String(gwId)]);
      const rawIds = r?.[0] || [];
      const posArr = Array.isArray(r?.[1]) ? r[1].map((x) => Number(x)) : [];
      const playerIds = rawIds.map((x) => Number(x));
      const playerPositions = playerIds.map((_, i) => {
        const v = posArr[i];
        return Number.isFinite(v) && v >= 0 && v <= 3 ? v : 2;
      });
      return { owner, playerIds, playerPositions };
    }),
  );

  const allStarters = new Set();
  for (const t of teams) {
    for (let j = 0; j < 11 && j < t.playerIds.length; j++) allStarters.add(t.playerIds[j]);
  }

  const statsById = new Map();
  await Promise.all(
    [...allStarters].map(async (pid) => {
      try {
        const result = await view(fn("get_player_stats"), [String(gwId), String(pid)]);
        statsById.set(pid, {
          position: Number(result[0]),
          minutes_played: Number(result[1]),
          goals: Number(result[2]),
          assists: Number(result[3]),
          clean_sheet: Boolean(result[4]),
          saves: Number(result[5]),
          penalties_saved: Number(result[6]),
          penalties_missed: Number(result[7]),
          own_goals: Number(result[8]),
          yellow_cards: Number(result[9]),
          red_cards: Number(result[10]),
          rating: Number(result[11]),
          tackles: Number(result[12]),
          interceptions: Number(result[13]),
          successful_dribbles: Number(result[14]),
          free_kick_goals: Number(result[15]),
          goals_conceded: Number(result[16]),
          bonus: Number(result[17]),
          fpl_clean_sheets: result[18] ? 1 : 0,
        });
      } catch {
        statsById.set(pid, null);
      }
    }),
  );

  const rows = teams.map((t) => {
    let pts = 0;
    const spurs = [];
    const leeds = [];
    for (let j = 0; j < 11 && j < t.playerIds.length; j++) {
      const pid = t.playerIds[j];
      const positionId = t.playerPositions[j];
      const s = statsById.get(pid);
      pts += calculateFantasyPoints(positionId, s);
      const tid = elementTeam.get(pid);
      const short = tid != null ? teamById.get(tid) : "?";
      if (tid === TOT_ID) spurs.push({ id: pid, slot: j + 1, short });
      if (tid === LEE_ID) leeds.push({ id: pid, slot: j + 1, short });
    }
    const hasTarget = spurs.length > 0 || leeds.length > 0;
    return { owner: t.owner, points: pts, spurs, leeds, hasTarget };
  });

  rows.sort((a, b) => b.points - a.points);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  console.log(JSON.stringify({ gwId, chainStatus: status, fplFinishedFixtures: finishedFx, fplTotalFixtures: totalFx, entries: rows.length }, null, 0));
  console.log("");
  console.log(`GW${gwId} on-chain: ${status}. FPL fixtures finished: ${finishedFx}/${totalFx}.`);
  console.log(`Preview points = sum of on-chain get_player_stats for starting XI (same as leaderboard "closed" mode).`);
  console.log("");
  console.log("— Top 20 —");
  for (const r of rows.slice(0, 20)) {
    console.log(
      `#${r.rank} ${r.points} pts  ${r.owner.slice(0, 10)}…${r.owner.slice(-6)}  spurs:${r.spurs.length} leeds:${r.leeds.length}`,
    );
  }
  console.log("");
  const withSpurs = rows.filter((r) => r.spurs.length > 0);
  const withLeeds = rows.filter((r) => r.leeds.length > 0);
  const withEither = rows.filter((r) => r.hasTarget);
  console.log(`Wallets with ≥1 Spurs starter: ${withSpurs.length} / ${rows.length}`);
  console.log(`Wallets with ≥1 Leeds starter: ${withLeeds.length} / ${rows.length}`);
  console.log(`Wallets with Spurs OR Leeds in XI: ${withEither.length} / ${rows.length}`);
  console.log("");
  console.log("— All with Spurs or Leeds (rank, points, slots) —");
  for (const r of rows.filter((x) => x.hasTarget).sort((a, b) => a.rank - b.rank)) {
    const bits = [];
    if (r.spurs.length) bits.push(`Spurs:${r.spurs.map((x) => `#${x.slot}`).join(",")}`);
    if (r.leeds.length) bits.push(`Leeds:${r.leeds.map((x) => `#${x.slot}`).join(",")}`);
    console.log(`#${r.rank}  ${r.points} pts  ${bits.join(" | ")}  ${r.owner}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
