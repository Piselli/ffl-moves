/**
 * Builds a single WebP sprite + manifest from player headshots.
 * Run: node scripts/build-fpl-photo-atlas.mjs
 * Requires: sharp (devDependency)
 *
 * Sources (in order per player):
 *   1. Official PL CDN (resources.premierleague.com) — FPL `element.code`
 *   2. API-Sports media CDN — matched via public/data/players.json and/or
 *      live /players/squads when API_SPORTS_KEY is set
 *
 * Also writes src/data/fpl-apiid-map.json for runtime photo fallbacks.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_IMG = path.join(ROOT, "public", "sprites", "fpl-players.webp");
const OUT_JSON = path.join(ROOT, "src", "data", "fpl-photo-atlas.json");
const OUT_API_MAP = path.join(ROOT, "src", "data", "fpl-apiid-map.json");
const CATALOG_PATH = path.join(ROOT, "public", "data", "players.json");

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const PHOTO_HOST = "https://resources.premierleague.com/premierleague/photos/players";
const API_MEDIA = "https://media.api-sports.io/football/players";
const API_BASE = "https://v3.football.api-sports.io";

/** FPL teamId (bootstrap) → API-Sports team id for 2026/27. */
const FPL_TEAM_TO_API = {
  1: 42, // Arsenal
  2: 66, // Aston Villa
  3: 35, // Bournemouth
  4: 55, // Brentford
  5: 51, // Brighton
  6: 49, // Chelsea
  7: 1346, // Coventry
  8: 52, // Crystal Palace
  9: 45, // Everton
  10: 36, // Fulham
  11: 64, // Hull
  12: 57, // Ipswich
  13: 63, // Leeds
  14: 40, // Liverpool
  15: 50, // Man City
  16: 33, // Man Utd
  17: 34, // Newcastle
  18: 65, // Nott'm Forest
  19: 47, // Spurs
  20: 746, // Sunderland
};

const COLS = 26;
/** 80px: sharp enough for 54px list + ~76px pitch chips, still one small file. */
const CELL = 80;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
  Referer: "https://fantasy.premierleague.com/",
};

