/**
 * Cross-check the published oracle stats (API-Sports) against FPL's live feed for a
 * gameweek, to catch player-id mapping mistakes BEFORE committing stats / Calculate.
 *
 * FPL is only used as an independent witness for "did this player play, and roughly how
 * long" — our own scoring keeps using the API-Sports numbers.
 *
 * Usage:
 *   node scripts/audit-stats-vs-fpl.mjs <gw> [--base https://www.form8.football] [--file path/to/stats.json]
 *
 * Exit code 1 when a blocking mismatch is found (a player FPL says played is missing / 0 min
 * in our stats, or the reverse). Players are sorted by FPL ownership so the ones that can
 * actually move the leaderboard come first.
 */
import fs from "node:fs";

const gw = Number(process.argv[2]);
if (!Number.isInteger(gw) || gw < 1) {
  console.error("Usage: node scripts/audit-stats-vs-fpl.mjs <gw> [--base <url>] [--file <stats.json>]");
  process.exit(2);
}
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const base = arg("--base", "https://www.form8.football").replace(/\/$/, "");
const file = arg("--file", null);

const getJson = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "form8-audit" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
};

const statsPayload = file
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : await getJson(`${base}/data/stats/${gw}.json`);
const ours = statsPayload.players ?? {};
const catalog = await getJson(`${base}/api/players`);
const byId = new Map(catalog.map((p) => [p.id, p]));
const live = (await getJson(`https://fantasy.premierleague.com/api/event/${gw}/live/`)).elements;

const label = (id) => {
  const p = byId.get(id);
  return p ? `${p.webName} (${p.team}, ${p.position})` : `#${id}`;
};
const own = (id) => byId.get(id)?.selectedByPercent ?? 0;

const missing = []; // FPL: played — ours: no row / 0 min
const phantom = []; // ours: played — FPL: 0 min
const tier = []; // 60-minute boundary disagrees (clean sheet / appearance points)
const goals = []; // goals differ (assists legitimately differ between providers)

for (const e of live) {
  const fm = e.stats.minutes;
  const row = ours[String(e.id)];
  const om = row ? Number(row.minutes_played ?? 0) : 0;
  if (fm > 0 && om === 0) {
    missing.push({ id: e.id, fm, noRow: !row });
  } else if (fm === 0 && om > 0) {
    phantom.push({ id: e.id, om });
  } else if (fm > 0 && om > 0) {
    if (fm >= 60 !== om >= 60) tier.push({ id: e.id, fm, om });
    if (Number(row.goals ?? 0) !== e.stats.goals_scored) {
      goals.push({ id: e.id, fg: e.stats.goals_scored, og: Number(row.goals ?? 0) });
    }
  }
}

const sortByOwn = (a, b) => own(b.id) - own(a.id);
const section = (title, rows, fmt) => {
  console.log(`\n${title}: ${rows.length}`);
  for (const r of rows.sort(sortByOwn)) {
    console.log(`  ${String(own(r.id).toFixed(1)).padStart(5)}%  ${fmt(r)}`);
  }
};

console.log(`GW${gw}: ${Object.keys(ours).length} stat rows, ${live.length} FPL elements`);
section("BLOCKING — FPL says played, our stats have 0 min / no row", missing, (r) =>
  `${label(r.id)}  FPL ${r.fm}'  ours ${r.noRow ? "no row" : "0'"}`);
section("BLOCKING — our stats say played, FPL says 0 min", phantom, (r) =>
  `${label(r.id)}  ours ${r.om}'  FPL 0'`);
section("CHECK — 60-minute boundary disagrees", tier, (r) =>
  `${label(r.id)}  FPL ${r.fm}'  ours ${r.om}'`);
section("CHECK — goals differ", goals, (r) =>
  `${label(r.id)}  FPL ${r.fg}  ours ${r.og}`);

const blocking = missing.length + phantom.length;
console.log(
  blocking === 0
    ? "\nOK — no blocking mapping mismatches."
    : `\n${blocking} blocking mismatch(es). Fix the apiId mapping (src/data/fpl-apiid-map.json) and re-fetch stats before committing.`,
);
process.exit(blocking === 0 ? 0 : 1);
