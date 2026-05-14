/**
 * Aggregates per-gameweek FPL Live stats over all finished GWs and ranks players
 * by avg MOVEMATCH points per appearance (minutes >= 1), using `calculateFantasyPointsWithRating`
 * with rating=60 when minutes > 0 (same neutral rating as /api/fpl-live — FPL live has no match rating).
 *
 * Also builds a 4-3-3 XI that maximises sum of PPG subject to MAX_PER_CLUB (same as MOVEMATCH rules).
 *
 * Run: npx tsx scripts/season-symbolic-xi.ts
 */

import { calculateFantasyPointsWithRating } from "../src/lib/scoring";
import { MAX_PER_CLUB } from "../src/lib/constants";

const FPL_BASE = "https://fantasy.premierleague.com/api";

const HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type BootstrapEl = {
  id: number;
  element_type: number;
  team?: number;
  web_name?: string;
  first_name?: string;
  second_name?: string;
  can_select?: boolean;
  status?: string;
};

type LiveStats = {
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
};

function statsFromLive(s: LiveStats, positionId: number): Record<string, unknown> {
  const mins = Number(s.minutes ?? 0) || 0;
  return {
    minutes_played: mins,
    goals: s.goals_scored ?? 0,
    assists: s.assists ?? 0,
    clean_sheet: ((s.clean_sheets ?? 0) > 0 && positionId <= 1) || false,
    saves: s.saves ?? 0,
    penalties_saved: s.penalties_saved ?? 0,
    penalties_missed: s.penalties_missed ?? 0,
    own_goals: s.own_goals ?? 0,
    yellow_cards: s.yellow_cards ?? 0,
    red_cards: s.red_cards ?? 0,
    bonus: Math.max(0, Math.min(3, Number(s.bonus ?? 0) || 0)),
    goals_conceded: Math.max(0, Number(s.goals_conceded ?? 0) || 0),
    fpl_clean_sheets: (s.clean_sheets ?? 0) > 0 ? 1 : 0,
    rating: mins > 0 ? 60 : 0,
  };
}

const POS = ["GK", "DEF", "MID", "FWD"] as const;

/** Increment team counts; returns false if any team would exceed `max`. */
function applyClubCounts(
  base: Map<number, number>,
  players: { teamId: number }[],
  max: number,
): Map<number, number> | null {
  const next = new Map(base);
  for (const p of players) {
    const v = (next.get(p.teamId) ?? 0) + 1;
    if (v > max) return null;
    next.set(p.teamId, v);
  }
  return next;
}

function* combos3<T extends { teamId: number }>(pool: T[]): Generator<T[]> {
  const n = pool.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++) yield [pool[a], pool[b], pool[c]];
}

function* combos4<T extends { teamId: number }>(pool: T[]): Generator<T[]> {
  const n = pool.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++) yield [pool[a], pool[b], pool[c], pool[d]];
}

type XiRow = {
  name: string;
  fplElementId: number;
  position: (typeof POS)[number];
  teamId: number;
  teamShort: string;
  totalPoints: number;
  appearances: number;
  pointsPerGame: number;
};

/**
 * Maximise sum(PPG) over 4-3-3 with at most `maxPerClub` picks per FPL team id.
 * Search depth is bounded by fixed-size sorted pools per position (expand if solution quality suffers).
 */
function best433UnderClubCap<T extends { id: number; name: string; pos: number; pts: number; apps: number; ppg: number; teamId: number; teamShort: string }>(
  eligible: T[],
  opts: {
    poolGk: number;
    poolDef: number;
    poolMid: number;
    poolFwd: number;
    maxPerClub: number;
  },
): { xi: XiRow[]; sumPPG: number; poolsUsed: Record<string, number> } | null {
  const byPos = (p: number) =>
    eligible
      .filter((r) => r.pos === p)
      .sort((a, b) => b.ppg - a.ppg);

  const gkPool = byPos(0).slice(0, opts.poolGk);
  const defPool = byPos(1).slice(0, opts.poolDef);
  const midPool = byPos(2).slice(0, opts.poolMid);
  const fwdPool = byPos(3).slice(0, opts.poolFwd);

  if (gkPool.length < 1 || defPool.length < 4 || midPool.length < 3 || fwdPool.length < 3) return null;

  let bestSum = -1;
  let bestLineup: T[] | null = null;

  const tcGk = new Map<number, number>();

  for (const gk of gkPool) {
    tcGk.clear();
    tcGk.set(gk.teamId, 1);

    for (const defs of combos4(defPool)) {
      const tcDef = applyClubCounts(tcGk, defs, opts.maxPerClub);
      if (!tcDef) continue;

      for (const mids of combos3(midPool)) {
        const tcMid = applyClubCounts(tcDef, mids, opts.maxPerClub);
        if (!tcMid) continue;

        for (const fwds of combos3(fwdPool)) {
          const tcFinal = applyClubCounts(tcMid, fwds, opts.maxPerClub);
          if (!tcFinal) continue;

          const lineup = [...defs, ...mids, ...fwds];
          lineup.unshift(gk);
          const sum = lineup.reduce((s, p) => s + p.ppg, 0);
          if (sum > bestSum) {
            bestSum = sum;
            bestLineup = lineup;
          }
        }
      }
    }
  }

  if (!bestLineup || bestSum < 0) return null;

  const xi: XiRow[] = bestLineup.map((p) => ({
    name: p.name,
    fplElementId: p.id,
    position: POS[p.pos],
    teamId: p.teamId,
    teamShort: p.teamShort,
    totalPoints: p.pts,
    appearances: p.apps,
    pointsPerGame: Math.round(p.ppg * 100) / 100,
  }));

  return {
    xi,
    sumPPG: Math.round(bestSum * 100) / 100,
    poolsUsed: {
      GK: opts.poolGk,
      DEF: opts.poolDef,
      MID: opts.poolMid,
      FWD: opts.poolFwd,
    },
  };
}

