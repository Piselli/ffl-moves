/**
 * Player form GW30–37: MOVEMATCH points, min 6 appearances, top 15 per position.
 * Run: npx tsx scripts/gw30-37-form.ts
 */

import { calculateFantasyPointsWithRating } from "../src/lib/scoring";

const FPL_BASE = "https://fantasy.premierleague.com/api";
const GW_MIN = 30;
const GW_MAX = 37;
const MIN_APPS = 6;
const TOP_N = 15;

const HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

const POS = ["GK", "DEF", "MID", "FWD"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function main() {
  const bootRes = await fetch(`${FPL_BASE}/bootstrap-static/`, { headers: HEADERS, cache: "no-store" });
  if (!bootRes.ok) throw new Error(`bootstrap ${bootRes.status}`);
  const bootstrap = (await bootRes.json()) as {
    elements: {
      id: number;
      element_type: number;
      team?: number;
      web_name?: string;
      first_name?: string;
      second_name?: string;
      can_select?: boolean;
      status?: string;
    }[];
    events: { id: number; finished: boolean }[];
    teams: { id: number; short_name?: string; name?: string }[];
  };

  const teamShort = new Map<number, string>();
  for (const t of bootstrap.teams ?? []) {
    teamShort.set(t.id, t.short_name || t.name || `t${t.id}`);
  }

  const positionById = new Map<number, number>();
  const nameById = new Map<number, string>();
  const teamById = new Map<number, number>();

  for (const el of bootstrap.elements) {
    positionById.set(el.id, el.element_type - 1);
    nameById.set(el.id, el.web_name || `${el.first_name ?? ""} ${el.second_name ?? ""}`.trim() || `#${el.id}`);
    teamById.set(el.id, Number(el.team ?? 0));
  }

  const gws = bootstrap.events
    .filter((e) => e.finished && e.id >= GW_MIN && e.id <= GW_MAX)
    .map((e) => e.id)
    .sort((a, b) => a - b);

  const agg = new Map<number, { pts: number; apps: number }>();

  for (const gw of gws) {
    const liveRes = await fetch(`${FPL_BASE}/event/${gw}/live/`, { headers: HEADERS, cache: "no-store" });
    if (!liveRes.ok) {
      console.warn(`GW ${gw}: live HTTP ${liveRes.status}, skip`);
      await sleep(350);
      continue;
    }
    const live = (await liveRes.json()) as { elements?: { id: number; stats?: LiveStats }[] };
    for (const row of live.elements ?? []) {
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
    process.stderr.write(`GW ${gw} done\n`);
    await sleep(350);
  }

  type Row = {
    name: string;
    team: string;
    pos: string;
    total: number;
    apps: number;
    avg: number;
  };

  const rows: Row[] = [];
  for (const [id, v] of agg) {
    if (v.apps < MIN_APPS) continue;
    const posId = positionById.get(id) ?? 0;
    const tid = teamById.get(id) ?? 0;
    rows.push({
      name: nameById.get(id) ?? `#${id}`,
      team: teamShort.get(tid) ?? "?",
      pos: POS[posId],
      total: Math.round(v.pts * 10) / 10,
      apps: v.apps,
      avg: Math.round((v.pts / v.apps) * 100) / 100,
    });
  }

  console.log(`\n=== Форма GW${GW_MIN}–${GW_MAX} (MOVEMATCH) ===`);
  console.log(`Турів у вибірці: ${gws.join(", ")} (${gws.length} GW)`);
  console.log(`Мін. матчів: ${MIN_APPS} | Рейтинг: нейтральний 6.0 (FPL live без match rating)\n`);

  for (const pos of POS) {
    const top = rows
      .filter((r) => r.pos === pos)
      .sort((a, b) => b.avg - a.avg || b.total - a.total)
      .slice(0, TOP_N);

    console.log(`--- ${pos} (топ-${TOP_N} за середнім) ---`);
    console.log("#  | Гравець".padEnd(28) + "| Клуб | Матчі | Всього | Середнє");
    top.forEach((r, i) => {
      const line =
        `${String(i + 1).padStart(2)} | ${r.name.padEnd(24)} | ${r.team.padEnd(4)} | ${String(r.apps).padStart(5)} | ${String(r.total).padStart(6)} | ${r.avg.toFixed(2)}`;
      console.log(line);
    });
    console.log("");
  }

  console.log(`Всього гравців з ≥${MIN_APPS} матчів: ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
