/**
 * Writes src/data/fpl-fixtures-snapshot.json (slim season fixtures).
 * Used by /api/fixtures when the live FPL feed is unreachable from serverless.
 * Run after schedule changes: npm run fpl:fixtures-snapshot
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "src/data/fpl-fixtures-snapshot.json");

const FPL_URL = "https://fantasy.premierleague.com/api/fixtures/";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

const res = await fetch(FPL_URL, { headers, cache: "no-store" });
if (!res.ok) throw new Error(`FPL fixtures ${res.status}`);
const data = await res.json();
if (!Array.isArray(data) || data.length === 0) {
  throw new Error("FPL fixtures feed empty");
}

const slim = {
  fetchedAt: new Date().toISOString(),
  fixtures: data.map((f) => ({
    id: f.id,
    event: f.event,
    kickoff_time: f.kickoff_time ?? null,
    team_h: f.team_h,
    team_a: f.team_a,
    finished: Boolean(f.finished),
    started: Boolean(f.started),
    team_h_score: f.team_h_score ?? null,
    team_a_score: f.team_a_score ?? null,
  })),
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(slim));
console.log(
  "Wrote",
  out,
  slim.fixtures.length,
  "fixtures ≈",
  `${Math.round(Buffer.byteLength(JSON.stringify(slim)) / 1024)} KiB`,
);
