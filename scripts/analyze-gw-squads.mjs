#!/usr/bin/env node
/**
 * Aggregate analysis for one gameweek: all registered squads from chain +
 * fantasy points from FPL live (same formulas as scoring.ts).
 *
 * Run:GW=36 node scripts/analyze-gw-squads.mjs
 * Needs .env.local with NEXT_PUBLIC_MOVEMENT_RPC_URL + NEXT_PUBLIC_MODULE_ADDRESS
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const ENV = { ...loadDotEnvLocal(), ...process.env };
const GW = Number(ENV.GW ?? process.argv[2] ?? "36");
const RPC = (ENV.NEXT_PUBLIC_MOVEMENT_RPC_URL || ENV.NEXT_PUBLIC_APTOS_API || "").trim().replace(/\/?$/, "");
const MODULE = (ENV.NEXT_PUBLIC_MODULE_ADDRESS || "").trim();
const MODNAME = (ENV.NEXT_PUBLIC_MODULE_NAME || "fantasy_epl").trim();

if (!Number.isFinite(GW) || GW < 1) {
  console.error("Usage: GW=36 node scripts/analyze-gw-squads.mjs");
  process.exit(1);
}
if (!/^https?:\/\//i.test(RPC)) {
  console.error("Missing NEXT_PUBLIC_MOVEMENT_RPC_URL in .env.local");
  process.exit(1);
}
if (!/^0x[a-fA-F0-9]{64}$/.test(MODULE)) {
  console.error("Missing/invalid NEXT_PUBLIC_MODULE_ADDRESS");
  process.exit(1);
}

/** --- scoring-rules.ts mirror --- */
const MINUTES_POINTS = { partial: 1, full: 2, minMinutesPartial: 1, minMinutesFull: 60 };
const GOAL_POINTS = [10, 6, 5, 5]; // GK,DEF,MID,FWD
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

function calcFantasyPts(positionId, raw) {
  if (!raw) return 0;
  const mins = num(raw.minutes_played ?? raw.minutesPlayed);
  const goals = num(raw.goals ?? raw.goals_scored);
  const assists = num(raw.assists);
  const saves = num(raw.saves);
  const pensSaved = num(raw.penalties_saved ?? raw.penaltiesSaved);
  const pensMissed = num(raw.penalties_missed ?? raw.penaltiesMissed);
  const ownG = num(raw.own_goals ?? raw.ownGoals);
  const yc = num(raw.yellow_cards ?? raw.yellowCards);
  const rc = num(raw.red_cards ?? raw.redCards);
  const fplCs = num(raw.fpl_clean_sheets ?? raw.fplCleanSheets) > 0;
  const chainCs = Boolean(raw.clean_sheet ?? raw.cleanSheet);
  const hasCs = chainCs || fplCs;
  const gc = num(raw.goals_conceded ?? raw.goalsConceded);
  const bonus = num(raw.bonus ?? raw.fpl_bonus);
  let pts = 0;
  if (mins >= MINUTES_POINTS.minMinutesFull) pts += MINUTES_POINTS.full;
  else if (mins >= MINUTES_POINTS.minMinutesPartial) pts += MINUTES_POINTS.partial;

  const pid = positionId;
  if (goals > 0) {
    const perGoal =
      pid === 0 ? GOAL_POINTS[0] : pid === 1 ? GOAL_POINTS[1] : pid === 2 ? GOAL_POINTS[2] : GOAL_POINTS[3];
    pts += goals * perGoal;
    if (goals >= 3) pts += HAT_TRICK_BONUS;
  }
  pts += assists * ASSIST_POINTS;
  if (mins >= MINUTES_POINTS.minMinutesFull && hasCs) {
    if (pid <= 1) pts += CLEAN_SHEET_POINTS.GK_DEF;
    else if (pid === 2) pts += CLEAN_SHEET_POINTS.MID;
  }
  if (pid === 0) pts += Math.floor(saves / GK_SAVE_BATCH) * GK_SAVE_POINTS_PER_BATCH;
  pts += pensSaved * PENALTY_SAVE_POINTS;
  if (pid <= 1 && gc > 0) {
    const gcPen = Math.floor(gc / GOALS_CONCEDED_DIVISOR);
    pts = pts >= gcPen ? pts - gcPen : 0;
  }
  pts += Math.max(0, Math.min(FPL_BONUS_MAX, Math.floor(bonus)));
  let ded =
    pensMissed * DEDUCTIONS.penaltyMissed +
    ownG * DEDUCTIONS.ownGoal +
    yc * DEDUCTIONS.yellowCard +
    rc * DEDUCTIONS.redCardMultiplier;
  pts = pts >= ded ? pts - ded : 0;

  const rawRating = num(raw.rating ?? raw.ratingScaled);
  const hasMatchRating = Number.isFinite(rawRating) && rawRating !== 0;
  let rScaled = 0;
  if (hasMatchRating) {
    rScaled = rawRating < 20 ? Math.round(rawRating * 10) : Math.floor(rawRating);
  }
  let add = 0;
  if (hasMatchRating) {
    for (const tier of RATING_BONUS_TIERS) {
      if (rScaled >= tier.minTenths) {
        add = tier.points;
        break;
      }
    }
  }
  const sub = hasMatchRating && mins > 0 && rScaled < RATING_SUB_THRESHOLD_TENTHS ? RATING_SUB_POINTS : 0;
  return Math.max(0, pts + add - sub);
}