async function main() {
  const bootRes = await fetch(`${FPL_BASE}/bootstrap-static/`, { headers: HEADERS, cache: "no-store" });
  if (!bootRes.ok) throw new Error(`bootstrap ${bootRes.status}`);
  const bootstrap = (await bootRes.json()) as {
    elements: BootstrapEl[];
    events: { id: number; finished: boolean }[];
    teams: { id: number; short_name?: string; name?: string }[];
  };

  const teamShort = new Map<number, string>();
  for (const t of bootstrap.teams ?? []) {
    teamShort.set(t.id, t.short_name || t.name || `t${t.id}`);
  }

  const selectableIds = new Set<number>();
  const positionById = new Map<number, number>();
  const nameById = new Map<number, string>();
  const teamById = new Map<number, number>();

  for (const el of bootstrap.elements) {
    if (!el.can_select || el.status === "u") continue;
    selectableIds.add(el.id);
    positionById.set(el.id, el.element_type - 1);
    nameById.set(el.id, el.web_name || `${el.first_name ?? ""} ${el.second_name ?? ""}`.trim() || `#${el.id}`);
    teamById.set(el.id, Number(el.team ?? 0));
  }

  const finishedGw = bootstrap.events.filter((e) => e.finished).map((e) => e.id);
  finishedGw.sort((a, b) => a - b);

  const agg = new Map<number, { pts: number; apps: number }>();

  for (const gw of finishedGw) {
    const liveRes = await fetch(`${FPL_BASE}/event/${gw}/live/`, { headers: HEADERS, cache: "no-store" });
    if (!liveRes.ok) {
      console.warn(`GW ${gw}: live HTTP ${liveRes.status}, skip`);
      await sleep(350);
      continue;
    }
    const live = (await liveRes.json()) as { elements?: { id: number; stats?: LiveStats }[] };
    for (const row of live.elements ?? []) {
      if (!selectableIds.has(row.id)) continue;
      const s = row.stats;
      if (!s) continue;
      const mins = Number(s.minutes ?? 0) || 0;
      if (mins < 1) continue;

      const posId = positionById.get(row.id);
      if (posId === undefined) continue;

      const pts = calculateFantasyPointsWithRating({ positionId: posId }, statsFromLive(s, posId));
      const cur = agg.get(row.id) ?? { pts: 0, apps: 0 };
      cur.pts += pts;
      cur.apps += 1;
      agg.set(row.id, cur);
    }
    process.stderr.write(`.\r`);
    await sleep(350);
  }

  type Row = {
    id: number;
    name: string;
    pos: number;
    pts: number;
    apps: number;
    ppg: number;
    teamId: number;
    teamShort: string;
  };
  const rows: Row[] = [];
  for (const [id, v] of agg) {
    if (v.apps < 1) continue;
    const tid = teamById.get(id) ?? 0;
    rows.push({
      id,
      name: nameById.get(id) ?? `#${id}`,
      pos: positionById.get(id) ?? 0,
      pts: v.pts,
      apps: v.apps,
      ppg: v.pts / v.apps,
      teamId: tid,
      teamShort: teamShort.get(tid) ?? "?",
    });
  }

  const minApps = 15;
  const eligible = rows.filter((r) => r.apps >= minApps);

  const constrained433 = best433UnderClubCap(eligible, {
    poolGk: 12,
    poolDef: 16,
    poolMid: 12,
    poolFwd: 12,
    maxPerClub: MAX_PER_CLUB,
  });

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        scoringNote:
          "Per GW: same mapping as /api/fpl-live + calculateFantasyPointsWithRating; rating fixed at 6.0 (60 tenths) when minutes>0 (FPL live has no match rating).",
        gameweeksIncluded: finishedGw,
        minAppearancesForXi: minApps,
        maxPerClub: MAX_PER_CLUB,
        clubCapOptimizationNote:
          "XI maximizes sum of points-per-appearance across 11 starters under MAX_PER_CLUB; search is exhaustive within top-N by PPG per position (poolsUsed) — widen pools in script if the global optimum might lie outside.",
        formation433Unconstrained: {
          GK: eligible.filter((r) => r.pos === 0).sort((a, b) => b.ppg - a.ppg)[0],
          DEF: eligible.filter((r) => r.pos === 1).sort((a, b) => b.ppg - a.ppg).slice(0, 4),
          MID: eligible.filter((r) => r.pos === 2).sort((a, b) => b.ppg - a.ppg).slice(0, 3),
          FWD: eligible.filter((r) => r.pos === 3).sort((a, b) => b.ppg - a.ppg).slice(0, 3),
        },
        formation433MaxSumPPGUnderClubCap: constrained433,
        top5PerPosition: Object.fromEntries(
          [0, 1, 2, 3].map((pos) => [
            POS[pos],
            eligible
              .filter((r) => r.pos === pos)
              .sort((a, b) => b.ppg - a.ppg)
              .slice(0, 5)
              .map((r) => ({
                name: r.name,
                fplElementId: r.id,
                totalPoints: r.pts,
                appearances: r.apps,
                pointsPerGame: Math.round(r.ppg * 100) / 100,
              })),
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