function norm(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function photoUrls(code) {
  const file = `p${code}`;
  return [
    `${PHOTO_HOST}/110x140/${file}.png`,
    `${PHOTO_HOST}/110x140/${file}.jpg`,
    `${PHOTO_HOST}/250x250/${file}.png`,
    `${PHOTO_HOST}/250x250/${file}.jpg`,
  ];
}

async function fetchBootstrap() {
  const res = await fetch(FPL_URL, {
    headers: {
      "User-Agent": FETCH_HEADERS["User-Agent"],
      Accept: "application/json, text/plain, */*",
      Referer: "https://fantasy.premierleague.com/",
      Origin: "https://fantasy.premierleague.com",
    },
  });
  if (!res.ok) throw new Error(`bootstrap ${res.status}`);
  return res.json();
}

function loadCatalogIndex() {
  /** @type {Map<string, {apiId:number, team:string, name:string}[]>} */
  const index = new Map();
  if (!fs.existsSync(CATALOG_PATH)) return index;
  const rows = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  for (const row of rows) {
    if (!row?.apiId || row.apiId <= 0 || !row.name) continue;
    const entry = {
      apiId: Number(row.apiId),
      team: String(row.team || ""),
      name: String(row.name),
    };
    const n = norm(row.name);
    const last = norm(String(row.name).split(/[\s.]+/).filter(Boolean).pop());
    for (const key of [n, last]) {
      if (!key || key.length < 2) continue;
      const list = index.get(key) || [];
      if (!list.some((x) => x.apiId === entry.apiId)) list.push(entry);
      index.set(key, list);
    }
  }
  return index;
}

/**
 * Live squads from API-Sports (optional). Needs API_SPORTS_KEY.
 * @returns {Promise<Map<number, {apiId:number, name:string, fplTeamId:number}[]>>}
 */
async function fetchLiveSquadIndex() {
  const key =
    process.env.API_SPORTS_KEY || process.env.NEXT_PUBLIC_API_SPORTS_KEY || "";
  /** @type {Map<number, {apiId:number, name:string, fplTeamId:number}[]>} */
  const byTeam = new Map();
  if (!key) {
    console.log("No API_SPORTS_KEY — using public/data/players.json only for gaps");
    return byTeam;
  }

  console.log("Fetching live API-Sports squads for 20 FPL clubs…");
  for (const [fplTeamId, apiTeamId] of Object.entries(FPL_TEAM_TO_API)) {
    const tid = Number(fplTeamId);
    try {
      const res = await fetch(`${API_BASE}/players/squads?team=${apiTeamId}`, {
        headers: { "x-apisports-key": key },
      });
      const data = await res.json();
      const players = data.response?.[0]?.players || [];
      const list = players
        .filter((p) => p?.id && p?.name)
        .map((p) => ({
          apiId: Number(p.id),
          name: String(p.name),
          fplTeamId: tid,
        }));
      byTeam.set(tid, list);
      process.stdout.write(`\r  squads team ${tid}/20 (${list.length} players)   `);
      // Free API-Sports plans rate-limit hard; keep squads paced.
      await new Promise((r) => setTimeout(r, 550));
    } catch (err) {
      console.warn(`\n  squad fetch failed team ${tid}:`, err?.message || err);
    }
  }
  console.log("");
  return byTeam;
}

function pickApiId(el, teamName, catalogIndex, liveByTeam) {
  const web = norm(el.web_name);
  const second = norm(el.second_name);
  const first = norm(el.first_name);
  const known = norm(el.known_name);
  const keys = [web, second, known, first + second].filter(
    (k) => k && k.length >= 2,
  );

  const live = liveByTeam.get(el.team) || [];
  if (live.length) {
    const liveHits = live.filter((p) => {
      const n = norm(p.name);
      const last = norm(p.name.split(/[\s.]+/).filter(Boolean).pop());
      return keys.some((k) => k === n || k === last || n.includes(k) || k.includes(last));
    });
    if (liveHits.length === 1) return liveHits[0].apiId;
    if (liveHits.length > 1) {
      const exact = liveHits.find((p) => keys.includes(norm(p.name)));
      return (exact || liveHits[0]).apiId;
    }
  }

  /** @type {{apiId:number, team:string, name:string}[]} */
  let hits = [];
  for (const k of keys) {
    const list = catalogIndex.get(k);
    if (list?.length) hits.push(...list);
  }
  // de-dupe
  const seen = new Set();
  hits = hits.filter((h) => {
    if (seen.has(h.apiId)) return false;
    seen.add(h.apiId);
    return true;
  });
  if (!hits.length) return null;

  const teamN = norm(teamName);
  const teamHits = hits.filter((h) => {
    const ht = norm(h.team);
    return (
      ht &&
      teamN &&
      (ht.includes(teamN.slice(0, 5)) || teamN.includes(ht.slice(0, 5)))
    );
  });
  const pool = teamHits.length ? teamHits : hits.length === 1 ? hits : [];
  return pool[0]?.apiId ?? null;
}

async function fetchImageBuffer(urls) {
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { headers: FETCH_HEADERS });
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
          continue;
        }
        const type = res.headers.get("content-type") || "";
        if (type && !type.startsWith("image/")) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 800) continue; // AccessDenied XML / tiny stubs
        return sharp(buf)
          .resize(CELL, CELL, { fit: "cover", position: "top" })
          .png()
          .toBuffer();
      } catch {
        await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
      }
    }
  }
  return null;
}