/** --- Movement view --- */
async function view(fnName, args = []) {
  const addr = MODULE.startsWith("0x") ? MODULE.slice(2) : MODULE;
  const url = `${RPC}/view`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: `0x${addr}::${MODNAME}::${fnName}`,
      type_arguments: [],
      arguments: args,
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${fnName}: ${res.status} ${txt.slice(0, 220)}`);
  return JSON.parse(txt);
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

function parseUserTeam(raw) {
  const rawIds = raw[0] ?? [];
  const posRaw = raw[1] ?? [];
  const n = rawIds.length;
  const playerIds = new Array(n);
  const playerPositions = new Array(n);
  const posArr = Array.isArray(posRaw) ? posRaw.map((x) => Number(x)) : [];
  for (let i = 0; i < n; i++) {
    const id = viewNum(rawIds[i]);
    playerIds[i] = Number.isFinite(id) ? id : 0;
    const v = posArr[i];
    playerPositions[i] = Number.isFinite(v) && v >= 0 && v <= 3 ? v : 2;
  }
  return { playerIds, playerPositions };
}

async function mapBatch(items, concurrency, fn) {
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const res = await Promise.all(slice.map(fn));
    res.forEach((r, j) => {
      out[i + j] = r;
    });
  }
  return out;
}

const FPL = "https://fantasy.premierleague.com/api";
const FPL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  AcceptLanguage: "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

async function main() {
  console.log(`GW${GW} | RPC ${RPC}\n`);

  const [bootstrapRes, liveRes, fixturesRes, gwSummary] = await Promise.all([
    fetch(`${FPL}/bootstrap-static/`, { headers: FPL_HEADERS }),
    fetch(`${FPL}/event/${GW}/live/`, { headers: FPL_HEADERS }),
    fetch(`${FPL}/fixtures/?event=${GW}`, { headers: FPL_HEADERS }),
    fetch(`${FPL}/event/${GW}/`, { headers: FPL_HEADERS }),
  ]);
  const bootstrap = await bootstrapRes.json();
  const live = await liveRes.json();
  const fixtures = await fixturesRes.json();
  const ev = gwSummary.ok ? await gwSummary.json() : {};

  const elMeta = new Map();
  for (const e of bootstrap.elements) {
    elMeta.set(e.id, { web_name: e.web_name, team: e.team });
  }

  const liveStats = new Map();
  for (const row of live.elements ?? []) {
    liveStats.set(row.id, row.stats ?? {});
  }

  const teamGwFixtures = new Map(); // teamId -> [{ finished }]
  for (const f of fixtures) {
    for (const tid of [f.team_h, f.team_a]) {
      const arr = teamGwFixtures.get(tid) ?? [];
      arr.push({ finished: Boolean(f.finished), started: Boolean(f.started) });
      teamGwFixtures.set(tid, arr);
    }
  }

  function classifySlot(teamId, minutes) {
    const rel = teamGwFixtures.get(teamId) ?? [];
    const allFinished = rel.length > 0 && rel.every((x) => x.finished);
    const anyStillOpen = rel.some((x) => !x.finished);

    if (minutes > 0) return "played";
    /** No fixture row (shouldn't happen) — treat as dead */
    if (rel.length === 0) return "dead_no_fixture";
    if (allFinished) return "dead_bench";
    if (anyStillOpen) return "pending";
    return "pending";
  }

  /** FPL stats → scorer input — use squad slot position id from chain */
  function statsFor(pid, stats) {
    const cs = stats.clean_sheets ?? 0;
    return {
      minutes_played: stats.minutes ?? 0,
      goals: stats.goals_scored ?? 0,
      assists: stats.assists ?? 0,
      saves: stats.saves ?? 0,
      penalties_saved: stats.penalties_saved ?? 0,
      penalties_missed: stats.penalties_missed ?? 0,
      own_goals: stats.own_goals ?? 0,
      yellow_cards: stats.yellow_cards ?? 0,
      red_cards: stats.red_cards ?? 0,
      /** Oracle route uses neutral rating when unknown */
      rating: 60,
      bonus: stats.bonus ?? 0,
      goals_conceded: stats.goals_conceded ?? 0,
      clean_sheet: cs > 0 && pid <= 1,
      fpl_clean_sheets: cs > 0 ? 1 : 0,
    };
  }

  const addrsRaw = await view("get_gameweek_teams", [String(GW)]);
  const addresses = addrsRaw[0] ?? [];
  console.log(`On-chain entrants: ${addresses.length}\n`);

  const gwView = await view("get_gameweek", [String(GW)]).catch(() => null);
  let chainStatus = "";
  if (gwView && gwView.length >= 2) {
    const st = Number(gwView[1]);
    chainStatus = st === 0 ? "open" : st === 1 ? "closed" : st === 2 ? "resolved" : `unknown(${gwView[1]})`;
  }
  console.log(`On-chain GW status (hint): ${chainStatus || "(n/a)"}`);
  if (typeof ev?.name === "string") console.log(`FPL event label: ${ev.name}`);
  const doneFx = fixtures.filter((f) => f.finished).length;
  const totalFx = fixtures.length;
  console.log(`Fixtures GW${GW}: ${doneFx}/${totalFx} marked finished\n`);

  /** Pull squads — parallel fetch */
  const teams = await mapBatch(addresses, 24, async (owner) => {
    try {
      const r = await view("get_user_team", [owner, String(GW)]);
      return { owner, ...parseUserTeam(r) };
    } catch {
      return { owner, playerIds: [], playerPositions: [] };
    }
  });

  /** Per-team rollup */
  const rows = [];

  /** League aggregates across starting XIs only */
  let sumPlayedXi = 0;
  let sumPendingXi = 0;
  let sumDeadXi = 0;
  let teamsAllXiPlayed = 0;
  /** Counts of XI slots with pts===0 AND minutes>0 */
  let xiSlotsPlayedZeroAcrossLeague = 0;

  for (const t of teams) {
    const xi = t.playerIds.slice(0, 11);
    const xp = t.playerPositions.slice(0, 11);
    let pts = 0;
    let played = 0;
    let pending = 0;
    let deadBench = 0;
    let playedZero = 0;
    /** dead + no fx (rare) */
    let deadOther = 0;

    for (let j = 0; j < xi.length; j++) {
      const id = xi[j];
      const positionId = xp[j] ?? 2;
      const meta = elMeta.get(id);
      const teamId = meta?.team ?? 0;
      const st = liveStats.get(id) ?? {};
      const mins = st.minutes ?? 0;
      const bucket = classifySlot(teamId, mins);
      const sc = statsFor(positionId, st);
      const p = calcFantasyPts(positionId, sc);
      pts += p;

      if (bucket === "played") {
        played++;
        if (p === 0 && mins > 0) {
          playedZero++;
          xiSlotsPlayedZeroAcrossLeague++;
        }
      } else if (bucket === "pending") pending++;
      else if (bucket === "dead_bench") deadBench++;
      else deadOther++;
    }

    const activePending = pending;
    if (pending === 0 && played + deadBench + deadOther === 11) teamsAllXiPlayed++;

    rows.push({
      owner: t.owner,
      pts,
      played,
      pending: activePending,
      deadBench,
      deadOther,
      playedZero,
      /** simple upside proxy: more pending slots = more ceiling left */
      upsideProxy: pts + pending * 6,
    });
  }

  rows.sort((a, b) => b.pts - a.pts);

  const n = rows.length;

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((s, x) => s + x, 0) / arr.length;
  }

  const avgPts = avg(rows.map((r) => r.pts));
  const avgPending = avg(rows.map((r) => r.pending));
  const avgDeadBench = avg(rows.map((r) => r.deadBench));
  const avgPlayedZero = avg(rows.map((r) => r.playedZero));

  console.log("——— Ліга (стартові 11, правила як на сайті / Move, FPL live) ———");
  console.log(`Команд (складів): ${n}`);
  console.log(`Середні бали XI (поточні): ${avgPts.toFixed(2)}`);
  console.log(`Середньо гравців XI «ще можуть набрати» (0 хв, матч команди не завершено): ${avgPending.toFixed(2)}`);
  console.log(
    `Середньо гравців XI «вже все» з 0 хв (матч відіграний / не вийшов): ${avgDeadBench.toFixed(2)}`,
  );
  console.log(`Середньо гравців XI, що вже грали (>0 хв) і мають 0 очок за нашими правилами: ${avgPlayedZero.toFixed(2)}`);
  console.log(`Усього таких «0 після виходу» слотів у лізі: ${xiSlotsPlayedZeroAcrossLeague}`);
  console.log(`Команд, у яких усі 11 стартерів уже не pending (тур для них закритий): ${teamsAllXiPlayed}\n`);

  /** Who has "best chances" — blend */
  const sortedChance = [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.pending !== a.pending) return b.pending - a.pending;
    return a.deadBench - b.deadBench;
  });

  console.log("——— Топ-15 за поточними балами XI (при рівності — більше «pending») ———");
  for (let i = 0; i < Math.min(15, sortedChance.length); i++) {
    const r = sortedChance[i];
    const short = `${r.owner.slice(0, 6)}…${r.owner.slice(-4)}`;
    console.log(
      `${String(i + 1).padStart(2)}. ${short}  pts=${r.pts}  played=${r.played}  pending=${r.pending}  finished0min=${r.deadBench}  playedBut0pts=${r.playedZero}`,
    );
  }

  /** If GW not fully done, surface "chasers" with most pending among top half */
  if (doneFx < totalFx) {
    const half = rows.filter((r) => r.pts >= avgPts);
    const byPending = [...half].sort((a, b) => b.pending - a.pending || b.pts - a.pts);
    console.log("\n——— Серед вище-середніх за балами: хто має найбільше ще «живих» слотів ———");
    for (let i = 0; i < Math.min(8, byPending.length); i++) {
      const r = byPending[i];
      const short = `${r.owner.slice(0, 6)}…${r.owner.slice(-4)}`;
      console.log(
        `${String(i + 1).padStart(2)}. ${short}  pts=${r.pts}  pending=${r.pending}  (можуть ще додати)`,
      );
    }
  }

  console.log(
    "\nПримітка: титули / гільдії / множники з контракту тут не враховані; лавка не рахується (як у реєстрації 11+3).",
  );
  console.log("Рейтинг матчу в FPL live часто відсутній — для всіх стоїть нейтральний 6.0 (як у /api/fpl-live).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
