/**
 * Writes src/data/fpl-bootstrap-lite.json (events deadlines + team names/codes).
 * Run once per FPL season or after major schedule changes: npm run fpl:bootstrap-lite
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "src/data/fpl-bootstrap-lite.json");

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

const res = await fetch(FPL_URL, { headers, cache: "no-store" });
if (!res.ok) throw new Error(`FPL bootstrap ${res.status}`);
const data = await res.json();
const slim = {
  events: data.events.map((e) => ({
    id: e.id,
    name: e.name,
    deadline_time: e.deadline_time ?? null,
    is_current: e.is_current,
    is_next: e.is_next,
    finished: e.finished,
  })),
  teams: data.teams.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    code: t.code,
  })),
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(slim));
console.log("Wrote", out, "≈", `${Math.round(Buffer.byteLength(JSON.stringify(slim)) / 1024)} KiB`);