async function fetchOneTile(code, apiId) {
  // Prefer official PL kit headshots (FPL look). API-Sports is white-bg
  // cutouts, often wrong/old kit — only fill gaps when PL 403s / missing.
  const plBuf = await fetchImageBuffer(photoUrls(code));
  if (plBuf) return { buf: plBuf, source: "pl" };
  if (apiId) {
    const apiBuf = await fetchImageBuffer([`${API_MEDIA}/${apiId}.png`]);
    if (apiBuf) return { buf: apiBuf, source: "api" };
  }
  return null;
}

async function main() {
  console.log("Fetching FPL bootstrap…");
  const data = await fetchBootstrap();
  const teamMap = Object.fromEntries(data.teams.map((t) => [t.id, t.name]));
  const elements = data.elements.filter(
    (el) => el.can_select && el.status !== "u",
  );
  console.log(`Selectable players: ${elements.length}`);

  const catalogIndex = loadCatalogIndex();
  const liveByTeam = await fetchLiveSquadIndex();

  /** @type {Record<string, number>} */
  const apiIdMap = {};
  let mapped = 0;
  for (const el of elements) {
    const apiId = pickApiId(el, teamMap[el.team] || "", catalogIndex, liveByTeam);
    if (apiId) {
      apiIdMap[String(el.code)] = apiId;
      mapped++;
    }
  }
  console.log(`apiId mapped: ${mapped}/${elements.length}`);

  const downloaded = [];
  const concurrency = 8;
  let fromApi = 0;
  let fromPl = 0;
  for (let i = 0; i < elements.length; i += concurrency) {
    const chunk = elements.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (el) => {
        const apiId = apiIdMap[String(el.code)] ?? null;
        const got = await fetchOneTile(el.code, apiId);
        return {
          code: el.code,
          buf: got?.buf ?? null,
          source: got?.source ?? null,
        };
      }),
    );
    for (const r of results) {
      if (r.source === "api") fromApi++;
      if (r.source === "pl") fromPl++;
    }
    downloaded.push(...results);
    process.stdout.write(
      `\rDownloaded ${Math.min(i + concurrency, elements.length)}/${elements.length} (api=${fromApi} pl=${fromPl})`,
    );
  }

  const frames = {};
  const composites = [];
  let packed = 0;
  const missing = [];
  for (const r of downloaded) {
    if (!r.buf) {
      missing.push(r.code);
      continue;
    }
    const col = packed % COLS;
    const row = Math.floor(packed / COLS);
    frames[String(r.code)] = { x: col * CELL, y: row * CELL };
    composites.push({ input: r.buf, left: col * CELL, top: row * CELL });
    packed++;
  }
  console.log(`\nComposited tiles: ${packed} (missing ${missing.length})`);

  const totalRows = Math.max(1, Math.ceil(packed / COLS));
  const width = COLS * CELL;
  const height = totalRows * CELL;

  fs.mkdirSync(path.dirname(OUT_IMG), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 10, g: 13, b: 20, alpha: 1 },
    },
  })
    .composite(composites)
    .webp({ quality: 72, effort: 6 })
    .toFile(OUT_IMG);

  const builtAt = new Date().toISOString().slice(0, 10);
  const manifest = {
    cell: CELL,
    cols: COLS,
    width,
    height,
    count: packed,
    builtAt,
    sources: { api: fromApi, pl: fromPl, missing: missing.length },
    frames,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest));
  fs.writeFileSync(
    OUT_API_MAP,
    JSON.stringify({ builtAt, count: mapped, byCode: apiIdMap }),
  );

  const stat = fs.statSync(OUT_IMG);
  console.log("Wrote", OUT_IMG, `(${Math.round(stat.size / 1024)} KB)`);
  console.log("Wrote", OUT_JSON);
  console.log("Wrote", OUT_API_MAP);
  if (missing.length) {
    console.log(
      "Still missing codes (no PL + no api match):",
      missing.slice(0, 30).join(", "),
      missing.length > 30 ? `… +${missing.length - 30}` : "",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
